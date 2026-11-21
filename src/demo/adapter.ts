import type { Contact, SummaryCard, TurnResult } from '../../lib/schema.js';
import { DEMO_SCENARIOS, type DemoScenario } from './scenarios.js';

export class DemoAdapter {
  static getScenario(id: 'pension' | 'moving'): DemoScenario {
    return DEMO_SCENARIOS[id];
  }

  static getTurnResult(id: 'pension' | 'moving', stepIndex: number): TurnResult {
    const scenario = DEMO_SCENARIOS[id];
    const step = scenario.steps[stepIndex];
    if (!step) {
      // 마지막 스텝을 넘어가면 완료된 마지막 결과 반환
      return scenario.steps[scenario.steps.length - 1].result;
    }
    return step.result;
  }

  static getSummaryCard(id: 'pension' | 'moving'): SummaryCard {
    return DEMO_SCENARIOS[id].finalCard;
  }

  static getContacts(id: 'pension' | 'moving'): Contact[] {
    return DEMO_SCENARIOS[id].contacts;
  }
}
