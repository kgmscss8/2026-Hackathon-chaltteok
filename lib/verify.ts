// 원문 근거 검증 (파트 C, F4). 근거 없는 슬롯은 value·evidence를 null(미확인)로 만든다.
// 1차: 코드로 문자열 대조 — evidence가 사용자 발화(마스킹 후)에 실제로 들어 있는가
// 2차: LLM 판정 — value가 evidence에서 벗어나는 내용을 담고 있는가
import { SLOT_KEYS, type SlotKey, type Slots } from './schema.js';

const EMPTY = () => ({ value: null, evidence: null });

/** 대조용 정규화: 유니코드 NFC, 소문자, 공백·문장부호·기호 제거 */
export function normalizeForMatch(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '');
}

function filled(v: string | null | undefined): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

/** 1차 검증: evidence가 사용자 발화 어느 하나에 그대로 들어 있어야 한다. */
export function verifyEvidenceByText(slots: Slots, userTexts: string[]): Slots {
  const haystacks = userTexts.map(normalizeForMatch).filter(Boolean);
  const out = { ...slots };
  for (const k of SLOT_KEYS) {
    const { value, evidence } = slots[k];
    if (!filled(value) && !filled(evidence)) {
      out[k] = EMPTY();
      continue;
    }
    const needle = filled(evidence) ? normalizeForMatch(evidence) : '';
    const ok = filled(value) && needle.length > 0 && haystacks.some((h) => h.includes(needle));
    out[k] = ok ? { value: value!.trim(), evidence: evidence!.trim() } : EMPTY();
  }
  return out;
}

export type FaithfulnessJudge = (
  items: { key: SlotKey; value: string; evidence: string }[],
) => Promise<{ key: SlotKey; faithful: boolean }[]>;

/**
 * 2차 검증: LLM이 faithful=false로 판정했거나 판정을 빠뜨린 슬롯은 null로.
 * onlyKeys가 주어지면 그 슬롯만 판정한다(이전 차례에 이미 검증된 슬롯은 다시 묻지 않음).
 */
export async function verifyEvidenceByLlm(
  slots: Slots,
  judge: FaithfulnessJudge,
  onlyKeys: readonly SlotKey[] = SLOT_KEYS,
): Promise<Slots> {
  const items = onlyKeys
    .filter((k) => filled(slots[k].value) && filled(slots[k].evidence))
    .map((k) => ({ key: k, value: slots[k].value!, evidence: slots[k].evidence! }));
  if (items.length === 0) return slots;

  const results = await judge(items);
  const faithful = new Set(results.filter((r) => r.faithful).map((r) => r.key));
  const out = { ...slots };
  for (const i of items) if (!faithful.has(i.key)) out[i.key] = EMPTY();
  return out;
}

/** 이번 차례에 새로 생기거나 바뀐 슬롯 키 */
export function changedSlotKeys(before: Slots, after: Slots): SlotKey[] {
  return SLOT_KEYS.filter(
    (k) => before[k].value !== after[k].value || before[k].evidence !== after[k].evidence,
  );
}
