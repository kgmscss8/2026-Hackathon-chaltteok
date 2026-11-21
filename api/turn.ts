// POST /api/turn (파트 C) — TurnRequest → TurnResult
// 순서: 요청 검증 → 사용자 발화 maskPII → (1) 정리(구조화 출력) → (2) 원문 검증(문자열 + LLM)
//       → 위기(LLM OR 키워드) → 다음 질문 결정(코드) → TurnResult 검증 → 응답
// 서버는 상태를 저장하지 않고, 민원 내용을 로그에 남기지 않는다.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { detectCrisisKeywords } from '../lib/crisis.js';
import { ApiFailure, assertBodySize, fromOpenAIError, sendError } from '../lib/errors.js';
import { maskPII } from '../lib/masking.js';
import { getOpenAI, MODELS } from '../lib/openai.js';
import {
  buildTurnSystemPrompt,
  buildTurnUserPrompt,
  buildVerifyUserPrompt,
  FIXED_QUICK_ANSWERS,
  MAX_QUESTIONS,
  SLOT_META,
  slotForQuestion,
  TURN_JSON_SCHEMA,
  VERIFY_JSON_SCHEMA,
  VERIFY_SYSTEM_PROMPT,
} from '../lib/prompts.js';
import {
  SLOT_KEYS,
  SlotValue,
  TurnRequest,
  TurnResult,
  type SlotKey,
  type Slots,
} from '../lib/schema.js';
import {
  changedSlotKeys,
  dropQuestionEchoes,
  normalizeForMatch,
  verifyEvidenceByLlm,
  verifyEvidenceByText,
  type FaithfulnessJudge,
} from '../lib/verify.js';

const MAX_BODY_BYTES = 256_000; // history 30개 × 2000자(한글 3바이트) 여유
const QUESTIONS_TO_ASK_MAX = 3;

/** 정리 호출 결과(LLM이 돌려주는 모양) */
const LlmTurn = z.object({
  slots: z.object(
    Object.fromEntries(SLOT_KEYS.map((k) => [k, SlotValue])) as Record<SlotKey, typeof SlotValue>,
  ),
  questions_to_ask: z.array(z.object({ question: z.string(), evidence: z.string() })),
  worth_asking: z.array(z.enum(SLOT_KEYS)),
  crisis: z.boolean(),
});
type LlmTurn = z.infer<typeof LlmTurn>;

const LlmVerify = z.object({
  results: z.array(z.object({ key: z.enum(SLOT_KEYS), faithful: z.boolean() })),
});

/** LLM 호출: system·user 프롬프트와 JSON 스키마를 받아 응답 문자열(JSON)을 돌려준다. */
export type JsonCompleter = (
  system: string,
  user: string,
  schemaName: string,
  schema: object,
) => Promise<string>;

export const openAICompleter: JsonCompleter = async (system, user, schemaName, schema) => {
  const completion = await getOpenAI().chat.completions.create({
    model: MODELS.chat,
    temperature: 0,
    max_completion_tokens: 1200,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: schemaName, strict: true, schema: schema as Record<string, unknown> },
    },
  });
  return completion.choices[0]?.message?.content ?? '';
};

/** 구조화 출력 → zod 검증. 실패하면 1회 다시 요청하고, 그래도 실패면 BAD_JSON. OpenAI 오류는 그대로 던진다. */
async function completeJson<T>(
  complete: JsonCompleter,
  parser: z.ZodType<T>,
  system: string,
  user: string,
  schemaName: string,
  schema: object,
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await complete(system, user, schemaName, schema);
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      continue;
    }
    const parsed = parser.safeParse(json);
    if (parsed.success) return parsed.data;
  }
  throw ApiFailure.of('BAD_JSON');
}

function judgeWith(complete: JsonCompleter): FaithfulnessJudge {
  return async (items) =>
    (
      await completeJson(
        complete,
        LlmVerify,
        VERIFY_SYSTEM_PROMPT,
        buildVerifyUserPrompt(items),
        'faithfulness',
        VERIFY_JSON_SCHEMA,
      )
    ).results;
}

function hasValue(s: { value: string | null }): boolean {
  return typeof s.value === 'string' && s.value.trim().length > 0;
}

/** 이미 물은 슬롯: history의 찰떡 질문 문구(slots.json 그대로)로 판단 */
export function askedSlots(history: TurnRequest['history']): Set<SlotKey> {
  const asked = new Set<SlotKey>();
  for (const m of history) {
    if (m.role !== 'assistant') continue;
    const k = slotForQuestion(m.text);
    if (k) asked.add(k);
  }
  return asked;
}

/**
 * 다음에 물을 슬롯: 비어 있고, 아직 안 물었고, (누구의 일·용건이거나 LLM이 물을 가치가 있다고 본) 슬롯 중 우선순위 첫 번째.
 * 사용자가 이미 궁금한 점을 말했으면(물어볼 것이 있으면) "궁금한 점"은 다시 묻지 않는다.
 */
export function pickNextSlot(
  slots: Slots,
  asked: Set<SlotKey>,
  worthAsking: readonly SlotKey[],
  hasQuestions = false,
): SlotKey | null {
  for (const m of SLOT_META) {
    if (hasValue(slots[m.key]) || asked.has(m.key)) continue;
    if (m.key === 'question' && hasQuestions) continue;
    if (m.key === 'whose_matter' || m.key === 'purpose' || worthAsking.includes(m.key)) {
      return m.key;
    }
  }
  return null;
}

/**
 * 물어볼 것: 근거(evidence)가 사용자 발화에 그대로 있는 것만 남긴다.
 * 찰떡의 되묻기 문장이나 LLM이 지어낸 질문은 근거가 없어 빠진다. 중복 제거, 최대 3개.
 */
export function cleanQuestions(
  list: { question: string; evidence: string }[],
  userTexts: string[],
): string[] {
  const haystacks = userTexts.map(normalizeForMatch);
  const out: string[] = [];
  for (const { question, evidence } of list) {
    const q = question.replace(/\s+/g, ' ').trim();
    const ev = normalizeForMatch(evidence);
    if (!q || !ev || !haystacks.some((h) => h.includes(ev))) continue;
    if (slotForQuestion(q) || out.includes(q)) continue;
    out.push(q);
    if (out.length === QUESTIONS_TO_ASK_MAX) break;
  }
  return out;
}

/** 요청 하나를 처리한다(테스트에서 LLM을 바꿔 끼울 수 있도록 분리). */
export async function processTurn(
  req: TurnRequest,
  complete: JsonCompleter = openAICompleter,
): Promise<TurnResult> {
  const history = req.history.map((m) => (m.role === 'user' ? { ...m, text: maskPII(m.text) } : m));
  const userTexts = history.filter((m) => m.role === 'user').map((m) => m.text);
  if (userTexts.length === 0) throw ApiFailure.of('BAD_REQUEST');
  const lastUser = userTexts[userTexts.length - 1];
  const edit = req.edit_slot;

  // (1) 정리
  const llm: LlmTurn = await completeJson(
    complete,
    LlmTurn,
    buildTurnSystemPrompt(edit),
    buildTurnUserPrompt({
      history,
      slots: req.slots,
      language: req.language,
      editSlot: edit,
    }),
    'turn',
    TURN_JSON_SCHEMA,
  );

  // 슬롯 합치기: 부분 수정이면 그 슬롯만, 아니면 새 값이 있는 슬롯만 바꾼다
  const merged: Slots = { ...req.slots };
  for (const k of SLOT_KEYS) {
    if (edit ? k === edit : hasValue(llm.slots[k])) merged[k] = llm.slots[k];
  }
  // 부분 수정은 마지막 발화로만 다시 채운다
  if (edit) {
    merged[edit] = verifyEvidenceByText(merged, [lastUser])[edit];
  }

  // (2) 검증: 문자열 대조(전체) → LLM 판정(이번에 바뀐 슬롯만)
  const byText = verifyEvidenceByText(merged, userTexts);
  const judged = await verifyEvidenceByLlm(
    byText,
    judgeWith(complete),
    changedSlotKeys(req.slots, byText),
  );

  const crisis = llm.crisis || detectCrisisKeywords(lastUser);
  const questions = cleanQuestions(llm.questions_to_ask, userTexts);

  // 묻는 말을 용건·원하는 것·날짜에 또 적은 경우 지운다(근거가 원문에 있는 질문만 기준으로)
  const haystacks = userTexts.map(normalizeForMatch);
  const questionEvidences = [
    judged.question.evidence,
    ...llm.questions_to_ask.map((q) => q.evidence),
  ].filter((ev): ev is string => !!ev && haystacks.some((h) => h.includes(normalizeForMatch(ev))));
  const verified = dropQuestionEchoes(judged, questionEvidences);
  const fixed = [...FIXED_QUICK_ANSWERS[req.language]];

  // 다음 질문은 코드로 정한다(이미 값이 있거나 이미 물은 슬롯은 묻지 않음, 최대 3번)
  const next =
    edit || req.ask_count >= MAX_QUESTIONS
      ? null
      : pickNextSlot(verified, askedSlots(history), llm.worth_asking, questions.length > 0);

  const result: TurnResult = next
    ? {
        slots: verified,
        questions_to_ask: questions,
        next_question: SLOT_META.find((m) => m.key === next)!.questions[req.language],
        quick_answers: [
          ...SLOT_META.find((m) => m.key === next)!.quick_answers[req.language],
          ...fixed,
        ],
        ask_count: req.ask_count + 1,
        done: false,
        crisis,
      }
    : {
        slots: verified,
        questions_to_ask: questions,
        next_question: null,
        quick_answers: fixed,
        ask_count: req.ask_count,
        done: true,
        crisis,
      };
  return TurnResult.parse(result);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 'BAD_REQUEST');
  }
  try {
    assertBodySize(req, MAX_BODY_BYTES);
    let raw: unknown = req.body;
    if (typeof raw === 'string') raw = JSON.parse(raw);
    const parsed = TurnRequest.safeParse(raw);
    if (!parsed.success) return sendError(res, 'BAD_REQUEST');

    const body = await processTurn(parsed.data);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(body);
  } catch (err) {
    if (err instanceof SyntaxError) return sendError(res, 'BAD_REQUEST');
    return sendError(res, fromOpenAIError(err));
  }
}
