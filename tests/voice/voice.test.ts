import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiFailure } from '../../lib/errors';
import { transcribe } from '../../src/api/transcribe';
import { fetchTtsAudio } from '../../src/api/tts';
import { stopSpeaking, unlockAudio } from '../../src/voice/speak';

describe('Part B Voice APIs & Helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('transcribe: 빈 Blob(0바이트)이나 4MB 초과 파일은 BAD_REQUEST ApiFailure를 던진다', async () => {
    const emptyBlob = new Blob([], { type: 'audio/webm' });
    await expect(transcribe(emptyBlob)).rejects.toThrow(ApiFailure);

    const oversized = new Blob([new Uint8Array(4 * 1024 * 1024 + 10)], {
      type: 'audio/webm',
    });
    await expect(transcribe(oversized)).rejects.toMatchObject({
      error: { code: 'BAD_REQUEST' },
    });
  });

  it('transcribe: 서버가 정상 응답을 주면 text와 language를 반환한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ text: '기초연금 신청하려고요', language: 'ko' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const validBlob = new Blob(['fake-audio-data'], { type: 'audio/webm' });
    const result = await transcribe(validBlob, 'ko');
    expect(result).toEqual({ text: '기초연금 신청하려고요', language: 'ko' });
  });

  it('transcribe: 네트워크 오류 시 AI_UNAVAILABLE로 변환한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network down'));

    const validBlob = new Blob(['fake-audio-data'], { type: 'audio/webm' });
    await expect(transcribe(validBlob)).rejects.toMatchObject({
      error: { code: 'AI_UNAVAILABLE' },
    });
  });

  it('fetchTtsAudio: 429 응답 시 RATE_LIMITED ApiFailure를 던진다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(null, { status: 429 })
    );

    await expect(fetchTtsAudio('안녕하세요', 'ko')).rejects.toMatchObject({
      error: { code: 'RATE_LIMITED' },
    });
  });

  it('unlockAudio와 stopSpeaking은 브라우저 환경이 아니어도 안전하게 실행된다', () => {
    expect(() => unlockAudio()).not.toThrow();
    expect(() => stopSpeaking()).not.toThrow();
  });
});
