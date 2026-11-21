// POST /api/contacts — 사용자가 확인한 최종 요약 카드 → 참고 연락처
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pickTags, selectContacts } from '../lib/contactsTagger.js';
import { ApiFailure, assertBodySize, sendError } from '../lib/errors.js';
import { ContactsRequest, ContactsResponse } from '../lib/schema.js';

const MAX_BODY_BYTES = 20_000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 'BAD_REQUEST');
  }
  try {
    assertBodySize(req, MAX_BODY_BYTES);
    const parsed = ContactsRequest.safeParse(req.body);
    if (!parsed.success) return sendError(res, 'BAD_REQUEST');

    const tags = await pickTags(parsed.data.card);
    const body = ContactsResponse.parse({ tags, contacts: selectContacts(tags) });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(body);
  } catch (err) {
    return sendError(res, err instanceof ApiFailure ? err.error.code : 'AI_UNAVAILABLE');
  }
}
