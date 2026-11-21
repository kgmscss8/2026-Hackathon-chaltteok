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

/**
 * 되묻기 질문 문구로 어떤 슬롯을 물었는지 찾는다(언어 무관). 질문은 항상 slots.json 문구를 그대로 쓰므로
 * history의 assistant 메시지만 보고 "이미 물은 슬롯"을 알 수 있다.
 */
export function slotForQuestion(text: string): SlotKey | null {
  const t = text.trim();
  for (const m of SLOT_META) {
    if (Object.values(m.questions).some((q) => q === t)) return m.key;
  }
  return null;
}

/** 모든 언어의 고정 빠른 답(해당 없어요 등). 사용자가 이걸 골랐는지 판단할 때 쓴다. */
export function isFixedQuickAnswer(text: string): boolean {
  const t = text.trim();
  return Object.values(FIXED_QUICK_ANSWERS).some((list) => list.includes(t));
}

const LANGUAGE_NAME: Record<Language, string> = { ko: '한국어', en: '영어', vi: '베트남어' };

// ── (1) 정리 호출 ─────────────────────────────────────────────

const RULES = `너는 주민센터·구청 방문 전 민원인의 말을 담당자용으로 "받아 적는" 대필가다. 판단하지 않고 정리만 한다.
절대 하지 않는 것:
- 민원 종류 판단·이름 붙이기, 자격 판단, 처리 결과 예측, 준비물·서류 안내, 법률 해석.
- 기관 이름·전화번호·연락처 만들기.
- 사용자가 말하지 않은 사실 추가(추측, 일반 상식, 법정 기한 등 포함).
- 사용자의 질문에 답하기. 질문은 "물어볼 것"으로만 적는다.
슬롯 채우기 규칙:
- value는 항상 한국어로, 사용자가 말한 범위 안에서 짧게(20자 안팎) 적는다. 외국어로 말했으면 그 뜻만 한국어로 옮긴다.
- evidence는 사용자 발화에서 글자 그대로 복사한 부분 문자열이다. 고치거나 요약하거나 번역하지 않는다.
- 근거가 없으면 value와 evidence를 둘 다 null로 둔다. 애매하면 null이 맞다.
- "해당 없어요", "잘 모르겠어요" 같은 답은 근거가 아니다. 그 슬롯은 null로 둔다.
- whose_matter는 본인이면 "본인", 대신이면 "어머니(본인 아님)"처럼 관계를 적는다.`;

const SLOT_GUIDE = SLOT_META.map((m) => `- ${m.key} (${m.name_ko}): ${m.description_ko}`).join(
  '\n',
);

export function buildTurnSystemPrompt(editSlot?: SlotKey): string {
  const task = editSlot
    ? `이번 요청은 부분 수정이다. 마지막 사용자 발화만 보고 ${editSlot} 슬롯 하나만 다시 채운다. 다른 슬롯은 입력값을 그대로 돌려준다.`
    : `대화 전체(사용자 발화)를 보고 5개 슬롯을 채운다. 이미 채워진 슬롯은 새 발화가 더 정확할 때만 바꾼다.`;
  return `${RULES}

슬롯:
${SLOT_GUIDE}

${task}

함께 돌려줄 것:
- questions_to_ask: 사용자가 담당자에게 묻고 싶어 한 것(한국어, 사용자가 실제로 궁금해한 것만, 최대 3개). 없으면 빈 배열.
- worth_asking: 아직 비어 있는 슬롯 중 되물으면 담당자에게 도움이 될 슬롯 키 목록. 대화 흐름상 의미 없는 슬롯은 넣지 않는다.
- crisis: 마지막 사용자 발화에 생명·안전 위협(자살·자해 생각, 폭력·학대)이나 생계 위기(굶주림, 당장 쫓겨남·잘 곳 없음)가 드러나면 true. 일상적 과장 표현("죽겠다", "미치겠다")은 false.`;
}

export interface PromptMessage {
  role: 'user' | 'assistant';
  text: string;
}

export function buildTurnUserPrompt(input: {
  history: PromptMessage[];
  slots: unknown;
  language: Language;
  editSlot?: SlotKey;
}): string {
  const lines = input.history.map((m) =>
    m.role === 'user' ? `사용자: ${m.text}` : `찰떡(질문): ${m.text}`,
  );
  return [
    `대화 언어: ${LANGUAGE_NAME[input.language]}`,
    input.editSlot ? `수정할 슬롯: ${input.editSlot}` : null,
    `현재 슬롯(JSON): ${JSON.stringify(input.slots)}`,
    '대화:',
    ...lines,
  ]
    .filter((l): l is string => l !== null)
    .join('\n');
}

const SLOT_VALUE_SCHEMA = {
  type: 'object',
  properties: {
    value: { type: ['string', 'null'] },
    evidence: { type: ['string', 'null'] },
  },
  required: ['value', 'evidence'],
  additionalProperties: false,
} as const;

const SLOT_KEYS_IN_ORDER = SLOT_META.map((m) => m.key);

/** OpenAI 구조화 출력용 JSON 스키마(strict) */
export const TURN_JSON_SCHEMA = {
  type: 'object',
  properties: {
    slots: {
      type: 'object',
      properties: Object.fromEntries(SLOT_KEYS_IN_ORDER.map((k) => [k, SLOT_VALUE_SCHEMA])),
      required: SLOT_KEYS_IN_ORDER,
      additionalProperties: false,
    },
    questions_to_ask: { type: 'array', items: { type: 'string' } },
    worth_asking: { type: 'array', items: { type: 'string', enum: SLOT_KEYS_IN_ORDER } },
    crisis: { type: 'boolean' },
  },
  required: ['slots', 'questions_to_ask', 'worth_asking', 'crisis'],
  additionalProperties: false,
} as const;

// ── (2) 검증 호출 ─────────────────────────────────────────────

export const VERIFY_SYSTEM_PROMPT = `너는 받아 적기 검수자다. 각 항목의 value가 evidence(사용자 원문)에서 벗어나는지만 판정한다.
- evidence에 없는 사실, 추측, 판단(자격·결과·민원 종류 이름 붙이기), 준비물·기한 같은 일반 지식이 value에 들어 있으면 faithful=false.
- evidence를 한국어로 옮기거나 짧게 줄인 것은 faithful=true.
- 관계 표현("엄마" → "어머니(본인 아님)")은 faithful=true.
다른 설명 없이 항목마다 판정만 돌려준다.`;

export function buildVerifyUserPrompt(items: { key: SlotKey; value: string; evidence: string }[]) {
  return items.map((i) => `- ${i.key}\n  value: ${i.value}\n  evidence: ${i.evidence}`).join('\n');
}

export const VERIFY_JSON_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string', enum: SLOT_KEYS_IN_ORDER },
          faithful: { type: 'boolean' },
        },
        required: ['key', 'faithful'],
        additionalProperties: false,
      },
    },
  },
  required: ['results'],
  additionalProperties: false,
} as const;
