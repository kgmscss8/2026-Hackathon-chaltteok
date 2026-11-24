/**
 * AI 없이 흐름을 끝까지 체험하는 예시 시나리오 2개(F13·D9).
 * 대화 데이터는 C가 원칙(원문 근거·판단 금지·기본 선택지)을 검사해 넘겨준 tests/fixtures/demo-turns.json,
 * 연락처는 data/contacts.json에서 태그로 고른다(만든 연락처 없음).
 */
import contactsData from '../../data/contacts.json' with { type: 'json' };
import demoTurns from '../../tests/fixtures/demo-turns.json' with { type: 'json' };
import {
  Contact,
  ContactTag,
  Message,
  TurnResult,
  type Slots,
  type TurnRequest,
} from '@lib/schema';
import { z } from 'zod';
import type { Backend } from '../state/backend.js';
import type { DemoId } from '../state/types.js';

export interface DemoStep {
  text: string;
  source: Message['source'];
  result: TurnResult;
}

export interface DemoScenario {
  id: DemoId;
  steps: DemoStep[];
  contacts: Contact[];
}

const FIXTURE_IDS: Record<DemoId, string> = {
  pension: 'demo-pension-mother',
  move: 'demo-move-in',
};

const FixtureScenario = z.object({
  id: z.string(),
  contacts_tags: z.array(ContactTag),
  steps: z.array(
    z.object({
      user: z.object({ text: z.string(), source: z.enum(['voice', 'text', 'quick']) }),
      result: TurnResult,
    }),
  ),
});

const ALL_CONTACTS = z.array(Contact).parse(contactsData);

function load(id: DemoId): DemoScenario {
  const raw = (demoTurns as { scenarios: unknown[] }).scenarios
    .map((s) => FixtureScenario.parse(s))
    .find((s) => s.id === FIXTURE_IDS[id]);
  if (!raw) throw new Error(`예시 시나리오가 없습니다: ${id}`);
  return {
    id,
    steps: raw.steps.map((s) => ({ text: s.user.text, source: s.user.source, result: s.result })),
    contacts: ALL_CONTACTS.filter((c) => c.tags.some((t) => raw.contacts_tags.includes(t))),
  };
}

export const DEMO_SCENARIOS: Record<DemoId, DemoScenario> = {
  pension: load('pension'),
  move: load('move'),
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 예시 데이터로 실제 API와 같은 모양을 흉내 낸다(네트워크·OpenAI 호출 없음) */
export function demoBackend(id: DemoId, latencyMs = 600): Backend {
  const sc = DEMO_SCENARIOS[id];
  const last = sc.steps.length - 1;

  return {
    scriptedInput: (userTurns) => sc.steps[Math.min(userTurns, last)]?.text ?? null,

    async transcribe() {
      await delay(latencyMs);
      return { text: sc.steps[0].text, language: 'ko' };
    },

    async runTurn(req: TurnRequest) {
      await delay(latencyMs);
      const userTurns = req.history.filter((m) => m.role === 'user').length;
      if (req.edit_slot) {
        // 부분 수정: 그 항목만 방금 한 말로 바꾼다(말한 그대로가 근거)
        const said = req.history.at(-1)?.text ?? '';
        const slots: Slots = { ...req.slots, [req.edit_slot]: { value: said, evidence: said } };
        return { ...sc.steps[last].result, slots, done: true, next_question: null };
      }
      return sc.steps[Math.min(Math.max(userTurns - 1, 0), last)].result;
    },

    async fetchContacts() {
      await delay(latencyMs / 2);
      return sc.contacts;
    },
  };
}
