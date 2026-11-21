import { z } from 'zod';
import contactsData from '../data/contacts.json' with { type: 'json' };
import { maskPII } from './masking.js';
import { getOpenAI, MODELS } from './openai.js';
import { Contact, ContactTag, type SummaryCard } from './schema.js';

type Tag = z.infer<typeof ContactTag>;

/** 확인된 연락처 데이터. 응답에 나가는 연락처는 오직 여기서만 고른다. */
export const CONTACTS: readonly Contact[] = z.array(Contact).parse(contactsData);

export const FALLBACK_TAGS: Tag[] = ['general'];

const SYSTEM_PROMPT = `너는 민원 요약 카드를 보고 "참고 연락처 태그"만 고르는 분류기다.
- 고를 수 있는 태그: welfare(복지·연금·수당 관련), resident(전입·주민등록·증명서 등 주민센터 민원), general(그 밖의 정부 민원 안내).
- 관련 있을 수 있는 태그를 1~3개 고른다. 확실하지 않으면 general을 넣는다.
- 태그는 민원 종류를 확정하는 값이 아니다. 자격·결과·준비물을 판단하지 않는다.
- 기관 이름이나 전화번호를 만들어 내지 않는다. 태그 목록 밖의 값을 쓰지 않는다.`;

const TAG_JSON_SCHEMA = {
  type: 'object',
  properties: {
    tags: { type: 'array', items: { type: 'string', enum: ContactTag.options } },
  },
  required: ['tags'],
  additionalProperties: false,
} as const;

/** 카드 내용을 한 덩어리 텍스트로 만들고 개인정보를 가린다. */
export function cardToText(card: SummaryCard): string {
  return maskPII(
    [
      `누구의 일: ${card.who}`,
      `현재 상황: ${card.situation}`,
      `요청: ${card.request}`,
      `미확인: ${card.unknowns.join(', ') || '없음'}`,
      `물어볼 것: ${card.to_ask.join(', ') || '없음'}`,
    ].join('\n'),
  );
}

/** LLM 응답(또는 아무 값)에서 정해진 태그만 남긴다. 하나도 없으면 general. */
export function sanitizeTags(raw: unknown): Tag[] {
  const list = Array.isArray(raw) ? raw : [];
  const tags = [...new Set(list)].filter((t): t is Tag => ContactTag.safeParse(t).success);
  return tags.length > 0 ? tags : [...FALLBACK_TAGS];
}

/** 태그에 해당하는 연락처를 데이터에서 고른다(데이터 순서 유지). */
export function selectContacts(
  tags: readonly Tag[],
  data: readonly Contact[] = CONTACTS,
): Contact[] {
  return data.filter((c) => c.tags.some((t) => tags.includes(t)));
}

export type TagCompleter = (cardText: string) => Promise<unknown>;

/** 기본 LLM 호출: 구조화 출력으로 { tags } 만 받는다. */
export const openAITagCompleter: TagCompleter = async (cardText) => {
  const completion = await getOpenAI().chat.completions.create({
    model: MODELS.chat,
    temperature: 0,
    max_completion_tokens: 50,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: cardText },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'contact_tags', strict: true, schema: TAG_JSON_SCHEMA },
    },
  });
  const content = completion.choices[0]?.message?.content ?? '{}';
  return (JSON.parse(content) as { tags?: unknown }).tags;
};

/** 카드에 맞는 태그를 고른다. LLM이 실패해도 던지지 않고 general로 대체한다. */
export async function pickTags(
  card: SummaryCard,
  complete: TagCompleter = openAITagCompleter,
): Promise<Tag[]> {
  try {
    return sanitizeTags(await complete(cardToText(card)));
  } catch {
    return [...FALLBACK_TAGS];
  }
}
