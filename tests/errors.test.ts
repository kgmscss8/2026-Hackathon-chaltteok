import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VercelResponse } from '@vercel/node';
import {
  ApiFailure,
  assertBodySize,
  fromOpenAIError,
  HTTP_STATUS,
  MESSAGE_KO,
  sendError,
} from '../lib/errors.js';
import { getOpenAI, MODELS, resetOpenAIForTest } from '../lib/openai.js';
import { ApiError, ErrorCode } from '../lib/schema.js';

function fakeRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
  };
  return res;
}

describe('MESSAGE_KO', () => {
  it('모든 오류 코드에 쉬운 말 문구가 있다', () => {
    for (const code of ErrorCode.options) {
      expect(MESSAGE_KO[code].length).toBeGreaterThan(0);
      expect(HTTP_STATUS[code]).toBeGreaterThanOrEqual(400);
    }
  });
});

describe('ApiFailure', () => {
  it('ApiError 형식을 담는다', () => {
    const f = ApiFailure.of('RATE_LIMITED');
    expect(f).toBeInstanceOf(Error);
    expect(ApiError.safeParse(f.error).success).toBe(true);
    expect(f.error).toEqual({ code: 'RATE_LIMITED', message_ko: MESSAGE_KO.RATE_LIMITED });
  });
});

describe('sendError', () => {
  it('상태 코드와 { code, message_ko }를 보낸다', () => {
    const res = fakeRes();
    sendError(res as unknown as VercelResponse, 'BAD_REQUEST');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ code: 'BAD_REQUEST', message_ko: MESSAGE_KO.BAD_REQUEST });
    expect(ApiError.safeParse(res.body).success).toBe(true);
  });
  it('사용량 초과는 429', () => {
    const res = fakeRes();
    sendError(res as unknown as VercelResponse, 'RATE_LIMITED');
    expect(res.statusCode).toBe(429);
  });
});

describe('fromOpenAIError', () => {
  it('429는 RATE_LIMITED', () => {
    expect(fromOpenAIError({ status: 429 })).toBe('RATE_LIMITED');
  });
  it('insufficient_quota는 RATE_LIMITED', () => {
    expect(fromOpenAIError({ status: 400, code: 'insufficient_quota' })).toBe('RATE_LIMITED');
    expect(fromOpenAIError({ error: { type: 'insufficient_quota' } })).toBe('RATE_LIMITED');
  });
  it('그 외 오류는 AI_UNAVAILABLE', () => {
    expect(fromOpenAIError({ status: 500 })).toBe('AI_UNAVAILABLE');
    expect(fromOpenAIError(new Error('network'))).toBe('AI_UNAVAILABLE');
    expect(fromOpenAIError(null)).toBe('AI_UNAVAILABLE');
  });
  it('이미 ApiFailure면 그 코드를 유지한다', () => {
    expect(fromOpenAIError(ApiFailure.of('BAD_JSON'))).toBe('BAD_JSON');
  });
});

describe('assertBodySize', () => {
  it('한도 이하면 통과한다', () => {
    expect(() =>
      assertBodySize({ headers: { 'content-length': '1000' } }, 4_000_000),
    ).not.toThrow();
    expect(() => assertBodySize(4_000_000, 4_000_000)).not.toThrow();
  });
  it('한도를 넘거나 크기를 알 수 없으면 BAD_REQUEST', () => {
    const over = () => assertBodySize({ headers: { 'content-length': '5000000' } }, 4_000_000);
    expect(over).toThrow(ApiFailure);
    try {
      over();
    } catch (e) {
      expect((e as ApiFailure).error.code).toBe('BAD_REQUEST');
    }
    expect(() => assertBodySize({ headers: {} }, 4_000_000)).toThrow(ApiFailure);
  });
});

describe('getOpenAI', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetOpenAIForTest();
  });
  it('키가 없으면 AI_UNAVAILABLE', () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    expect(() => getOpenAI()).toThrow(ApiFailure);
    try {
      getOpenAI();
    } catch (e) {
      expect((e as ApiFailure).error.code).toBe('AI_UNAVAILABLE');
    }
  });
  it('키가 있으면 같은 클라이언트를 재사용한다', () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test-dummy');
    expect(getOpenAI()).toBe(getOpenAI());
  });
  it('모델 이름이 한 곳에 모여 있다', () => {
    expect(Object.keys(MODELS)).toEqual(['transcribe', 'chat', 'tts']);
  });
});
