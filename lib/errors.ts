import type { VercelResponse } from '@vercel/node';
import type { z } from 'zod';
import type { ApiError, ErrorCode as ErrorCodeSchema } from './schema.js';

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

/** 쉬운 말 안내 문구 (화면·음성 안내에 그대로 쓴다) */
export const MESSAGE_KO: Record<ErrorCode, string> = {
  AI_UNAVAILABLE: 'AI에 연결하지 못했어요. 잠시 뒤 다시 하거나 글로 써 주세요.',
  RATE_LIMITED: '지금 사용하는 사람이 많아요. 잠시 뒤 다시 하거나 예시로 체험해 보세요.',
  BAD_JSON: '정리하는 중에 문제가 생겼어요. 한 번 더 말해 주세요.',
  BAD_REQUEST: '보낸 내용이 너무 길거나 올바르지 않아요. 조금 짧게 다시 해 주세요.',
};

export const HTTP_STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  RATE_LIMITED: 429,
  BAD_JSON: 502,
  AI_UNAVAILABLE: 503,
};

export function toApiError(code: ErrorCode): ApiError {
  return { code, message_ko: MESSAGE_KO[code] };
}

/** 프론트 호출 함수와 서버 헬퍼가 실패를 알릴 때 쓰는 공통 오류 */
export class ApiFailure extends Error {
  constructor(public error: ApiError) {
    super(error.code);
    this.name = 'ApiFailure';
  }

  static of(code: ErrorCode): ApiFailure {
    return new ApiFailure(toApiError(code));
  }
}

/** 오류 응답을 `{ code, message_ko }` 형식으로 보낸다. 민원 내용은 담지 않는다. */
export function sendError(res: VercelResponse, code: ErrorCode): void {
  res.status(HTTP_STATUS[code]).json(toApiError(code));
}

/** OpenAI SDK 오류 → 오류 코드. 429·사용량 초과는 RATE_LIMITED, 그 외는 AI_UNAVAILABLE */
export function fromOpenAIError(err: unknown): ErrorCode {
  if (err instanceof ApiFailure) return err.error.code;
  if (typeof err === 'object' && err !== null) {
    const e = err as {
      status?: unknown;
      code?: unknown;
      error?: { code?: unknown; type?: unknown };
    };
    const codes = [e.code, e.error?.code, e.error?.type];
    if (
      e.status === 429 ||
      codes.includes('insufficient_quota') ||
      codes.includes('rate_limit_exceeded')
    ) {
      return 'RATE_LIMITED';
    }
  }
  return 'AI_UNAVAILABLE';
}

type HeaderBag = { headers: Record<string, string | string[] | undefined> };

/**
 * 요청 본문 크기를 검사한다. `content-length`(또는 직접 잰 바이트 수)가 maxBytes를 넘으면
 * BAD_REQUEST ApiFailure를 던진다.
 */
export function assertBodySize(reqOrBytes: HeaderBag | number, maxBytes: number): void {
  let size: number;
  if (typeof reqOrBytes === 'number') {
    size = reqOrBytes;
  } else {
    const raw = reqOrBytes.headers['content-length'];
    size = Number(Array.isArray(raw) ? raw[0] : raw);
  }
  if (!Number.isFinite(size) || size < 0 || size > maxBytes) {
    throw ApiFailure.of('BAD_REQUEST');
  }
}
