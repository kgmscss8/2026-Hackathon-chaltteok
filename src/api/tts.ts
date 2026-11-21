import { Language } from '@lib/schema';
import { ApiFailure, MESSAGE_KO } from '@lib/errors';

export async function fetchTtsAudio(text: string, language: Language): Promise<Blob> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 500), language }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new ApiFailure({
        code: res.status === 429 ? 'RATE_LIMITED' : 'AI_UNAVAILABLE',
        message_ko: res.status === 429 ? MESSAGE_KO.RATE_LIMITED : MESSAGE_KO.AI_UNAVAILABLE,
      });
    }

    return await res.blob();
  } catch (err) {
    if (err instanceof ApiFailure) throw err;
    throw new ApiFailure({
      code: 'AI_UNAVAILABLE',
      message_ko: MESSAGE_KO.AI_UNAVAILABLE,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}
