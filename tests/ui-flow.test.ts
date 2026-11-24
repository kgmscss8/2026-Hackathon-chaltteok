import { describe, expect, it, vi } from 'vitest';
import contactsData from '../data/contacts.json' with { type: 'json' };
import { ApiFailure } from '../lib/errors.js';
import type { Contact, SavedSummary, Slots, TurnRequest, TurnResult } from '../lib/schema.js';
import { DEMO_SCENARIOS, demoBackend } from '../src/demo/index.js';
import type { Backend } from '../src/state/backend.js';
import { createFlow, NOT_HEARD, type FlowDeps } from '../src/state/flow.js';
import { EMPTY_SLOTS, INITIAL_STATE, reducer } from '../src/state/machine.js';
import { createStore } from '../src/state/store.js';
import type { AppState } from '../src/state/types.js';

const DEFAULTS = ['해당 없어요', '잘 모르겠어요', '직접 말할게요'];
const CONTACT: Contact = {
  tags: ['welfare'],
  name: '보건복지상담센터',
  phone: '129',
  scope: '복지 제도 상담',
  source: 'https://www.129.go.kr',
  checked_at: '2026-11-21',
};

function turn(partial: Partial<TurnResult> = {}): TurnResult {
  const slots: Slots = {
    ...EMPTY_SLOTS,
    whose_matter: { value: '어머니(본인 아님)', evidence: '엄마' },
    purpose: { value: '기초연금 신청', evidence: '엄마 기초연금 신청하려는데' },
  };
  return {
    slots,
    questions_to_ask: ['신청에 필요한 것이 무엇인지'],
    next_question: '오늘 창구에서 어떻게 되길 바라세요?',
    quick_answers: ['방법만 알고 싶어요', ...DEFAULTS],
    ask_count: 1,
    done: false,
    crisis: false,
    ...partial,
  };
}

function setup(initial: Partial<AppState> = {}, live: Partial<Backend> = {}) {
  const store = createStore({
    ...INITIAL_STATE,
    ready: true,
    consent: true,
    screen: 'home',
    ...initial,
  });
  const saved: SavedSummary[] = [];
  const liveBackend: Backend = {
    transcribe: vi.fn(async () => ({
      text: '엄마 기초연금 신청하려는데',
      language: 'ko' as const,
    })),
    runTurn: vi.fn(async () => turn()),
    fetchContacts: vi.fn(async () => [CONTACT]),
    ...live,
  };
  const deps: FlowDeps = {
    live: liveBackend,
    demo: (id) => demoBackend(id, 0),
    storage: {
      getConsent: vi.fn(async () => false),
      setConsent: vi.fn(async () => undefined),
      listSummaries: vi.fn(async () => [...saved]),
      saveSummary: vi.fn(async (s) => {
        const full = { ...s, id: `id${saved.length}`, created_at: 1, expires_at: 2 };
        saved.push(full);
        return full;
      }),
      deleteSummary: vi.fn(async (id: string) => {
        saved.splice(
          saved.findIndex((s) => s.id === id),
          1,
        );
      }),
      purgeExpired: vi.fn(async () => 0),
      requestPersistentStorage: vi.fn(async () => true),
    },
    prefs: { loadLanguage: vi.fn(() => null), saveLanguage: vi.fn() },
  };
  const flow = createFlow(store, deps);
  return {
    flow,
    deps,
    live: liveBackend,
    get s() {
      return store.getState();
    },
  };
}

const lastReq = (b: Backend) => vi.mocked(b.runTurn).mock.calls.at(-1)![0] as TurnRequest;

describe('실제 모드: 말하기 → 되묻기 → 요약 → 맞아요', () => {
  it('동의 전에는 OpenAI로 보내지 않고 동의 화면으로', async () => {
    const t = setup({ consent: false });
    await t.flow.submitText('엄마 기초연금', 'text');
    expect(t.live.runTurn).not.toHaveBeenCalled();
    expect(t.s.screen).toBe('consent');
    expect(t.flow.canTalk()).toBe(false);
  });

  it('말한 내용을 history에 넣어 /api/turn에 보내고 되묻기로', async () => {
    const t = setup();
    await t.flow.submitText('  엄마  기초연금 신청하려는데 ', 'text');
    expect(lastReq(t.live).history.at(-1)).toEqual({
      role: 'user',
      text: '엄마 기초연금 신청하려는데',
      language: 'ko',
      source: 'text',
    });
    expect(t.s.screen).toBe('asking');
    expect(t.s.nextQuestion).toBe('오늘 창구에서 어떻게 되길 바라세요?');
    expect(t.s.quickAnswers.slice(-3)).toEqual(DEFAULTS);
    expect(t.s.phase).toBe('idle');
  });

  it('done이면 요약 확인으로 가고 담당자 카드를 만든다', async () => {
    const t = setup({}, { runTurn: vi.fn(async () => turn({ done: true, next_question: null })) });
    await t.flow.submitText('엄마 기초연금', 'quick');
    expect(t.s.screen).toBe('summary');
    expect(t.s.card?.who).toBe('어머니(본인 아님)의 기초연금 신청 건');
    expect(t.s.card?.to_ask).toContain('신청에 필요한 것이 무엇인지');
  });

  it('위기 말은 서버를 기다리지 않고 위기 안내, 돌아가면 원래 화면', async () => {
    const t = setup({ screen: 'asking' });
    await t.flow.submitText('너무 힘들어서 죽고 싶어요', 'voice');
    expect(t.live.runTurn).not.toHaveBeenCalled();
    expect(t.s.screen).toBe('crisis');
    t.flow.leaveCrisis();
    expect(t.s.screen).toBe('asking');
  });

  it('서버 오류: 그 코드로 오류 화면, 방금 말은 history에서 빼서 다시 하기 때 중복 없음', async () => {
    const t = setup(
      { screen: 'asking' },
      {
        runTurn: vi.fn(async () => {
          throw ApiFailure.of('RATE_LIMITED');
        }),
      },
    );
    await t.flow.submitText('방법만 알고 싶어요', 'quick');
    expect(t.s.screen).toBe('error');
    expect(t.s.error?.key).toBe('RATE_LIMITED');
    expect(t.s.history).toEqual([]);
    t.flow.leaveError();
    expect(t.s.screen).toBe('asking');
  });

  it('부분 수정: edit_slot을 보내고 바로 요약으로, 고치기 상태는 풀린다', async () => {
    const t = setup({ screen: 'summary', askCount: 2 });
    t.flow.startEdit('date');
    await t.flow.submitText('이번 주 금요일까지요', 'text', { editSlot: 'date' });
    expect(lastReq(t.live).edit_slot).toBe('date');
    expect(t.s.screen).toBe('summary');
    expect(t.s.editSlot).toBeNull();
  });

  it('질문을 그만하고 지금까지로 요약할 수 있다', async () => {
    const t = setup();
    await t.flow.submitText('엄마 기초연금', 'text');
    t.flow.finishEarly();
    expect(t.s.screen).toBe('summary');
    expect(t.s.card?.unknowns).toContain('원하는 것');
  });

  it('맞아요 → 참고 연락처 → 폰 저장 → 창구 보여주기', async () => {
    const t = setup({}, { runTurn: vi.fn(async () => turn({ done: true, next_question: null })) });
    await t.flow.submitText('엄마 기초연금', 'text');
    await t.flow.confirm();
    expect(t.live.fetchContacts).toHaveBeenCalledWith(t.s.card);
    expect(t.s.contacts).toEqual([CONTACT]);
    const saved = vi.mocked(t.deps.storage.saveSummary).mock.calls[0][0];
    expect(saved.history).toHaveLength(1);
    expect(t.s.saved).toHaveLength(1);
    expect(t.s.notice?.key).toBe('common.saved');
    expect(t.s.screen).toBe('showing');
  });

  it('연락처를 못 받아도 창구 보여주기는 열린다', async () => {
    const t = setup(
      {},
      {
        fetchContacts: vi.fn(async () => {
          throw ApiFailure.of('AI_UNAVAILABLE');
        }),
      },
    );
    await t.flow.confirm();
    expect(t.s.contacts).toEqual([]);
    expect(t.s.contactsFailed).toBe(true);
    expect(t.s.screen).toBe('showing');
  });

  it('저장된 요약을 다시 열고 지울 수 있다', async () => {
    const t = setup({}, { runTurn: vi.fn(async () => turn({ done: true, next_question: null })) });
    await t.flow.submitText('엄마 기초연금', 'text');
    await t.flow.confirm();
    t.flow.goHome();
    t.flow.openSaved(t.s.saved[0]);
    expect(t.s.screen).toBe('showing');
    expect(t.s.viewingSavedId).toBe('id0');
    await t.flow.deleteSaved('id0');
    expect(t.s.saved).toEqual([]);
    expect(t.s.screen).toBe('home');
  });
});

describe('실제 모드: 음성', () => {
  const blob = new Blob(['x'], { type: 'audio/webm' });

  it('STT 결과를 voice로 보낸다', async () => {
    const t = setup();
    await t.flow.submitVoice(blob);
    expect(lastReq(t.live).history.at(-1)?.source).toBe('voice');
    expect(t.s.screen).toBe('asking');
  });

  it('외국어로 말하면 대화·화면 언어를 그 언어로', async () => {
    const t = setup(
      {},
      {
        transcribe: vi.fn(async () => ({
          text: 'Tôi muốn đăng ký tạm trú',
          language: 'vi' as const,
        })),
      },
    );
    await t.flow.submitVoice(blob);
    expect(t.s.uiLanguage).toBe('vi');
    expect(lastReq(t.live).language).toBe('vi');
  });

  it('아무 말도 안 들리면 쉬운 말 안내', async () => {
    const t = setup(
      {},
      { transcribe: vi.fn(async () => ({ text: ' ', language: 'ko' as const })) },
    );
    await t.flow.submitVoice(blob);
    expect(t.s.error).toEqual(NOT_HEARD);
    expect(t.live.runTurn).not.toHaveBeenCalled();
  });

  it('녹음 오류는 화면을 멈추지 않고 안내만', () => {
    const t = setup();
    t.flow.voiceStarted();
    expect(t.s.phase).toBe('recording');
    t.flow.voiceFailed('denied');
    expect(t.s.phase).toBe('idle');
    expect(t.s.notice).toEqual({ key: 'rec.denied', tone: 'warn' });
  });
});

describe('앱 시작·언어', () => {
  it('이전 동의·화면 언어를 복원하고 홈으로', async () => {
    const t = setup({ ready: false, consent: false, screen: 'consent' });
    vi.mocked(t.deps.storage.getConsent).mockResolvedValue(true);
    vi.mocked(t.deps.prefs.loadLanguage).mockReturnValue('en');
    await t.flow.startup();
    expect(t.deps.storage.purgeExpired).toHaveBeenCalled();
    expect(t.s).toMatchObject({ ready: true, consent: true, screen: 'home', uiLanguage: 'en' });
  });

  it('저장소가 없어도 동의 화면에서 시작', async () => {
    const t = setup({ ready: false, consent: false, screen: 'consent' });
    const fail = async () => {
      throw new Error('no idb');
    };
    Object.assign(t.deps.storage, { getConsent: fail, listSummaries: fail, purgeExpired: fail });
    await t.flow.startup();
    expect(t.s).toMatchObject({ ready: true, screen: 'consent' });
  });

  it('동의하면 폰에 기록하고 실제 모드 홈', async () => {
    const t = setup({ consent: false, screen: 'consent' });
    await t.flow.giveConsent();
    expect(t.deps.storage.setConsent).toHaveBeenCalledWith(true);
    expect(t.s).toMatchObject({ consent: true, mode: 'live', screen: 'home' });
  });

  it('화면 언어를 바꾸면 기억한다', () => {
    const t = setup();
    t.flow.setUiLanguage('vi');
    expect(t.s.uiLanguage).toBe('vi');
    expect(t.deps.prefs.saveLanguage).toHaveBeenCalledWith('vi');
  });
});

describe('체험 모드(AI 없이)', () => {
  it('동의 없이 둘러보기는 체험 모드, 처음으로 가도 체험 모드', () => {
    const t = setup({ consent: false, screen: 'consent' });
    t.flow.browseDemo();
    expect(t.s).toMatchObject({ mode: 'demo', screen: 'home' });
    t.flow.goHome();
    expect(t.s.mode).toBe('demo');
  });

  it('기초연금 예시를 끝까지: 실제 API·저장 없이 창구 보여주기까지', async () => {
    const t = setup();
    await t.flow.startDemo('pension');
    expect(t.s.screen).toBe('asking');
    expect(t.s.mode).toBe('demo');
    while (t.s.screen === 'asking') {
      await t.flow.submitText(t.s.quickAnswers[0], 'quick');
    }
    expect(t.s.screen).toBe('summary');
    expect(t.s.card?.who).toContain('기초연금');
    await t.flow.confirm();
    expect(t.s.screen).toBe('showing');
    expect(t.s.contacts.map((c) => c.phone)).toContain('129');
    expect(t.live.runTurn).not.toHaveBeenCalled();
    expect(t.deps.storage.saveSummary).not.toHaveBeenCalled();
  });

  it('체험 모드 말하기는 준비한 다음 말을 넣는다', async () => {
    const t = setup();
    await t.flow.startDemo('move');
    await t.flow.demoTalk();
    expect(t.s.history.map((m) => m.text)).toEqual(
      DEMO_SCENARIOS.move.steps.slice(0, 2).map((s) => s.text),
    );
  });

  it('동의한 사람은 체험 후 처음으로 가면 실제 모드', async () => {
    const t = setup();
    await t.flow.startDemo('move');
    t.flow.goHome();
    expect(t.s.mode).toBe('live');
  });
});

describe('예시 데이터', () => {
  const ALL = new Set(contactsData.map((c) => c.name));
  const FORBIDDEN = /(자격|만\s?\d+세|소득|재산|구비\s?서류|대상자인지)/;

  for (const sc of Object.values(DEMO_SCENARIOS)) {
    describe(sc.id, () => {
      it('질문은 판단(자격·소득 등)을 묻지 않는다', () => {
        for (const s of sc.steps) expect(s.result.next_question ?? '').not.toMatch(FORBIDDEN);
      });
      it('모든 근거는 사용자가 한 말 안에 있다', () => {
        const said = sc.steps.map((s) => s.text).join(' ');
        for (const s of sc.steps)
          for (const v of Object.values(s.result.slots))
            if (v.evidence) expect(said).toContain(v.evidence);
      });
      it('연락처는 data/contacts.json에 있는 것만', () => {
        expect(sc.contacts.length).toBeGreaterThan(0);
        for (const c of sc.contacts) expect(ALL.has(c.name)).toBe(true);
      });
      it('마지막만 done', () => {
        expect(sc.steps.at(-1)!.result.done).toBe(true);
        expect(sc.steps.slice(0, -1).every((s) => !s.result.done)).toBe(true);
      });
    });
  }
});

describe('reducer', () => {
  it('오류·위기 중에 또 생겨도 돌아갈 곳은 처음 화면', () => {
    let s: AppState = { ...INITIAL_STATE, ready: true, consent: true, screen: 'summary' };
    s = reducer(s, { type: 'CRISIS' });
    s = reducer(s, { type: 'ERROR', error: NOT_HEARD });
    s = reducer(s, { type: 'LEAVE_ERROR' });
    expect(s.screen).toBe('summary');
  });

  it('처음으로 가면 대화 내용은 비우고 저장 목록·언어는 남긴다', () => {
    const s = reducer(
      {
        ...INITIAL_STATE,
        consent: true,
        uiLanguage: 'en',
        screen: 'showing',
        history: [{ role: 'user', text: 'a', language: 'en', source: 'text' }],
        saved: [{} as SavedSummary],
      },
      { type: 'GO_HOME', panel: 'write' },
    );
    expect(s).toMatchObject({ screen: 'home', history: [], uiLanguage: 'en', homePanel: 'write' });
    expect(s.saved).toHaveLength(1);
  });
});
