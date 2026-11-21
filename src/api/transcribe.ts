import { Language, TranscribeResponse } from '@lib/schema';
import { ApiFailure, MESSAGE_KO } from '@lib/errors';

const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const TIMEOUT_MS = 20_000;

export async function transcribe(
  blob: Blob,
  hint?: Language
): Promise<{ text: string; language: Language }> {
  if (blob.size === 0 || blob.size > MAX_AUDIO_BYTES) {
    throw new ApiFailure({
      code: 'BAD_REQUEST',
      message_ko: MESSAGE_KO.BAD_REQUEST,
    });
  }

  const ext = blob.type.includes('mp4')
    ? 'mp4'
    : blob.type.includes('ogg')
      ? 'ogg'
      : 'webm';

  const formData = new FormData();
  formData.append('audio', blob, `recording.${ext}`);
  if (hint) {
    formData.append('language', hint);
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      let errorBody: unknown = null;
      try {
        errorBody = await res.json();
      } catch {
        // ignore
      }
      if (
        errorBody &&
        typeof errorBody === 'object' &&
        'code' in errorBody &&
        'message_ko' in errorBody
      ) {
        throw new ApiFailure(
          errorBody as {
            code: 'AI_UNAVAILABLE' | 'RATE_LIMITED' | 'BAD_JSON' | 'BAD_REQUEST';
            message_ko: string;
          }
        );
      }
      throw new ApiFailure({
        code: res.status === 429 ? 'RATE_LIMITED' : 'AI_UNAVAILABLE',
        message_ko: res.status === 429 ? MESSAGE_KO.RATE_LIMITED : MESSAGE_KO.AI_UNAVAILABLE,
      });
    }

    const data = await res.json();
    const parsed = TranscribeResponse.safeParse(data);
    if (!parsed.success) {
      throw new ApiFailure({
        code: 'BAD_JSON',
        message_ko: MESSAGE_KO.BAD_JSON,
      });
    }

    return parsed.data;
  } catch (err) {
    if (err instanceof ApiFailure) {
      throw err;
    }
    throw new ApiFailure({
      code: 'AI_UNAVAILABLE',
      message_ko: MESSAGE_KO.AI_UNAVAILABLE,
    });
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}
