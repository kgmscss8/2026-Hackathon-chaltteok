import { describe, expect, it } from 'vitest';
import { Contact, SummaryCard, TurnResult } from '../lib/schema.js';
import { DemoAdapter, DEMO_SCENARIOS } from '../src/demo/index.js';

describe('Demo Scenarios & Adapter', () => {
  const scenarioIds = ['pension', 'moving'] as const;

  for (const id of scenarioIds) {
    const scenario = DEMO_SCENARIOS[id];

    describe(`Scenario: ${scenario.title} (${id})`, () => {
      it('has valid initial prompt and metadata', () => {
        expect(scenario.id).toBe(id);
        expect(scenario.title.length).toBeGreaterThan(0);
        expect(scenario.initialPrompt.length).toBeGreaterThan(0);
      });

      it('validates every step result with TurnResult schema', () => {
        expect(scenario.steps.length).toBeGreaterThanOrEqual(2);
        scenario.steps.forEach((step, index) => {
          expect(() => TurnResult.parse(step.result)).not.toThrow();
          expect(step.userInput.length).toBeGreaterThan(0);
          expect(step.result.ask_count).toBe(index + 1);
        });

        // 마지막 단계는 완료(done)여야 함
        const lastStep = scenario.steps[scenario.steps.length - 1];
        expect(lastStep.result.done).toBe(true);
        expect(lastStep.result.next_question).toBeNull();
      });

      it('validates finalCard with SummaryCard schema', () => {
        expect(() => SummaryCard.parse(scenario.finalCard)).not.toThrow();
        expect(scenario.finalCard.spoken_language).toBe('ko');
        expect(scenario.finalCard.who.length).toBeGreaterThan(0);
        expect(scenario.finalCard.situation.length).toBeGreaterThan(0);
        expect(scenario.finalCard.request.length).toBeGreaterThan(0);
        expect(scenario.finalCard.to_ask.length).toBeGreaterThan(0);
      });

      it('validates all contacts with Contact schema', () => {
        expect(scenario.contacts.length).toBeGreaterThan(0);
        scenario.contacts.forEach((contact) => {
          expect(() => Contact.parse(contact)).not.toThrow();
        });
      });
    });
  }

  describe('DemoAdapter', () => {
    it('retrieves turn results by step index', () => {
      const step0 = DemoAdapter.getTurnResult('pension', 0);
      expect(step0.ask_count).toBe(1);
      expect(step0.done).toBe(false);

      const step2 = DemoAdapter.getTurnResult('pension', 2);
      expect(step2.ask_count).toBe(3);
      expect(step2.done).toBe(true);
    });

    it('retrieves summary card and contacts', () => {
      const card = DemoAdapter.getSummaryCard('moving');
      expect(card.who).toContain('전입신고');

      const contacts = DemoAdapter.getContacts('moving');
      expect(contacts.length).toBeGreaterThan(0);
    });
  });
});
