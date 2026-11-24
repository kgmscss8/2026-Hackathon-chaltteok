import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ApiFailure, MESSAGE_KO } from '../../lib/errors.js';
import { MASK } from '../../lib/masking.js';

// 서버 함수가 부르는 OpenAI 클라이언트를 가짜로 바꾼다
const openai = {
  transcribe: vi.fn(),
  speech: vi.fn(),
};
vi.mock('../../lib/openai.js', () => ({
  MODELS: { transcribe: 'stt-model', chat: 'chat-model', tts: 'tts-model' },
  getOpenAI: () => ({
    audio: {
      transcriptions: { create: openai.transcribe },
      speech: { create: openai.speech },
    },
  }),
}));

const { default: transcribeHandler, detectLanguage } = await import('../../api/transcribe.js');
const { default: ttsHandler, TTS_INSTRUCTIONS } = await import('../../api/tts.js');
const { transcribe, audioExtension } = await import('../../src/api/transcribe.js');
const { fetchTtsAudio } = await import('../../src/api/tts.js');
const { pickMimeType, mediaErrorCode, RECORDER_ERROR_KO } =
  await import('../../src/voice/useRecorder.js');
const speech = await import('../../src/voice/speak.js');

function fakeRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
    send(body: unknown) {
      res.body = body;
      return res;
    },
    setHeader(k: string, v: string) {
      res.headers[k.toLowerCase()] = v;
      return res;
    },
  };
  return res;
}

/** FormData를 실제 multipart 바이트로 만들어 Node 요청처럼 흘려보낸다 */
async function multipartReq(fd: FormData, method = 'POST'): Promise<VercelRequest> {
  const r = new Response(fd);
  const body = Buffer.from(await r.arrayBuffer());
  return Object.assign(
    (async function* () {
      yield body;
    })(),
    {
      method,
      headers: {
        'content-type': r.headers.get('content-type')!,
        'content-length': String(body.length),
      },
    },
  ) as unknown as VercelRequest;
}

function audioForm(type = 'audio/webm', bytes = 2000, extra: Record<string, string> = {}) {
  const fd = new FormData();
  fd.append(
    'audio',
    new Blob([new Uint8Array(bytes)], { type }),
    `recording.${audioExtension(type)}`,
  );
  for (const [k, v] of Object.entries(extra)) fd.append(k, v);
  return fd;
}

beforeEach(() => {
  openai.transcribe.mockReset();
  openai.speech.mockReset();
});

describe('detectLanguage', () => {
  it.each([
    ['엄마 기초연금 신청하려는데요', 'ko'],
    ['My mother wants to apply for a pension', 'en'],
    ['Tôi muốn đăng ký tạm trú cho mẹ tôi', 'vi'],
    ['Toi muon dang ky', 'en'],
    ['123 456', 'ko'],
    ['전입신고 moving-in', 'ko'],
  ])('%s → %s', (text, lang) => {
    expect(detectLanguage(text)).toBe(lang);
  });
});

describe('POST /api/transcribe', () => {
  it('녹음을 받아 글자와 감지한 언어를 돌려준다', async () => {
    openai.transcribe.mockResolvedValue({ text: ' Tôi muốn đăng ký tạm trú ' });
    const res = fakeRes();
    await transcribeHandler(await multipartReq(audioForm()), res as unknown as VercelResponse);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ text: 'Tôi muốn đăng ký tạm trú', language: 'vi' });
    const args = openai.transcribe.mock.calls[0][0];
    expect(args.model).toBe('stt-model');
    expect(args.language).toBeUndefined();
    expect(args.file.name).toBe('recording.webm');
  });

  it('언어 힌트를 주면 그 언어로 받아 적는다', async () => {
    openai.transcribe.mockResolvedValue({ text: '안녕하세요' });
    const res = fakeRes();
    await transcribeHandler(
      await multipartReq(audioForm('audio/mp4', 2000, { language: 'ko' })),
      res as unknown as VercelResponse,
    );
    expect(openai.transcribe.mock.calls[0][0].language).toBe('ko');
    expect(res.body).toEqual({ text: '안녕하세요', language: 'ko' });
  });

  it('POST가 아니거나 multipart가 아니면 400', async () => {
    const res = fakeRes();
    await transcribeHandler(
      await multipartReq(audioForm(), 'GET'),
      res as unknown as VercelResponse,
    );
    expect(res.statusCode).toBe(400);
    const res2 = fakeRes();
    await transcribeHandler(
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      } as unknown as VercelRequest,
      res2 as unknown as VercelResponse,
    );
    expect(res2.statusCode).toBe(400);
  });

  it('audio가 없거나 비었거나 소리 형식이 아니면 400', async () => {
    for (const fd of [
      (() => {
        const f = new FormData();
        f.append('language', 'ko');
        return f;
      })(),
      audioForm('audio/webm', 0),
      audioForm('text/plain'),
    ]) {
      const res = fakeRes();
      await transcribeHandler(await multipartReq(fd), res as unknown as VercelResponse);
      expect(res.statusCode).toBe(400);
    }
    expect(openai.transcribe).not.toHaveBeenCalled();
  });

  it('4MB를 넘으면 400', async () => {
    const res = fakeRes();
    await transcribeHandler(
      await multipartReq(audioForm('audio/webm', 4 * 1024 * 1024 + 10)),
      res as unknown as VercelResponse,
    );
    expect(res.statusCode).toBe(400);
  });

  it('OpenAI 사용량 초과는 429 RATE_LIMITED', async () => {
    openai.transcribe.mockRejectedValue({ status: 429 });
    const res = fakeRes();
    await transcribeHandler(await multipartReq(audioForm()), res as unknown as VercelResponse);
    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({ code: 'RATE_LIMITED', message_ko: MESSAGE_KO.RATE_LIMITED });
  });
});

describe('POST /api/tts', () => {
  const req = (body: unknown, method = 'POST') =>
    ({
      method,
      body,
      headers: { 'content-length': String(JSON.stringify(body ?? '').length) },
    }) as unknown as VercelRequest;

  it('mp3를 돌려주고 언어별 말투 지시·개인정보 가림을 적용한다', async () => {
    openai.speech.mockResolvedValue({ arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer });
    const res = fakeRes();
    await ttsHandler(
      req({ text: '연락처는 010-1234-5678 입니다', language: 'en' }),
      res as unknown as VercelResponse,
    );
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('audio/mpeg');
    const args = openai.speech.mock.calls[0][0];
    expect(args.input).toBe(`연락처는 ${MASK} 입니다`);
    expect(args.instructions).toBe(TTS_INSTRUCTIONS.en);
    expect(args.model).toBe('tts-model');
  });

  it('빈 문장·잘못된 언어·POST 아님은 400', async () => {
    for (const r of [
      req({ text: '  ', language: 'ko' }),
      req({ text: '안녕', language: 'ja' }),
      req({ text: '안녕', language: 'ko' }, 'GET'),
    ]) {
      const res = fakeRes();
      await ttsHandler(r, res as unknown as VercelResponse);
      expect(res.statusCode).toBe(400);
    }
    expect(openai.speech).not.toHaveBeenCalled();
  });

  it('OpenAI 장애는 503 AI_UNAVAILABLE', async () => {
    openai.speech.mockRejectedValue(new Error('down'));
    const res = fakeRes();
    await ttsHandler(req({ text: '안녕하세요', language: 'ko' }), res as unknown as VercelResponse);
    expect(res.statusCode).toBe(503);
  });
});

describe('transcribe (프론트)', () => {
  const blob = new Blob([new Uint8Array(100)], { type: 'audio/mp4' });

  it('성공하면 { text, language }', async () => {
    const f = vi.fn().mockResolvedValue(Response.json({ text: '안녕', language: 'ko' }));
    expect(await transcribe(blob, undefined, f)).toEqual({ text: '안녕', language: 'ko' });
    const body = f.mock.calls[0][1].body as FormData;
    expect((body.get('audio') as File).name).toBe('recording.mp4');
    expect(body.get('language')).toBeNull();
  });

  it('빈 녹음·4MB 초과는 보내지 않고 BAD_REQUEST', async () => {
    const f = vi.fn();
    await expect(transcribe(new Blob([]), undefined, f)).rejects.toMatchObject({
      error: { code: 'BAD_REQUEST' },
    });
    await expect(
      transcribe(new Blob([new Uint8Array(4 * 1024 * 1024 + 1)]), undefined, f),
    ).rejects.toMatchObject({ error: { code: 'BAD_REQUEST' } });
    expect(f).not.toHaveBeenCalled();
  });

  it('서버 오류는 그 ApiError, 네트워크 오류는 AI_UNAVAILABLE, 형식 오류는 BAD_JSON', async () => {
    const err = { code: 'RATE_LIMITED', message_ko: MESSAGE_KO.RATE_LIMITED };
    await expect(
      transcribe(blob, undefined, vi.fn().mockResolvedValue(Response.json(err, { status: 429 }))),
    ).rejects.toMatchObject({ error: err });
    await expect(
      transcribe(blob, undefined, vi.fn().mockRejectedValue(new TypeError('offline'))),
    ).rejects.toMatchObject({ error: { code: 'AI_UNAVAILABLE' } });
    await expect(
      transcribe(blob, undefined, vi.fn().mockResolvedValue(Response.json({ text: 1 }))),
    ).rejects.toMatchObject({ error: { code: 'BAD_JSON' } });
  });

  it('녹음 형식별 확장자', () => {
    expect(audioExtension('audio/webm;codecs=opus')).toBe('webm');
    expect(audioExtension('audio/mp4')).toBe('mp4');
    expect(audioExtension('audio/ogg')).toBe('ogg');
    expect(audioExtension('')).toBe('webm');
  });
});

describe('fetchTtsAudio (프론트)', () => {
  it('성공하면 mp3 Blob', async () => {
    const f = vi
      .fn()
      .mockResolvedValue(
        new Response(new Uint8Array([1, 2]), { headers: { 'content-type': 'audio/mpeg' } }),
      );
    const audio = await fetchTtsAudio('  안녕하세요  ', 'ko', f);
    expect(audio.size).toBe(2);
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ text: '안녕하세요', language: 'ko' });
  });

  it('실패는 ApiFailure', async () => {
    await expect(
      fetchTtsAudio('안녕', 'ko', vi.fn().mockRejectedValue(new Error('x'))),
    ).rejects.toBeInstanceOf(ApiFailure);
    await expect(
      fetchTtsAudio('안녕', 'ko', vi.fn().mockResolvedValue(new Response('', { status: 503 }))),
    ).rejects.toMatchObject({ error: { code: 'AI_UNAVAILABLE' } });
  });
});

describe('녹음 도우미', () => {
  it('크롬은 webm/opus, 사파리는 mp4를 고른다', () => {
    expect(pickMimeType((t) => t.startsWith('audio/webm'))).toBe('audio/webm;codecs=opus');
    expect(pickMimeType((t) => t === 'audio/mp4')).toBe('audio/mp4');
    expect(pickMimeType(() => false)).toBe('');
  });

  it('권한·장치 오류를 쉬운 말 코드로', () => {
    expect(mediaErrorCode({ name: 'NotAllowedError' })).toBe('denied');
    expect(mediaErrorCode({ name: 'NotFoundError' })).toBe('no-device');
    expect(mediaErrorCode({ name: 'NotReadableError' })).toBe('busy');
    expect(mediaErrorCode(new Error('?'))).toBe('failed');
    expect(RECORDER_ERROR_KO['too-short']).toContain('조금 더 길게');
  });
});

describe('speak (읽어 주기)', () => {
  type FakeAudio = {
    src: string;
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    onended: (() => void) | null;
    onerror: (() => void) | null;
  };
  let audios: FakeAudio[];
  let spoken: string[];

  beforeEach(() => {
    audios = [];
    spoken = [];
    class Audio {
      src = '';
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      pause = vi.fn();
      play = vi.fn(() => {
        queueMicrotask(() => this.onended?.());
        return Promise.resolve();
      });
      constructor() {
        audios.push(this as unknown as FakeAudio);
      }
    }
    class SpeechSynthesisUtterance {
      lang = '';
      rate = 1;
      volume = 1;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    }
    vi.stubGlobal('Audio', Audio);
    vi.stubGlobal('SpeechSynthesisUtterance', SpeechSynthesisUtterance);
    vi.stubGlobal('window', {
      speechSynthesis: {
        speak: (u: SpeechSynthesisUtterance) => {
          if (u.text) spoken.push(`${u.lang}:${u.text}`);
          queueMicrotask(() => u.onend?.());
        },
        cancel: vi.fn(),
      },
    });
    vi.stubGlobal('navigator', { onLine: true });
    let n = 0;
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:${++n}`);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    speech.resetSpeechForTest();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const ok = () => vi.fn().mockResolvedValue(new Response(new Uint8Array([1]), { status: 200 }));

  it('받은 소리를 재생하고, 같은 문장은 다시 받지 않는다', async () => {
    const f = ok();
    vi.stubGlobal('fetch', f);
    await speech.speak('안녕하세요', 'ko');
    await speech.speak('안녕하세요', 'ko');
    expect(f).toHaveBeenCalledTimes(1);
    expect(audios[0].play).toHaveBeenCalledTimes(2);
    expect(spoken).toEqual([]);
  });

  it('받는 사이에 멈추면 재생하지 않는다', async () => {
    let release!: (r: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((r) => (release = r))),
    );
    const p = speech.speak('질문입니다', 'ko');
    speech.stopSpeaking();
    release(new Response(new Uint8Array([1])));
    await p;
    expect(audios.every((a) => a.play.mock.calls.length === 0)).toBe(true);
  });

  it('TTS가 실패하면 브라우저 음성으로 읽는다(언어 태그 포함)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    await speech.speak('Xin chào', 'vi');
    expect(spoken).toEqual(['vi-VN:Xin chào']);
  });

  it('오프라인이면 바로 브라우저 음성', async () => {
    const f = ok();
    vi.stubGlobal('fetch', f);
    vi.stubGlobal('navigator', { onLine: false });
    await speech.speak('Hello', 'en');
    expect(f).not.toHaveBeenCalled();
    expect(spoken).toEqual(['en-US:Hello']);
  });

  it('재생 중에 멈추면 speak()도 끝난다', async () => {
    vi.stubGlobal('fetch', ok());
    class SlowAudio {
      src = '';
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      pause = vi.fn();
      play = vi.fn(() => Promise.resolve()); // 끝나지 않음
    }
    vi.stubGlobal('Audio', SlowAudio);
    speech.resetSpeechForTest();
    const p = speech.speak('긴 문장', 'ko');
    await new Promise((r) => setTimeout(r, 0));
    speech.stopSpeaking();
    await expect(p).resolves.toBeUndefined();
  });
});
