import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import contactsData from '../data/contacts.json' with { type: 'json' };
import {
  CONTACTS,
  cardToText,
  pickTags,
  sanitizeTags,
  selectContacts,
} from '../lib/contactsTagger.js';
import { ApiFailure, MESSAGE_KO } from '../lib/errors.js';
import { MASK } from '../lib/masking.js';
import { resetOpenAIForTest } from '../lib/openai.js';
import { Contact, ContactsResponse, type SummaryCard } from '../lib/schema.js';
import handler from '../api/contacts.js';
import { fetchContacts } from '../src/api/contacts.js';

const card: SummaryCard = {
  who: '어머니(본인 아님)의 기초연금 신청 건',
  situation: '신청 방법을 모름. 연락처 010-1234-5678',
  request: '미확인',
  unknowns: ['원하는 것'],
  to_ask: ['대신 가서 신청해도 되나요?'],
  spoken_language: 'ko',
};

const dataPhones = new Set(CONTACTS.map((c) => c.phone));
const dataNames = new Set(CONTACTS.map((c) => c.name));

describe('data/contacts.json', () => {
  it('모든 항목이 Contact 스키마를 통과한다', () => {
    for (const c of contactsData) expect(Contact.safeParse(c).success).toBe(true);
  });
  it('출처가 있는 항목은 https 공식 주소이고 확인일이 YYYY-MM-DD다', () => {
    for (const c of CONTACTS) {
      if (c.source) expect(c.source).toMatch(/^https:\/\//);
      expect(c.checked_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it('PRD 초기 연락처 4곳이 들어 있다', () => {
    expect([...dataPhones]).toEqual(expect.arrayContaining(['129', '1355', '110', null]));
  });
  it('모든 태그에 연락처가 최소 1개 있다', () => {
    for (const tag of ['welfare', 'resident', 'general'] as const) {
      expect(selectContacts([tag]).length).toBeGreaterThan(0);
    }
  });
});

describe('sanitizeTags', () => {
  it('정해진 태그만 남기고 중복을 없앤다', () => {
    expect(sanitizeTags(['welfare', 'medical', 'welfare', 3])).toEqual(['welfare']);
  });
  it('남는 게 없으면 general', () => {
    expect(sanitizeTags([])).toEqual(['general']);
    expect(sanitizeTags('welfare')).toEqual(['general']);
    expect(sanitizeTags(undefined)).toEqual(['general']);
  });
});

describe('selectContacts', () => {
  it('welfare면 129·1355·주민센터', () => {
    expect(selectContacts(['welfare']).map((c) => c.phone)).toEqual(['129', '1355', null]);
  });
  it('general이면 110·주민센터', () => {
    expect(selectContacts(['general']).map((c) => c.phone)).toEqual(['110', null]);
  });
});

describe('pickTags', () => {
  it('LLM에는 개인정보를 가린 카드 텍스트만 보낸다', async () => {
    const complete = vi.fn().mockResolvedValue(['welfare']);
    await pickTags(card, complete);
    const sent = complete.mock.calls[0][0] as string;
    expect(sent).toContain(MASK);
    expect(sent).not.toContain('010-1234-5678');
    expect(sent).toContain('기초연금');
  });
  it('LLM이 고른 태그를 돌려준다', async () => {
    expect(await pickTags(card, async () => ['welfare', 'resident'])).toEqual([
      'welfare',
      'resident',
    ]);
  });
  it('LLM이 실패하면 던지지 않고 general', async () => {
    expect(
      await pickTags(card, async () => {
        throw new Error('down');
      }),
    ).toEqual(['general']);
  });
  it('LLM이 엉뚱한 값을 주면 general', async () => {
    expect(await pickTags(card, async () => ['보건소 043-123-4567'])).toEqual(['general']);
  });
  it('cardToText는 다섯 항목을 모두 담는다', () => {
    const text = cardToText(card);
    for (const label of ['누구의 일', '현재 상황', '요청', '미확인', '물어볼 것']) {
      expect(text).toContain(label);
    }
  });
});

function fakeReq(body: unknown, method = 'POST'): VercelRequest {
  const raw = JSON.stringify(body ?? null);
  return {
    method,
    body,
    headers: { 'content-length': String(Buffer.byteLength(raw)) },
  } as unknown as VercelRequest;
}

function fakeRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
    setHeader(k: string, v: string) {
      res.headers[k] = v;
      return res;
    },
  };
  return res;
}

describe('POST /api/contacts', () => {
  beforeEach(() => {
    // 키가 없으면 LLM 호출이 실패 → general로 대체되는 경로를 탄다(실제 OpenAI 호출 없음)
    vi.stubEnv('OPENAI_API_KEY', '');
    resetOpenAIForTest();
  });
  afterEach(() => vi.unstubAllEnvs());

  it('정상 요청이면 데이터에 있는 연락처만 돌려준다', async () => {
    const res = fakeRes();
    await handler(fakeReq({ card }), res as unknown as VercelResponse);
    expect(res.statusCode).toBe(200);
    const body = ContactsResponse.parse(res.body);
    expect(body.tags).toEqual(['general']);
    expect(body.contacts.length).toBeGreaterThan(0);
    for (const c of body.contacts) {
      expect(dataNames.has(c.name)).toBe(true);
      expect(dataPhones.has(c.phone)).toBe(true);
    }
  });

  it('카드 형식이 틀리면 400 BAD_REQUEST', async () => {
    const res = fakeRes();
    await handler(fakeReq({ card: { who: 1 } }), res as unknown as VercelResponse);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ code: 'BAD_REQUEST', message_ko: MESSAGE_KO.BAD_REQUEST });
  });

  it('POST가 아니면 400', async () => {
    const res = fakeRes();
    await handler(fakeReq(undefined, 'GET'), res as unknown as VercelResponse);
    expect(res.statusCode).toBe(400);
  });

  it('본문이 너무 크면 400', async () => {
    const res = fakeRes();
    const req = fakeReq({ card });
    req.headers['content-length'] = '999999';
    await handler(req, res as unknown as VercelResponse);
    expect(res.statusCode).toBe(400);
  });
});

describe('fetchContacts (프론트)', () => {
  const ok = { tags: ['welfare'], contacts: [CONTACTS[0]] };

  it('성공하면 ContactsResponse를 돌려준다', async () => {
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify(ok), { status: 200 }));
    expect(await fetchContacts(card, f)).toEqual(ok);
    expect(f.mock.calls[0][0]).toBe('/api/contacts');
  });

  it('서버 오류 응답이면 그 ApiError로 실패한다', async () => {
    const err = { code: 'RATE_LIMITED', message_ko: MESSAGE_KO.RATE_LIMITED };
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify(err), { status: 429 }));
    await expect(fetchContacts(card, f)).rejects.toMatchObject({ error: err });
  });

  it('네트워크 오류면 AI_UNAVAILABLE', async () => {
    const f = vi.fn().mockRejectedValue(new TypeError('offline'));
    const p = fetchContacts(card, f);
    await expect(p).rejects.toBeInstanceOf(ApiFailure);
    await expect(p).rejects.toMatchObject({ error: { code: 'AI_UNAVAILABLE' } });
  });

  it('응답 형식이 틀리면 BAD_JSON', async () => {
    const f = vi.fn().mockResolvedValue(new Response('{"tags":"x"}', { status: 200 }));
    await expect(fetchContacts(card, f)).rejects.toMatchObject({ error: { code: 'BAD_JSON' } });
  });
});
