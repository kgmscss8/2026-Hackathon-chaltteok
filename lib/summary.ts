// 담당자용 요약 카드 조합 (파트 C). LLM 없이 슬롯 값으로만 만든다(순수 함수).
// 카드는 항상 한국어, 화면 5줄 이내가 되도록 줄마다 길이를 제한한다.
import type { Language, Slots, SummaryCard } from './schema.js';
import { SLOT_META } from './prompts.js';

export const LINE_MAX = 40;
export const TO_ASK_MAX = 3;
export const UNKNOWN = '미확인';

/** 40자를 넘으면 말줄임(…) */
export function clip(text: string, max = LINE_MAX): string {
  const t = text.replace(/\s+/g, ' ').trim();
  const chars = [...t];
  return chars.length <= max ? t : chars.slice(0, max - 1).join('') + '…';
}

function val(slots: Slots, key: keyof Slots): string | null {
  const v = slots[key]?.value;
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/** ① 누구의 일 예: "어머니(본인 아님)의 기초연금 신청 건" */
function whoLine(whose: string | null, purpose: string | null): string {
  if (whose && purpose) return `${whose}의 ${purpose} 건`;
  if (whose) return `${whose}의 일 (용건 ${UNKNOWN})`;
  if (purpose) return `${purpose} 건 (누구의 일인지 ${UNKNOWN})`;
  return UNKNOWN;
}

export function buildSummaryCard(
  slots: Slots,
  questionsToAsk: string[],
  spoken: Language,
): SummaryCard {
  const whose = val(slots, 'whose_matter');
  const purpose = val(slots, 'purpose');
  const desired = val(slots, 'desired');
  const date = val(slots, 'date');
  const question = val(slots, 'question');

  // ⑤ 물어볼 것: 창구에서 물어볼 것 + 사용자가 궁금해한 점(중복 제거, 최대 3개)
  const seen = new Set<string>();
  const toAsk: string[] = [];
  for (const q of [...questionsToAsk, ...(question ? [question] : [])]) {
    const line = clip(q);
    const key = line.replace(/[\s?.!]/g, '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    toAsk.push(line);
    if (toAsk.length === TO_ASK_MAX) break;
  }

  return {
    who: clip(whoLine(whose, purpose)),
    situation: clip(date ? `관련 날짜·기한: ${date}` : `관련 날짜·기한 ${UNKNOWN}`),
    request: clip(desired ?? UNKNOWN),
    unknowns: SLOT_META.filter((m) => val(slots, m.key) === null).map((m) => m.name_ko),
    to_ask: toAsk,
    spoken_language: spoken,
  };
}

/** 카드를 화면·QR용 5줄 텍스트로 (D가 사용 가능) */
export function summaryCardLines(card: SummaryCard): string[] {
  return [
    `① ${card.who}`,
    `② ${card.situation}`,
    `③ ${card.request}`,
    `④ 미확인: ${card.unknowns.length ? card.unknowns.join(', ') : '없음'}`,
    `⑤ 물어볼 것: ${card.to_ask.length ? card.to_ask.join(' / ') : '없음'}`,
  ];
}
