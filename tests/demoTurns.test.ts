// D에게 넘기는 예시 TurnResult(tests/fixtures/demo-turns.json)가 계약과 원칙을 지키는지 검사
import { describe, expect, it } from 'vitest';
import demo from './fixtures/demo-turns.json' with { type: 'json' };
import { ContactTag, Message, SLOT_KEYS, TurnResult } from '../lib/schema.js';
import { FIXED_QUICK_ANSWERS } from '../lib/prompts.js';
import { buildSummaryCard } from '../lib/summary.js';

type Step = { user: unknown; result: unknown };
type Scenario = { id: string; language: 'ko'; contacts_tags: string[]; steps: Step[] };
const scenarios = (demo as { scenarios: Scenario[] }).scenarios;

describe.each(scenarios.map((s) => [s.id, s] as const))('%s', (_id, sc) => {
  const steps = sc.steps.map((s) => ({
    user: Message.omit({ role: true, language: true }).parse(s.user),
    result: TurnResult.parse(s.result),
  }));

  it('모든 result가 TurnResult 스키마를 통과하고 마지막만 done', () => {
    expect(steps.at(-1)!.result.done).toBe(true);
    expect(steps.at(-1)!.result.next_question).toBeNull();
    for (const s of steps.slice(0, -1)) expect(s.result.done).toBe(false);
  });

  it('빠른 답 끝 3개는 항상 고정 선택지', () => {
    for (const s of steps) expect(s.result.quick_answers.slice(-3)).toEqual(FIXED_QUICK_ANSWERS.ko);
  });

  it('질문은 3번을 넘지 않는다', () => {
    for (const s of steps) expect(s.result.ask_count).toBeLessThanOrEqual(3);
  });

  it('모든 evidence는 그때까지 사용자가 실제로 한 말에 들어 있다', () => {
    let said = '';
    for (const s of steps) {
      said += ' ' + s.user.text;
      for (const k of SLOT_KEYS) {
        const { value, evidence } = s.result.slots[k];
        expect(value === null).toBe(evidence === null);
        if (evidence) expect(said.includes(evidence), `${k}: ${evidence}`).toBe(true);
      }
    }
  });

  it('연락처 태그가 계약 목록 안에 있다', () => {
    for (const t of sc.contacts_tags) expect(ContactTag.options).toContain(t);
  });

  it('최종 슬롯으로 요약 카드를 만들 수 있다', () => {
    const last = steps.at(-1)!.result;
    const card = buildSummaryCard(last.slots, last.questions_to_ask, sc.language);
    expect(card.who.length).toBeGreaterThan(0);
  });
});
