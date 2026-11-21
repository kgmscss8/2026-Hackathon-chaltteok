// 배포 확인용 임시 함수: api → ../lib 상대 import가 Vercel에서 동작하는지 확인한다. 확인 후 삭제.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SLOT_KEYS } from '../lib/schema.js';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ok: true, slots: SLOT_KEYS.length });
}
