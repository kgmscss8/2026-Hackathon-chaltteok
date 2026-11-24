import { ApiFailure } from '@lib/errors';
import { ApiError, type Language } from '@lib/schema';

export const TTS_TIMEOUT_MS = 15_000;
export const TTS_MAX_CHARS = 500;

/** 문장을 읽은 mp3를 받는다. 실패하면 ApiFailure를 던진다. */
export async function fetchTtsAudio(
  text: string,
  language: Language,
  fetchImpl: typeof fetch = fetch,
): Promise<Blob> {
  let res: Response;
  try {
    res = await fetchImpl('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim().slice(0, TTS_MAX_CHARS), language }),
      signal: AbortSignal.timeout(TTS_TIMEOUT_MS),
    });
  } catch {
    throw ApiFailure.of('AI_UNAVAILABLE');
  }

  if (!res.ok) {
    const err = ApiError.safeParse(await res.json().catch(() => null));
    throw err.success
      ? new ApiFailure(err.data)
      : ApiFailure.of(res.status === 429 ? 'RATE_LIMITED' : 'AI_UNAVAILABLE');
  }
  const audio = await res.blob().catch(() => null);
  if (!audio || audio.size === 0) throw ApiFailure.of('AI_UNAVAILABLE');
  return audio;
}
