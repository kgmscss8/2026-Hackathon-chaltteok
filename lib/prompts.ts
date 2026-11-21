// 정리·되묻기 프롬프트와 되묻기 항목(data/slots.json) 정보 (파트 C). 프론트·서버 모두 사용 가능.
import slotsData from '../data/slots.json' with { type: 'json' };
import type { Language, SlotKey } from './schema.js';

export interface SlotMeta {
  key: SlotKey;
  name_ko: string;
  description_ko: string;
  priority: number;
  questions: Record<Language, string>;
  quick_answers: Record<Language, string[]>;
}

const data = slotsData as {
  max_questions: number;
  fixed_quick_answers: Record<Language, string[]>;
  slots: SlotMeta[];
};

/** 우선순위 순서(누구의 일 → 용건 → …) */
export const SLOT_META: readonly SlotMeta[] = [...data.slots].sort(
  (a, b) => a.priority - b.priority,
);

export const MAX_QUESTIONS: number = data.max_questions;

/** 빠른 답 끝에 항상 붙는 3개: 해당 없어요 / 잘 모르겠어요 / 직접 말할게요 */
export const FIXED_QUICK_ANSWERS: Readonly<Record<Language, readonly string[]>> =
  data.fixed_quick_answers;

export function slotMeta(key: SlotKey): SlotMeta {
  const m = SLOT_META.find((s) => s.key === key);
  if (!m) throw new Error(`unknown slot ${key}`);
  return m;
}
