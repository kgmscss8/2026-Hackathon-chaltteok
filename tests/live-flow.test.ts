import { describe, expect, it, vi } from 'vitest';
import { ApiFailure } from '../lib/errors.js';
import type { Contact, SavedSummary, Slots, TurnRequest, TurnResult } from '../lib/schema.js';
import { createLiveActions, NOT_HEARD, type LiveDeps } from '../src/state/liveFlow.js';
import { appReducer, INITIAL_SLOTS, INITIAL_STATE } from '../src/state/machine.js';
import type { AppAction, AppState } from '../src/state/types.js';

const DEFAULTS = ['해당 없어요', '잘 모르겠어요', '직접 말할게요'];

function turn(partial: Partial<TurnResult> = {}): TurnResult {
  const slots: Slots = {
    ...INITIAL_SLOTS,
    whose_matter: { value: '어머니(본인 아님)', evidence: '엄마' },
    purpose: { value: '기초연금 신청', evidence: '기초연금 신청하려는데' },
  };
  return {
    slots,
    questions_to_ask: ['뭐가 필요한지 모르겠어요'],
    next_question: '오늘 창구에서 어떻게 되길 바라세요?',
    quick_answers: ['방법만 알고 싶어요', ...DEFAULTS],
    ask_count: 1,
    done: false,
    crisis: false,
    ...partial,
  };
}

const CONTACT: Contact = {
  tags: ['welfare'],
  name: '보건복지상담센터',
  phone: '129',
  scope: '복지 제도 상담',
  source: 'https://www.129.go.kr',
  checked_at: '2026-11-21',
};

function setup(initial: Partial<AppState> = {}, overrides: Partial<LiveDeps> = {}) {
  let state: AppState = { ...INITIAL_STATE, consentGiven: true, screen: 'home', ...initial };
  const actions: AppAction[] = [];
  const dispatch = (a: AppAction) => {
    actions.push(a);
    state = appReducer(state, a);
  };
  const saved: SavedSummary[] = [];
  const deps: LiveDeps = {
    runTurn: vi.fn(async () => turn()),
    transcribe: vi.fn(async () => ({
      text: '엄마 기초연금 신청하려는데',
      language: 'ko' as const,
    })),
    fetchContacts: vi.fn(async () => ({ tags: ['welfare' as const], contacts: [CONTACT] })),
    saveSummary: vi.fn(async (s) => {
      const full = { ...s, id: `id${saved.length}`, created_at: 1, expires_at: 2 };
      saved.push(full);
      return full;
    }),
    listSummaries: vi.fn(async () => [...saved]),
    getConsent: vi.fn(async () => false),
    setConsent: vi.fn(async () => undefined),
    purgeExpired: vi.fn(async () => 0),
    requestPersistentStorage: vi.fn(async () => true),
    ...overrides,
  };
  const live = createLiveActions(() => state, dispatch, deps);
  return {
    live,
    deps,
    actions,
    get state() {
      return state;
    },
  };
}

describe('submitUserText', () => {
  it('동의 전에는 OpenAI로 보내지 않고 동의 화면으로 간다', async () => {
    const t = setup({ consentGiven: false });
    await t.live.submitUserText('엄마 기초연금', 'text');
    expect(t.deps.runTurn).not.toHaveBeenCalled();
    expect(t.state.screen).toBe('consent');
  });

  it('말한 내용을 history에 넣어 /api/turn에 보내고 되묻기 화면으로 간다', async () => {
    const t = setup();
    await t.live.submitUserText('  엄마 기초연금 신청하려는데  ', 'text');
    const req = vi.mocked(t.deps.runTurn).mock.calls[0][0] as TurnRequest;
    expect(req.history.at(-1)).toEqual({
      role: 'user',
      text: '엄마 기초연금 신청하려는데',
      language: 'ko',
      source: 'text',
    });
    expect(req.ask_count).toBe(0);
    expect(req.edit_slot).toBeUndefined();
    expect(t.state.screen).toBe('asking');
    expect(t.state.nextQuestion).toBe('오늘 창구에서 어떻게 되길 바라세요?');
    expect(t.state.quickAnswers.slice(-3)).toEqual(DEFAULTS);
    expect(t.state.busy).toBe(false);
  });

  it('done이면 요약 확인으로 가고 카드를 만든다(물어볼 것 포함)', async () => {
    const t = setup({}, { runTurn: vi.fn(async () => turn({ done: true, next_question: null })) });
    await t.live.submitUserText('엄마 기초연금', 'quick');
    expect(t.state.screen).toBe('summary');
    expect(t.state.currentCard?.who).toContain('어머니');
    expect(t.state.questionsToAsk).toEqual(['뭐가 필요한지 모르겠어요']);
    expect(t.state.currentCard?.to_ask.length).toBeGreaterThan(0);
  });

  it('위기 키워드는 서버를 기다리지 않고 바로 위기 안내', async () => {
    const t = setup();
    await t.live.submitUserText('너무 힘들어서 죽고 싶어요', 'voice');
    expect(t.deps.runTurn).not.toHaveBeenCalled();
    expect(t.state.screen).toBe('crisis');
  });

  it('서버가 crisis를 주면 위기 안내', async () => {
    const t = setup({}, { runTurn: vi.fn(async () => turn({ crisis: true })) });
    await t.live.submitUserText('요즘 많이 힘들어요', 'text');
    expect(t.state.screen).toBe('crisis');
  });

  it('사용량 초과면 그 오류로 오류 화면, busy는 풀린다', async () => {
    const t = setup(
      {},
      {
        runTurn: vi.fn(async () => {
          throw ApiFailure.of('RATE_LIMITED');
        }),
      },
    );
    await t.live.submitUserText('엄마 기초연금', 'text');
    expect(t.state.screen).toBe('error');
    expect(t.state.error?.code).toBe('RATE_LIMITED');
    expect(t.state.busy).toBe(false);
  });

  it('알 수 없는 오류는 AI_UNAVAILABLE', async () => {
    const t = setup(
      {},
      {
        runTurn: vi.fn(async () => {
          throw new Error('boom');
        }),
      },
    );
    await t.live.submitUserText('엄마 기초연금', 'text');
    expect(t.state.error?.code).toBe('AI_UNAVAILABLE');
  });

  it('부분 수정은 edit_slot을 보내고 바로 요약 확인으로 돌아간다', async () => {
    const t = setup({ screen: 'summary', askCount: 2 });
    await t.live.submitUserText('이번 주 금요일까지요', 'text', undefined, { editSlot: 'date' });
    const req = vi.mocked(t.deps.runTurn).mock.calls[0][0] as TurnRequest;
    expect(req.edit_slot).toBe('date');
    expect(t.state.screen).toBe('summary');
    expect(t.state.editSlot).toBeNull();
    expect(t.state.currentCard).not.toBeNull();
  });

  it('빈 말은 무시한다', async () => {
    const t = setup();
    await t.live.submitUserText('   ', 'text');
    expect(t.deps.runTurn).not.toHaveBeenCalled();
    expect(t.state.history).toEqual([]);
  });
});

describe('submitVoice', () => {
  const blob = new Blob(['x'], { type: 'audio/webm' });

  it('STT 결과를 보여 주고 voice로 /api/turn에 보낸다(언어 힌트 없음)', async () => {
    const t = setup({ screen: 'listening' });
    await t.live.submitVoice(blob);
    expect(t.deps.transcribe).toHaveBeenCalledWith(blob);
    expect(t.state.interimTranscript).toBe('엄마 기초연금 신청하려는데');
    const req = vi.mocked(t.deps.runTurn).mock.calls[0][0] as TurnRequest;
    expect(req.history.at(-1)?.source).toBe('voice');
  });

  it('외국어로 인식되면 대화 언어를 바꿔 보낸다', async () => {
    const t = setup(
      { screen: 'listening' },
      {
        transcribe: vi.fn(async () => ({
          text: 'My mother wants a pension',
          language: 'en' as const,
        })),
      },
    );
    await t.live.submitVoice(blob);
    expect(t.state.language).toBe('en');
    expect((vi.mocked(t.deps.runTurn).mock.calls[0][0] as TurnRequest).language).toBe('en');
  });

  it('아무 말도 안 들리면 쉬운 말 안내', async () => {
    const t = setup(
      { screen: 'listening' },
      {
        transcribe: vi.fn(async () => ({ text: '  ', language: 'ko' as const })),
      },
    );
    await t.live.submitVoice(blob);
    expect(t.state.error).toEqual(NOT_HEARD);
    expect(t.deps.runTurn).not.toHaveBeenCalled();
  });

  it('STT 실패는 오류 화면', async () => {
    const t = setup(
      { screen: 'listening' },
      {
        transcribe: vi.fn(async () => {
          throw ApiFailure.of('AI_UNAVAILABLE');
        }),
      },
    );
    await t.live.submitVoice(blob);
    expect(t.state.screen).toBe('error');
    expect(t.state.busy).toBe(false);
  });
});

describe('confirmSummary', () => {
  it('맞아요 → 연락처 받기 → 폰 저장 → 창구 보여주기', async () => {
    const t = setup({}, { runTurn: vi.fn(async () => turn({ done: true, next_question: null })) });
    await t.live.submitUserText('엄마 기초연금', 'text');
    await t.live.confirmSummary();

    expect(t.deps.fetchContacts).toHaveBeenCalledWith(t.state.currentCard);
    expect(t.state.contacts).toEqual([CONTACT]);
    const saved = vi.mocked(t.deps.saveSummary).mock.calls[0][0];
    expect(saved.card).toEqual(t.state.currentCard);
    expect(saved.history.length).toBe(1);
    expect(saved.contacts).toEqual([CONTACT]);
    expect(t.state.savedSummaries.length).toBe(1);
    expect(t.state.screen).toBe('showing');
    expect(t.state.busy).toBe(false);
  });

  it('연락처를 못 받아도 저장하고 카드는 보여 준다', async () => {
    const t = setup(
      {},
      {
        fetchContacts: vi.fn(async () => {
          throw ApiFailure.of('AI_UNAVAILABLE');
        }),
      },
    );
    await t.live.confirmSummary();
    expect(t.state.contacts).toEqual([]);
    expect(t.deps.saveSummary).toHaveBeenCalled();
    expect(t.state.screen).toBe('showing');
  });

  it('저장소를 못 써도 창구 보여주기는 열린다', async () => {
    const t = setup(
      {},
      {
        saveSummary: vi.fn(async () => {
          throw new Error('no idb');
        }),
      },
    );
    await t.live.confirmSummary();
    expect(t.state.screen).toBe('showing');
  });
});

describe('startup / giveConsent', () => {
  it('이전 동의가 있으면 홈으로, 만료 정리·저장 목록 불러오기', async () => {
    const t = setup(
      { consentGiven: false, screen: 'consent' },
      {
        getConsent: vi.fn(async () => true),
      },
    );
    await t.live.startup();
    expect(t.deps.purgeExpired).toHaveBeenCalled();
    expect(t.deps.requestPersistentStorage).toHaveBeenCalled();
    expect(t.state.consentGiven).toBe(true);
    expect(t.state.screen).toBe('home');
    expect(t.deps.listSummaries).toHaveBeenCalled();
  });

  it('저장소가 없어도 앱은 동의 화면에서 시작한다', async () => {
    const fail = vi.fn(async () => {
      throw new Error('no idb');
    });
    const t = setup(
      { consentGiven: false, screen: 'consent' },
      {
        getConsent: fail,
        purgeExpired: fail,
        listSummaries: fail,
      },
    );
    await t.live.startup();
    expect(t.state.screen).toBe('consent');
  });

  it('동의하면 폰에 기록하고 실제 모드로 홈', async () => {
    const t = setup({ consentGiven: false, screen: 'consent', mode: 'demo' });
    await t.live.giveConsent();
    expect(t.deps.setConsent).toHaveBeenCalledWith(true);
    expect(t.state.mode).toBe('live');
    expect(t.state.screen).toBe('home');
  });
});

describe('RESET_FLOW 모드', () => {
  it('동의한 사용자는 처음으로 가면 실제 모드로 돌아온다', () => {
    const s = appReducer(
      { ...INITIAL_STATE, consentGiven: true, mode: 'demo' },
      { type: 'RESET_FLOW' },
    );
    expect(s.mode).toBe('live');
  });
  it('동의 전에는 체험 모드에 머문다', () => {
    const s = appReducer(
      { ...INITIAL_STATE, consentGiven: false, mode: 'demo' },
      { type: 'RESET_FLOW' },
    );
    expect(s.mode).toBe('demo');
  });
});
