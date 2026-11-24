// POST /api/transcribe — 짧은 녹음(최대 60초·4MB) → { text, language }
// 음성·글자는 저장하거나 로그에 남기지 않는다.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { toFile } from 'openai';
import { ApiFailure, fromOpenAIError, sendError } from '../lib/errors.js';
import { getOpenAI, MODELS } from '../lib/openai.js';
import { Language, TranscribeResponse } from '../lib/schema.js';

// multipart를 직접 읽기 위해 Vercel의 본문 파싱을 끈다
export const config = { api: { bodyParser: false } };

export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const MAX_BODY_BYTES = MAX_AUDIO_BYTES + 64 * 1024;

const AUDIO_TYPE = /^(audio\/[\w.+-]+|video\/(webm|mp4))$/i;
const AUDIO_EXT = /\.(webm|mp4|m4a|mp3|mpeg|mpga|ogg|oga|wav|aac)$/i;

/**
 * 받아 적은 글자로 언어를 고른다(모델이 언어를 알려 주지 않을 때).
 * 한글이 있으면 ko, 베트남어 전용 글자가 있으면 vi, 로마자만 있으면 en, 판단이 안 되면 fallback.
 */
export function detectLanguage(text: string, fallback: Language = 'ko'): Language {
  const hangul = (text.match(/[가-힣]/g) ?? []).length;
  const viet = (
    text.match(/[ăâđêôơưàảãáạằẳẵắặầẩẫấậèẻẽéẹềểễếệìỉĩíịòỏõóọồổỗốộờởỡớợùủũúụừửữứựỳỷỹýỵ]/gi) ?? []
  ).length;
  const latin = (text.match(/[a-z]/gi) ?? []).length;
  if (hangul > 0 && hangul >= viet) return 'ko';
  if (viet >= 2 || (viet > 0 && viet * 10 >= latin)) return 'vi';
  if (latin > 0) return 'en';
  return fallback;
}

async function readBody(req: VercelRequest, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req as AsyncIterable<Buffer | string>) {
    const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
    total += buf.length;
    if (total > limit) throw ApiFailure.of('BAD_REQUEST');
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 'BAD_REQUEST');
  }
  const contentType = String(req.headers['content-type'] ?? '');
  if (!/^multipart\/form-data/i.test(contentType)) return sendError(res, 'BAD_REQUEST');
  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return sendError(res, 'BAD_REQUEST');

  try {
    const body = await readBody(req, MAX_BODY_BYTES);
    const form = await new Response(new Uint8Array(body), {
      headers: { 'content-type': contentType },
    })
      .formData()
      .catch(() => {
        throw ApiFailure.of('BAD_REQUEST');
      });

    const audio = form.get('audio');
    if (!(audio instanceof Blob) || audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
      return sendError(res, 'BAD_REQUEST');
    }
    const name = (audio as File).name || 'recording.webm';
    const type = audio.type.split(';')[0].trim();
    if (!(type ? AUDIO_TYPE.test(type) : AUDIO_EXT.test(name))) {
      return sendError(res, 'BAD_REQUEST');
    }

    const hint = Language.safeParse(form.get('language'));
    const transcription = await getOpenAI().audio.transcriptions.create({
      file: await toFile(Buffer.from(await audio.arrayBuffer()), name, {
        type: type || undefined,
      }),
      model: MODELS.transcribe,
      response_format: 'json',
      ...(hint.success ? { language: hint.data } : {}),
    });

    const text = (transcription.text ?? '').trim();
    const payload = TranscribeResponse.parse({
      text,
      language: hint.success ? hint.data : detectLanguage(text),
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(payload);
  } catch (err) {
    return sendError(res, fromOpenAIError(err));
  }
}
