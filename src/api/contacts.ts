import { ApiFailure } from '@lib/errors';
import { ApiError, ContactsResponse, type SummaryCard } from '@lib/schema';

const TIMEOUT_MS = 15_000;

/**
 * 확인된 최종 요약 카드로 참고 연락처를 받는다.
 * 실패하면 ApiFailure를 던진다(네트워크·시간 초과는 AI_UNAVAILABLE).
 */
export async function fetchContacts(
  card: SummaryCard,
  fetchImpl: typeof fetch = fetch,
): Promise<ContactsResponse> {
  let res: Response;
  try {
    res = await fetchImpl('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw ApiFailure.of('AI_UNAVAILABLE');
  }

  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = ApiError.safeParse(json);
    throw err.success ? new ApiFailure(err.data) : ApiFailure.of('AI_UNAVAILABLE');
  }
  const body = ContactsResponse.safeParse(json);
  if (!body.success) throw ApiFailure.of('BAD_JSON');
  return body.data;
}
