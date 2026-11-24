import OpenAI from 'openai';
import { ApiFailure } from './errors.js';

/**
 * 사용할 모델 이름은 이 한 곳에서만 정한다.
 * TODO(A): OpenAI 콘솔에서 현재 쓸 수 있는 모델을 확인한 뒤 확정한다.
 */
export const MODELS = {
  transcribe: 'gpt-4o-mini-transcribe',
  chat: 'gpt-4.1-mini',
  // gpt-4o-mini-tts는 한국어·베트남어 낭독이 엉뚱한 말로 나와(운영 실측: 같은 문장을 STT가 다른 말로 인식) tts-1 사용
  tts: 'tts-1',
} as const;

let client: OpenAI | null = null;

/** 서버 함수 전용. OPENAI_API_KEY가 없으면 AI_UNAVAILABLE ApiFailure를 던진다. */
export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw ApiFailure.of('AI_UNAVAILABLE');
  if (!client) client = new OpenAI({ apiKey });
  return client;
}

/** 테스트용: 캐시된 클라이언트를 비운다. */
export function resetOpenAIForTest(): void {
  client = null;
}
