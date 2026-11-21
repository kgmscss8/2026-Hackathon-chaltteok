import { ApiFailure } from '@lib/errors';
import { ApiError, TurnResult, type TurnRequest } from '@lib/schema';

export const TURN_TIMEOUT_MS = 25_000;

/**
 * 대화 한 차례를 서버에 보내 정리·되묻기 결과를 받는다.
 * 실패하면 ApiFailure를 던진다(네트워크 오류·25초 초과는 AI_UNAVAILABLE).
 */
export async function runTurn(
  req: TurnRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<TurnResult> {
  let res: Response;
  try {
    res = await fetchImpl('/api/turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(TURN_TIMEOUT_MS),
    });
  } catch {
    throw ApiFailure.of('AI_UNAVAILABLE');
  }

  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = ApiError.safeParse(json);
    throw err.success ? new ApiFailure(err.data) : ApiFailure.of('AI_UNAVAILABLE');
  }
  const body = TurnResult.safeParse(json);
  if (!body.success) throw ApiFailure.of('BAD_JSON');
  return body.data;
}
