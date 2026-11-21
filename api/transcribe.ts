import type { VercelRequest, VercelResponse } from '@vercel/node';
import { toFile } from 'openai';
import { getOpenAI, MODELS } from '../lib/openai.js';
import { sendError, fromOpenAIError } from '../lib/errors.js';
import { Language, TranscribeResponse } from '../lib/schema.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_BYTES = 4 * 1024 * 1024;

function normalizeLanguage(raw?: string): Language {
  if (!raw) return 'ko';
  const lower = raw.toLowerCase();
  if (lower.startsWith('en') || lower.includes('english')) return 'en';
  if (lower.startsWith('vi') || lower.includes('vietnam')) return 'vi';
  return 'ko';
}

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > MAX_BYTES + 64 * 1024) {
      throw new Error('PAYLOAD_TOO_LARGE');
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

function parseMultipart(
  body: Buffer,
  boundary: string
): { fileBuffer: Buffer; filename: string; contentType: string; languageHint?: string } | null {
  const boundaryBuf = Buffer.from(`--${boundary}`);
  let pos = body.indexOf(boundaryBuf);
  if (pos === -1) return null;

  let fileBuffer: Buffer | null = null;
  let filename = 'audio.webm';
  let contentType = 'audio/webm';
  let languageHint: string | undefined;

  while (pos !== -1) {
    const nextPos = body.indexOf(boundaryBuf, pos + boundaryBuf.length);
    if (nextPos === -1) break;

    const part = body.subarray(pos + boundaryBuf.length, nextPos);
    const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd !== -1) {
      const headerStr = part.subarray(0, headerEnd).toString('utf8');
      const content = part.subarray(headerEnd + 4, part.length - 2);

      if (headerStr.includes('name="audio"')) {
        const fnMatch = headerStr.match(/filename="([^"]+)"/);
        if (fnMatch) filename = fnMatch[1];
        const ctMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);
        if (ctMatch) contentType = ctMatch[1].trim();
        fileBuffer = content;
      } else if (headerStr.includes('name="language"')) {
        languageHint = content.toString('utf8').trim();
      }
    }
    pos = nextPos;
  }

  if (!fileBuffer || fileBuffer.length === 0) return null;
  return { fileBuffer, filename, contentType, languageHint };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return sendError(res, 'BAD_REQUEST');
  }

  const ct = req.headers['content-type'] || '';
  const boundaryMatch = ct.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = boundaryMatch?.[1] || boundaryMatch?.[2];
  if (!boundary) {
    return sendError(res, 'BAD_REQUEST');
  }

  try {
    const rawBody = await readRawBody(req);
    const parsed = parseMultipart(rawBody, boundary.trim());
    if (!parsed) {
      return sendError(res, 'BAD_REQUEST');
    }

    if (parsed.fileBuffer.length > MAX_BYTES) {
      return sendError(res, 'BAD_REQUEST');
    }

    const allowedTypes = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'video/webm'];
    const isValidType = allowedTypes.some((t) => parsed.contentType.toLowerCase().includes(t));
    if (!isValidType) {
      return sendError(res, 'BAD_REQUEST');
    }

    const openai = getOpenAI();
    const audioFile = await toFile(parsed.fileBuffer, parsed.filename, {
      type: parsed.contentType,
    });

    const hintParsed = Language.safeParse(parsed.languageHint);
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: MODELS.transcribe,
      ...(hintParsed.success ? { language: hintParsed.data } : {}),
    });

    const detectedLang = hintParsed.success
      ? hintParsed.data
      : normalizeLanguage((transcription as { language?: string }).language);

    const payload = TranscribeResponse.parse({
      text: transcription.text ?? '',
      language: detectedLang,
    });

    return res.status(200).json(payload);
  } catch (err) {
    if (err instanceof Error && err.message === 'PAYLOAD_TOO_LARGE') {
      return sendError(res, 'BAD_REQUEST');
    }
    const code = fromOpenAIError(err);
    return sendError(res, code);
  }
}
