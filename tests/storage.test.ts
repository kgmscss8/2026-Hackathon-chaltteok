import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore, set } from 'idb-keyval';
import type { SavedSummary } from '../lib/schema.js';
import {
  clearSummaries,
  deleteSummary,
  getConsent,
  getSummary,
  listSummaries,
  purgeExpired,
  RETENTION_MS,
  saveSummary,
  setConsent,
} from '../src/storage/index.js';

const empty = { value: null, evidence: null };
const draft: Omit<SavedSummary, 'id' | 'created_at' | 'expires_at'> = {
  card: {
    who: '어머니(본인 아님)의 기초연금 신청 건',
    situation: '신청 방법을 모름',
    request: '미확인',
    unknowns: ['원하는 것'],
    to_ask: [],
    spoken_language: 'ko',
  },
  slots: {
    whose_matter: { value: '어머니 (가족 대신)', evidence: '엄마 기초연금' },
    purpose: { value: '기초연금 신청', evidence: '기초연금 신청하려는데' },
    desired: empty,
    date: empty,
    question: empty,
  },
  history: [{ role: 'user', text: '엄마 기초연금 신청하려는데', language: 'ko', source: 'voice' }],
  contacts: [],
};

const T0 = new Date('2026-11-21T09:00:00+09:00').getTime();

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(T0);
  await clearSummaries();
  await setConsent(false);
});
afterEach(() => vi.useRealTimers());

describe('saveSummary / getSummary', () => {
  it('id·저장 시각·7일 뒤 만료 시각을 붙여 저장한다', async () => {
    const saved = await saveSummary(draft);
    expect(saved.id).toBeTruthy();
    expect(saved.created_at).toBe(T0);
    expect(saved.expires_at).toBe(T0 + RETENTION_MS);
    expect(await getSummary(saved.id)).toEqual(saved);
  });

  it('형식이 틀린 요약은 저장하지 않는다', async () => {
    const bad = { ...draft, card: { ...draft.card, who: 1 } } as unknown as typeof draft;
    await expect(saveSummary(bad)).rejects.toThrow();
    expect(await listSummaries()).toEqual([]);
  });

  it('없는 id는 undefined', async () => {
    expect(await getSummary('nope')).toBeUndefined();
  });
});

describe('listSummaries', () => {
  it('최신순으로 돌려준다', async () => {
    const a = await saveSummary(draft);
    vi.setSystemTime(T0 + 60_000);
    const b = await saveSummary(draft);
    expect((await listSummaries()).map((s) => s.id)).toEqual([b.id, a.id]);
  });

  it('7일이 지나면 목록에서 빠지고 실제로 지워진다', async () => {
    const old = await saveSummary(draft);
    vi.setSystemTime(T0 + RETENTION_MS - 1);
    const fresh = await saveSummary(draft);
    expect((await listSummaries()).length).toBe(2);

    vi.setSystemTime(T0 + RETENTION_MS);
    expect((await listSummaries()).map((s) => s.id)).toEqual([fresh.id]);
    expect(await getSummary(old.id)).toBeUndefined();
  });

  it('형식이 깨진 항목은 지우고 뺀다', async () => {
    await saveSummary(draft);
    await set('broken', { hello: 'world' }, createStore('chalddeok-summaries', 'summaries'));
    expect((await listSummaries()).length).toBe(1);
  });
});

describe('getSummary 만료', () => {
  it('만료된 요약은 다시 열 수 없다', async () => {
    const s = await saveSummary(draft);
    vi.setSystemTime(T0 + RETENTION_MS + 1);
    expect(await getSummary(s.id)).toBeUndefined();
  });
});

describe('deleteSummary / clearSummaries / purgeExpired', () => {
  it('하나만 지운다', async () => {
    const a = await saveSummary(draft);
    const b = await saveSummary(draft);
    await deleteSummary(a.id);
    expect((await listSummaries()).map((s) => s.id)).toEqual([b.id]);
  });

  it('전체 지우기는 요약만 지우고 동의 기록은 남긴다', async () => {
    await setConsent(true);
    await saveSummary(draft);
    await clearSummaries();
    expect(await listSummaries()).toEqual([]);
    expect(await getConsent()).toBe(true);
  });

  it('purgeExpired는 지운 개수를 돌려준다', async () => {
    await saveSummary(draft);
    await saveSummary(draft);
    vi.setSystemTime(T0 + RETENTION_MS);
    await saveSummary(draft);
    expect(await purgeExpired()).toBe(2);
    expect((await listSummaries()).length).toBe(1);
  });
});

describe('동의 기록', () => {
  it('기본은 false, 저장한 값을 돌려준다', async () => {
    expect(await getConsent()).toBe(false);
    await setConsent(true);
    expect(await getConsent()).toBe(true);
    await setConsent(false);
    expect(await getConsent()).toBe(false);
  });
});
