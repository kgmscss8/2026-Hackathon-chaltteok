// POST /api/tts — { text, language } → audio/mpeg
// 고령층이 알아듣기 쉽게 천천히·또박또박 읽는다. 글자는 저장·로그하지 않는다.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ApiFailure, assertBodySize, fromOpenAIError, sendError } from '../lib/errors.js';
import { maskPII } from '../lib/masking.js';
import { getOpenAI, MODELS } from '../lib/openai.js';
import { type Language, TtsRequest } from '../lib/schema.js';

const MAX_BODY_BYTES = 8 * 1024;
export const TTS_VOICE = 'nova';

/** 말투 지시(언어별). gpt-4o-mini-tts는 speed 대신 지시문으로 속도를 맞춘다. */
export const TTS_INSTRUCTIONS: Record<Language, string> = {
  ko: '천천히, 또박또박, 따뜻하고 차분한 말투로 읽어 주세요. 어르신이 한 번에 알아들을 수 있게 문장 사이를 조금 쉬어 주세요.',
  en: 'Speak slowly and clearly in a warm, calm voice, pausing briefly between sentences so an older listener can follow easily.',
  vi: 'Hãy đọc chậm, rõ ràng, giọng ấm áp và điềm tĩnh, ngắt nghỉ một chút giữa các câu để người lớn tuổi dễ nghe.',
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
