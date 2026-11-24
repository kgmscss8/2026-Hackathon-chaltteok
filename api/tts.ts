// POST /api/tts — { text, language } → audio/mpeg
// 글자는 저장·로그하지 않는다.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ApiFailure, assertBodySize, fromOpenAIError, sendError } from '../lib/errors.js';
import { maskPII } from '../lib/masking.js';
import { getOpenAI, MODELS } from '../lib/openai.js';
import { TtsRequest } from '../lib/schema.js';

const MAX_BODY_BYTES = 8 * 1024;
export const TTS_VOICE = 'nova';
/** 고령층이 알아듣기 쉽게 조금 느리게 */
export const TTS_SPEED = 0.9;

// 주의: 말투 지시(instructions)를 넣으면 한국어·베트남어 낭독이 엉뚱한 말로 바뀌는 것을 운영에서 확인했다
// (지시문 일부를 읽거나 다른 말을 함). 지시문 없이 원문만 읽게 한다.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 'BAD_REQUEST');
  }
  try {
    assertBodySize(req, MAX_BODY_BYTES);
    const parsed = TtsRequest.safeParse(req.body);
    if (!parsed.success || !parsed.data.text.trim()) return sendError(res, 'BAD_REQUEST');

    const speech = await getOpenAI().audio.speech.create({
      model: MODELS.tts,
      voice: TTS_VOICE,
      input: maskPII(parsed.data.text.trim()),
      speed: TTS_SPEED,
      response_format: 'mp3',
    });
    const audio = Buffer.from(await speech.arrayBuffer());

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', String(audio.length));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(audio);
  } catch (err) {
    return sendError(res, err instanceof ApiFailure ? err.error.code : fromOpenAIError(err));
  }
}
