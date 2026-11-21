// 파트 C 평가 (C9): 테스트 대본을 실제 OpenAI로 돌려 지표를 출력한다. 비용이 들어 수동 실행만.
//   npm run eval:turn            (= vitest run tests/evalTurn.test.ts --mode eval)
// OPENAI_API_KEY는 환경변수나 .env.local(vercel env pull .env.local)에서 읽는다. 평소 npm test에서는 건너뛴다.
import { existsSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import scriptsData from './fixtures/scripts.json' with { type: 'json' };
import { processTurn } from '../api/turn.js';
import {
  SLOT_KEYS,
  type Language,
  type Message,
  type Slots,
  type TurnRequest,
} from '../lib/schema.js';

const RUN = import.meta.env.MODE === 'eval';
if (RUN && !process.env.OPENAI_API_KEY && existsSync('.env.local'))
  process.loadEnvFile('.env.local');

type Script = {
  id: string;
  category: string;
  language: Language;
  turns: { text: string; source: Message['source'] }[];
  expect: {
    crisis: boolean;
    filled: (keyof Slots)[];
    unknown: (keyof Slots)[];
    must_not_contain: string[];
    max_asks: number;
  };
};
const scripts = (scriptsData as { scripts: Script[] }).scripts;

const e = () => ({ value: null, evidence: null });
const emptySlots = (): Slots => ({
  whose_matter: e(),
  purpose: e(),
  desired: e(),
  date: e(),
  question: e(),
});

interface Row {
  id: string;
  category: string;
  crisisOk: boolean;
  filled: number;
  filledExpected: number;
  unknownOk: boolean;
  forbidden: string[];
  badEvidence: string[];
  asks: number;
  error?: string;
}
const rows: Row[] = [];

/** 대본의 발화를 차례로 넣으며 되묻기에 답한다. */
async function play(s: Script): Promise<Row> {
  const history: Message[] = [];
  let slots = emptySlots();
  let askCount = 0;
  let crisis = false;
  for (let i = 0; i < s.turns.length; i++) {
    history.push({
      role: 'user',
      text: s.turns[i].text,
      language: s.language,
      source: s.turns[i].source,
    });
    const req: TurnRequest = { history, slots, ask_count: askCount, language: s.language };
    const r = await processTurn(req);
    slots = r.slots;
    askCount = r.ask_count;
    crisis ||= r.crisis;
    if (r.done || !r.next_question) break;
    history.push({
      role: 'assistant',
      text: r.next_question,
      language: s.language,
      source: 'text',
    });
  }

  const said = s.turns.map((t) => t.text).join(' ');
  const values = SLOT_KEYS.map((k) => slots[k].value ?? '').join(' ');
  return {
    id: s.id,
    category: s.category,
    crisisOk: crisis === s.expect.crisis,
    filled: s.expect.filled.filter((k) => slots[k].value !== null).length,
    filledExpected: s.expect.filled.length,
    unknownOk: s.expect.unknown.every((k) => slots[k].value === null),
    forbidden: s.expect.must_not_contain.filter((w) => values.includes(w)),
    badEvidence: SLOT_KEYS.filter((k) => slots[k].evidence && !said.includes(slots[k].evidence!)),
    asks: askCount,
  };
}

describe.skipIf(!RUN)('eval:turn (실제 OpenAI)', () => {
  it('OPENAI_API_KEY가 있다', () => {
    expect(process.env.OPENAI_API_KEY, '.env.local 또는 환경변수에 키가 필요합니다').toBeTruthy();
  });

  for (const s of scripts) {
    it(
      s.id,
      async () => {
        try {
          rows.push(await play(s));
        } catch (err) {
          const code = (err as { error?: { code?: string } }).error?.code ?? String(err);
          rows.push({
            id: s.id,
            category: s.category,
            crisisOk: false,
            filled: 0,
            filledExpected: s.expect.filled.length,
            unknownOk: false,
            forbidden: [],
            badEvidence: [],
            asks: 0,
            error: code,
          });
        }
      },
      120_000,
    );
  }

  afterAll(() => {
    const ok = rows.filter((r) => !r.error);
    const filled = ok.reduce((a, r) => a + r.filled, 0);
    const expected = ok.reduce((a, r) => a + r.filledExpected, 0);
    const wrong = ok.reduce((a, r) => a + r.forbidden.length + r.badEvidence.length, 0);
    const crisisRows = rows.filter((r) => r.category === 'crisis');
    const normalRows = rows.filter((r) => r.category !== 'crisis');
    const avgAsks = ok.length ? ok.reduce((a, r) => a + r.asks, 0) / ok.length : 0;

    console.table(
      rows.map((r) => ({
        id: r.id,
        위기: r.crisisOk ? 'OK' : 'X',
        채움: `${r.filled}/${r.filledExpected}`,
        미확인: r.unknownOk ? 'OK' : 'X',
        금지어: r.forbidden.join(',') || '-',
        근거오류: r.badEvidence.join(',') || '-',
        질문수: r.asks,
        오류: r.error ?? '-',
      })),
    );
    console.log(
      [
        `필수 항목 채움률: ${expected ? ((filled / expected) * 100).toFixed(0) : 0}% (${filled}/${expected})`,
        `원문에 없는 항목 수: ${wrong} (목표 0)`,
        `평균 되묻기 횟수: ${avgAsks.toFixed(2)} (목표 3 이하)`,
        `위기 감지: ${crisisRows.filter((r) => r.crisisOk).length}/${crisisRows.length}`,
        `위기 오탐: ${normalRows.filter((r) => !r.crisisOk && !r.error).length}/${normalRows.length} (목표 0)`,
        `오류: ${rows.filter((r) => r.error).length}`,
      ].join('\n'),
    );
  });
});
