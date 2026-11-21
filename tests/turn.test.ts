import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ApiFailure } from '../lib/errors.js';
import { FIXED_QUICK_ANSWERS, slotMeta } from '../lib/prompts.js';
import {
  TurnResult,
  type Message,
  type SlotKey,
  type Slots,
  type TurnRequest,
} from '../lib/schema.js';

const create = vi.fn();
vi.mock('../lib/openai.js', () => ({
  MODELS: { transcribe: 't', chat: 'chat-model', tts: 's' },
  getOpenAI: () => ({ chat: { completions: { create } } }),
}));

const { default: handler, processTurn, askedSlots, pickNextSlot } = await import('../api/turn.js');
const { runTurn } = await import('../src/api/turn.js');

const e = () => ({ value: null, evidence: null });
const emptySlots = (): Slots => ({
  whose_matter: e(),
  purpose: e(),
  desired: e(),
  date: e(),
  question: e(),
});
const user = (text: string, source: Message['source'] = 'voice'): Message => ({
  role: 'user',
  text,
  language: 'ko',
  source,
});
const asked = (k: SlotKey, lang: 'ko' | 'en' | 'vi' = 'ko'): Message => ({
  role: 'assistant',
  text: slotMeta(k).questions[lang],
  language: lang,
  source: 'text',
});

function req(p: Partial<TurnRequest> & { history: Message[] }): TurnRequest {
  return { slots: emptySlots(), ask_count: 0, language: 'ko', ...p };
}

type LlmTurn = {
  slots?: Partial<Record<SlotKey, { value: string | null; evidence: string | null }>>;
  questions_to_ask?: { question: string; evidence: string }[];
  worth_asking?: SlotKey[];
  crisis?: boolean;
};

/** schemaName으로 정리/검증 호출을 구분하는 가짜 LLM */
function fakeLlm(turn: LlmTurn | string | (LlmTurn | string)[], unfaithful: SlotKey[] = []) {
  const turns = Array.isArray(turn) ? [...turn] : [turn];
  const calls: { system: string; user: string; schemaName: string }[] = [];
  const complete = vi.fn(async (system: string, userPrompt: string, schemaName: string) => {
    calls.push({ system, user: userPrompt, schemaName });
    if (schemaName === 'faithfulness') {
      const keys = [...userPrompt.matchAll(/^- (\w+)$/gm)].map((m) => m[1] as SlotKey);
      return JSON.stringify({
        results: keys.map((key) => ({ key, faithful: !unfaithful.includes(key) })),
      });
    }
    const t = turns.length > 1 ? turns.shift()! : turns[0];
    if (typeof t === 'string') return t;
    return JSON.stringify({
      slots: { ...emptySlots(), ...t.slots },
      questions_to_ask: t.questions_to_ask ?? [],
      worth_asking: t.worth_asking ?? [],
      crisis: t.crisis ?? false,
    });
  });
  return { complete, calls };
}

describe('processTurn', () => {
  it('첫 발화: 슬롯을 채우고 다음 빈 슬롯을 slots.json 문구로 묻는다', async () => {
    const { complete } = fakeLlm({
      slots: {
        whose_matter: { value: '어머니(본인 아님)', evidence: '엄마' },
        purpose: { value: '기초연금 신청', evidence: '엄마 기초연금 신청하려는데' },
        question: { value: '필요한 것이 무엇인지', evidence: '뭐가 필요한지 모르겠어요' },
      },
      questions_to_ask: [{ question: '신청에 필요한 것이 무엇인지', evidence: '뭐가 필요한지' }],
      worth_asking: ['date', 'desired'],
    });
    const r = await processTurn(
      req({ history: [user('엄마 기초연금 신청하려는데 뭐가 필요한지 모르겠어요')] }),
      complete,
    );
    expect(TurnResult.parse(r)).toEqual(r);
    expect(r.slots.purpose.value).toBe('기초연금 신청');
    expect(r.next_question).toBe(slotMeta('desired').questions.ko); // 우선순위: desired(3) > date(4)
    expect(r.quick_answers).toEqual([
      ...slotMeta('desired').quick_answers.ko,
      ...FIXED_QUICK_ANSWERS.ko,
    ]);
    expect(r.ask_count).toBe(1);
    expect(r.done).toBe(false);
    expect(r.crisis).toBe(false);
  });

  it('원문에 없는 evidence는 지우고, 비게 된 누구의 일을 먼저 묻는다', async () => {
    const { complete } = fakeLlm({
      slots: {
        whose_matter: { value: '어머니', evidence: '우리 어머니가' },
        purpose: { value: '전입신고', evidence: '전입신고' },
      },
    });
    const r = await processTurn(req({ history: [user('전입신고 하려고요')] }), complete);
    expect(r.slots.whose_matter).toEqual(e());
    expect(r.next_question).toBe(slotMeta('whose_matter').questions.ko);
  });

  it('LLM 검증이 벗어났다고 하면 null(함정: 민원 종류 이름 붙이기)', async () => {
    const { complete } = fakeLlm(
      { slots: { purpose: { value: '기초연금 신청', evidence: '나라에서 돈 주는 거' } } },
      ['purpose'],
    );
    const r = await processTurn(
      req({ history: [user('나라에서 돈 주는 거 있잖아 그거 때문에 왔어')] }),
      complete,
    );
    expect(r.slots.purpose).toEqual(e());
  });

  it('이미 물은 슬롯은 "잘 모르겠어요"로 비어 있어도 다시 묻지 않는다', async () => {
    const { complete } = fakeLlm({ worth_asking: ['date'] });
    const slots = emptySlots();
    slots.whose_matter = { value: '본인', evidence: '제 거요' };
    slots.purpose = { value: '전입신고', evidence: '전입신고요' };
    const r = await processTurn(
      req({
        slots,
        ask_count: 1,
        history: [user('전입신고요 제 거요'), asked('date'), user('잘 모르겠어요', 'quick')],
      }),
      complete,
    );
    expect(r.slots.date).toEqual(e());
    expect(r.done).toBe(true);
    expect(r.next_question).toBeNull();
    expect(r.quick_answers).toEqual([...FIXED_QUICK_ANSWERS.ko]);
    expect(r.ask_count).toBe(1);
  });

  it('질문 3번이 되면 빈 슬롯이 있어도 끝낸다', async () => {
    const { complete } = fakeLlm({ worth_asking: ['date', 'desired', 'question'] });
    const r = await processTurn(req({ ask_count: 3, history: [user('등본요')] }), complete);
    expect(r.done).toBe(true);
    expect(r.ask_count).toBe(3);
  });

  it('LLM이 물을 가치 없다고 한 슬롯은 묻지 않는다(누구의 일·용건은 예외)', () => {
    const s = emptySlots();
    s.whose_matter = { value: '본인', evidence: '제' };
    s.purpose = { value: '등본', evidence: '등본' };
    expect(pickNextSlot(s, new Set(), [])).toBeNull();
    expect(pickNextSlot(emptySlots(), new Set(), [])).toBe('whose_matter');
  });

  it('askedSlots는 언어와 관계없이 질문 문구로 찾는다', () => {
    expect([...askedSlots([asked('date', 'vi'), asked('purpose', 'en'), user('x')])]).toEqual([
      'date',
      'purpose',
    ]);
  });

  it('키워드 위기 감지는 LLM이 놓쳐도 crisis=true', async () => {
    const { complete } = fakeLlm({ crisis: false });
    const r = await processTurn(req({ history: [user('며칠째 아무것도 못 먹었어요')] }), complete);
    expect(r.crisis).toBe(true);
  });

  it('LLM 위기 판단도 반영', async () => {
    const { complete } = fakeLlm({ crisis: true });
    expect(
      (await processTurn(req({ history: [user('더는 못 버티겠어요')] }), complete)).crisis,
    ).toBe(true);
  });

  it('JSON이 깨지면 1회 다시 요청해서 성공', async () => {
    const { complete } = fakeLlm(['{not json', { worth_asking: [] }]);
    const r = await processTurn(req({ history: [user('등본요')] }), complete);
    expect(TurnResult.safeParse(r).success).toBe(true);
    expect(complete.mock.calls.filter((c) => c[2] === 'turn')).toHaveLength(2);
  });

  it('두 번 다 깨지면 BAD_JSON', async () => {
    const { complete } = fakeLlm(['{"slots":1}']);
    await expect(processTurn(req({ history: [user('등본요')] }), complete)).rejects.toMatchObject({
      error: { code: 'BAD_JSON' },
    });
  });

  it('부분 수정: 그 슬롯만 마지막 발화로 바꾸고 바로 done, 질문 수는 그대로', async () => {
    const slots = emptySlots();
    slots.whose_matter = { value: '본인', evidence: '제 거' };
    slots.purpose = { value: '등본', evidence: '등본요' };
    const { complete, calls } = fakeLlm({
      slots: {
        whose_matter: { value: '어머니(본인 아님)', evidence: '어머니 거예요' },
        purpose: { value: '초본', evidence: '초본' }, // 수정 대상이 아니므로 무시돼야 함
      },
    });
    const r = await processTurn(
      req({
        slots,
        ask_count: 2,
        edit_slot: 'whose_matter',
        history: [user('등본요 제 거'), user('아니 어머니 거예요')],
      }),
      complete,
    );
    expect(r.slots.whose_matter.value).toBe('어머니(본인 아님)');
    expect(r.slots.purpose.value).toBe('등본');
    expect(r.done).toBe(true);
    expect(r.ask_count).toBe(2);
    expect(calls[0].system).toContain('부분 수정');
  });

  it('부분 수정 evidence가 마지막 발화에 없으면 null', async () => {
    const slots = emptySlots();
    slots.whose_matter = { value: '본인', evidence: '제 거' };
    const { complete } = fakeLlm({ slots: { whose_matter: { value: '본인', evidence: '제 거' } } });
    const r = await processTurn(
      req({
        slots,
        edit_slot: 'whose_matter',
        history: [user('등본요 제 거'), user('잘 모르겠어요')],
      }),
      complete,
    );
    expect(r.slots.whose_matter).toEqual(e());
  });

  it('외국어: 질문·빠른 답은 사용자 언어', async () => {
    const { complete } = fakeLlm({});
    const r = await processTurn(
      req({
        language: 'vi',
        history: [{ role: 'user', text: 'Xin chào', language: 'vi', source: 'voice' }],
      }),
      complete,
    );
    expect(r.next_question).toBe(slotMeta('whose_matter').questions.vi);
    expect(r.quick_answers.slice(-3)).toEqual(FIXED_QUICK_ANSWERS.vi);
  });

  it('OpenAI로 가는 사용자 발화는 마스킹된다', async () => {
    const { complete, calls } = fakeLlm({});
    await processTurn(req({ history: [user('제 번호는 010-1234-5678이에요')] }), complete);
    expect(calls[0].user).not.toContain('010-1234-5678');
    expect(calls[0].user).toContain('******');
  });

  it('물어볼 것은 중복을 빼고 최대 3개', async () => {
    const q = (question: string) => ({ question, evidence: '등본요' });
    const { complete } = fakeLlm({ questions_to_ask: [q('a'), q('a'), q(' b '), q('c'), q('d')] });
    const r = await processTurn(req({ history: [user('등본요')] }), complete);
    expect(r.questions_to_ask).toEqual(['a', 'b', 'c']);
  });

  it('물어볼 것: 근거가 원문에 없거나(지어낸 질문) 찰떡의 되묻기 문장이면 뺀다', async () => {
    const { complete } = fakeLlm({
      questions_to_ask: [
        { question: '현재 안전한 곳에 계신가요?', evidence: '안전한 곳' },
        { question: slotMeta('date').questions.ko, evidence: '이사' },
        { question: '얼마나 걸리나요?', evidence: '얼마나 걸려요' },
      ],
    });
    const r = await processTurn(
      req({ history: [user('어제 이사 왔어요. 전입신고 얼마나 걸려요?')] }),
      complete,
    );
    expect(r.questions_to_ask).toEqual(['얼마나 걸리나요?']);
  });

  it('물어볼 것이 이미 있으면 "궁금한 점"은 다시 묻지 않는다', async () => {
    const s = emptySlots();
    s.whose_matter = { value: '본인', evidence: '제 거' };
    s.purpose = { value: '등본', evidence: '등본' };
    expect(pickNextSlot(s, new Set(), ['question'], true)).toBeNull();
    expect(pickNextSlot(s, new Set(), ['question'], false)).toBe('question');
  });

  it('사용자 발화가 없으면 BAD_REQUEST', async () => {
    const { complete } = fakeLlm({});
    await expect(
      processTurn(req({ history: [asked('purpose')] }), complete),
    ).rejects.toBeInstanceOf(ApiFailure);
  });

  it('바뀐 슬롯만 LLM 검증에 보낸다', async () => {
    const slots = emptySlots();
    slots.purpose = { value: '등본', evidence: '등본요' };
    const { complete, calls } = fakeLlm({
      slots: { date: { value: '내일까지', evidence: '내일까지' } },
    });
    await processTurn(req({ slots, history: [user('등본요'), user('내일까지요')] }), complete);
    const verify = calls.find((c) => c.schemaName === 'faithfulness')!;
    expect(verify.user).toContain('- date');
    expect(verify.user).not.toContain('- purpose');
  });
});

function fakeRes() {
  const r = {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(c: number) {
      r.statusCode = c;
      return r;
    },
    json(b: unknown) {
      r.body = b;
      return r;
    },
    setHeader(k: string, v: string) {
      r.headers[k.toLowerCase()] = v;
      return r;
    },
  };
  return r;
}
const httpReq = (body: unknown, method = 'POST') =>
  ({ method, body, headers: { 'content-length': '100' } }) as unknown as VercelRequest;

describe('POST /api/turn', () => {
  beforeEach(() => {
    create.mockReset();
  });

  it('OpenAI 구조화 출력으로 TurnResult를 돌려준다', async () => {
    create.mockImplementation(
      async (args: { response_format: { json_schema: { name: string } } }) => ({
        choices: [
          {
            message: {
              content:
                args.response_format.json_schema.name === 'turn'
                  ? JSON.stringify({
                      slots: emptySlots(),
                      questions_to_ask: [],
                      worth_asking: [],
                      crisis: false,
                    })
                  : JSON.stringify({ results: [] }),
            },
          },
        ],
      }),
    );
    const res = fakeRes();
    await handler(httpReq(req({ history: [user('등본요')] })), res as unknown as VercelResponse);
    expect(res.statusCode).toBe(200);
    expect(TurnResult.parse(res.body).next_question).toBe(slotMeta('whose_matter').questions.ko);
    expect(create.mock.calls[0][0]).toMatchObject({ model: 'chat-model', temperature: 0 });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('잘못된 요청은 BAD_REQUEST', async () => {
    for (const body of [{}, { history: 'x' }, '{oops']) {
      const res = fakeRes();
      await handler(httpReq(body), res as unknown as VercelResponse);
      expect(res.statusCode).toBe(400);
    }
    expect(create).not.toHaveBeenCalled();
  });

  it('GET은 BAD_REQUEST', async () => {
    const res = fakeRes();
    await handler(httpReq(undefined, 'GET'), res as unknown as VercelResponse);
    expect(res.statusCode).toBe(400);
  });

  it('OpenAI 429는 RATE_LIMITED', async () => {
    create.mockRejectedValue(Object.assign(new Error('rate'), { status: 429 }));
    const res = fakeRes();
    await handler(httpReq(req({ history: [user('등본요')] })), res as unknown as VercelResponse);
    expect(res.body).toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('구조화 출력이 계속 깨지면 BAD_JSON(502)', async () => {
    create.mockResolvedValue({ choices: [{ message: { content: 'nope' } }] });
    const res = fakeRes();
    await handler(httpReq(req({ history: [user('등본요')] })), res as unknown as VercelResponse);
    expect(res.body).toMatchObject({ code: 'BAD_JSON' });
    expect(create).toHaveBeenCalledTimes(2);
  });
});

describe('runTurn (프론트)', () => {
  const fetchMock = vi.fn<typeof fetch>();
  afterEach(() => {
    fetchMock.mockReset();
  });
  const ok: TurnResult = {
    slots: emptySlots(),
    questions_to_ask: [],
    next_question: null,
    quick_answers: [...FIXED_QUICK_ANSWERS.ko],
    ask_count: 0,
    done: true,
    crisis: false,
  };
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });

  it('성공하면 TurnResult', async () => {
    fetchMock.mockResolvedValue(json(ok));
    expect(await runTurn(req({ history: [user('x')] }), fetchMock)).toEqual(ok);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/turn');
  });

  it('서버 ApiError는 그대로', async () => {
    fetchMock.mockResolvedValue(json({ code: 'RATE_LIMITED', message_ko: '많아요' }, 429));
    await expect(runTurn(req({ history: [user('x')] }), fetchMock)).rejects.toMatchObject({
      error: { code: 'RATE_LIMITED' },
    });
  });

  it('네트워크 오류는 AI_UNAVAILABLE, 모양이 틀리면 BAD_JSON', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    await expect(runTurn(req({ history: [user('x')] }), fetchMock)).rejects.toMatchObject({
      error: { code: 'AI_UNAVAILABLE' },
    });
    fetchMock.mockResolvedValue(json({ done: 'yes' }));
    await expect(runTurn(req({ history: [user('x')] }), fetchMock)).rejects.toMatchObject({
      error: { code: 'BAD_JSON' },
    });
  });
});
