import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getOpenAI, MODELS } from '../lib/openai';
import { sendError, fromOpenAIError } from '../lib/errors';
import { maskPII } from '../lib/masking';
import { TtsRequest } from '../lib/schema';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return sendError(res, 'BAD_REQUEST');
  }

  const parsed = TtsRequest.safeParse(req.body);
  if (!parsed.success || !parsed.data.text.trim()) {
    return sendError(res, 'BAD_REQUEST');
  }

  try {
    const safeText = maskPII(parsed.data.text);
    const openai = getOpenAI();

    const speech = await openai.audio.speech.create({
      model: MODELS.tts,
      voice: 'nova',
      input: safeText,
      response_format: 'mp3',
      speed: 0.9,
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(audioBuffer);
  } catch (err) {
    const code = fromOpenAIError(err);
    return sendError(res, code);
  }
}
