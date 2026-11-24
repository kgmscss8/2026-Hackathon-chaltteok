// POST /api/tts — { text, language } → audio/mpeg
// 고령층이 알아듣기 쉽게 천천히·또박또박 읽는다. 글자는 저장·로그하지 않는다.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ApiFailure, assertBodySize, fromOpenAIError, sendError } from '../lib/errors.js';
import { maskPII } from '../lib/masking.js';
import { getOpenAI, MODELS } from '../lib/openai.js';
import { type Language, TtsRequest } from '../lib/schema.js';

const MAX_BODY_BYTES = 8 * 1024;
export const TTS_VOICE = 'nova';

/**
 * 말투 지시(언어별). gpt-4o-mini-tts는 speed 대신 지시문으로 속도를 맞춘다.
 * 지시문을 한국어로 쓰면 한국어 낭독이 깨지는 경우가 있어(실측) 모두 영어로 쓰고, 원문 언어로 그대로 읽게 한다.
 */
const STYLE =
  'slowly and clearly, in a warm and calm voice, with short pauses between sentences so an older listener can follow. Read the text exactly as written. Do not translate, add, or skip anything.';
export const TTS_INSTRUCTIONS: Record<Language, string> = {
  ko: `The text is in Korean. Speak it in natural standard Korean, ${STYLE}`,
  en: `The text is in English. Speak it in natural English, ${STYLE}`,
  vi: `The text is in Vietnamese. Speak it in natural Vietnamese, ${STYLE}`,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 'BAD_REQUEST');
  }
  try {
    assertBodySize(req, MAX_BODY_BYTES);
    const parsed = TtsRequest.safeParse(req.body);
    if (!parsed.success || !parsed.data.text.trim()) return sendError(res, 'BAD_REQUEST');
    const { text, language } = parsed.data;

    const speech = await getOpenAI().audio.speech.create({
      model: MODELS.tts,
      voice: TTS_VOICE,
      input: maskPII(text.trim()),
      instructions: TTS_INSTRUCTIONS[language],
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
