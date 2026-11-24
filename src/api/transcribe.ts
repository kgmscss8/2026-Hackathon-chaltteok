import { ApiFailure } from '@lib/errors';
import { ApiError, TranscribeResponse, type Language } from '@lib/schema';

export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
export const TRANSCRIBE_TIMEOUT_MS = 20_000;

/** 녹음 형식 → 파일 확장자 (서버·OpenAI가 형식을 알아보게) */
export function audioExtension(type: string): string {
  if (/mp4|m4a|aac/i.test(type)) return 'mp4';
  if (/ogg/i.test(type)) return 'ogg';
  if (/mpeg|mp3/i.test(type)) return 'mp3';
  if (/wav/i.test(type)) return 'wav';
  return 'webm';
}

/**
 * 녹음 파일을 글자로 바꾼다. hint를 주지 않으면 말한 언어를 그대로 받아 적는다.
 * 실패하면 ApiFailure를 던진다(네트워크 오류·20초 초과는 AI_UNAVAILABLE).
 */
export async function transcribe(
  blob: Blob,
  hint?: Language,
  fetchImpl: typeof fetch = fetch,
): Promise<{ text: string; language: Language }> {
  if (blob.size === 0 || blob.size > MAX_AUDIO_BYTES) throw ApiFailure.of('BAD_REQUEST');

  const form = new FormData();
  form.append('audio', blob, `recording.${audioExtension(blob.type)}`);
  if (hint) form.append('language', hint);

  let res: Response;
  try {
    res = await fetchImpl('/api/transcribe', {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(TRANSCRIBE_TIMEOUT_MS),
    });
  } catch {
    throw ApiFailure.of('AI_UNAVAILABLE');
  }

  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = ApiError.safeParse(json);
    throw err.success
      ? new ApiFailure(err.data)
      : ApiFailure.of(res.status === 429 ? 'RATE_LIMITED' : 'AI_UNAVAILABLE');
  }
  const body = TranscribeResponse.safeParse(json);
  if (!body.success) throw ApiFailure.of('BAD_JSON');
  return body.data;
}
