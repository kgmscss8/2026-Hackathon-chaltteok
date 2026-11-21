/**
 * 폰 로컬 저장(IndexedDB). 확인된 요약과 외부 전송 동의 여부는 이 폰에만 저장한다.
 * 서버에는 아무것도 저장하지 않는다.
 */
import { clear, createStore, del, delMany, entries, get, set, type UseStore } from 'idb-keyval';
import { SavedSummary } from '@lib/schema';

/** 저장한 요약의 기본 보관 기간: 7일 */
export const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

const CONSENT_KEY = 'consent';

let summaryStore: UseStore | null = null;
let settingsStore: UseStore | null = null;

// 스토어는 처음 쓸 때 연다(모듈을 import만 해서는 IndexedDB를 건드리지 않는다).
function summaries(): UseStore {
  return (summaryStore ??= createStore('chalddeok-summaries', 'summaries'));
}
function settings(): UseStore {
  return (settingsStore ??= createStore('chalddeok-settings', 'settings'));
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isExpired(s: Pick<SavedSummary, 'expires_at'>, now: number): boolean {
  return s.expires_at <= now;
}

/** 확인된 요약을 저장한다. id·저장 시각·만료 시각(7일 뒤)은 여기서 붙인다. */
export async function saveSummary(
  s: Omit<SavedSummary, 'id' | 'created_at' | 'expires_at'>,
): Promise<SavedSummary> {
  const created_at = Date.now();
  const saved = SavedSummary.parse({
    ...s,
    id: newId(),
    created_at,
    expires_at: created_at + RETENTION_MS,
  });
  await set(saved.id, saved, summaries());
  return saved;
}

/**
 * 저장된 요약 목록(최신순). 만료됐거나 형식이 깨진 항목은 지우고 뺀다.
 */
export async function listSummaries(): Promise<SavedSummary[]> {
  const now = Date.now();
  const all = await entries<string, unknown>(summaries());
  const keep: SavedSummary[] = [];
  const drop: string[] = [];
  for (const [key, value] of all) {
    const parsed = SavedSummary.safeParse(value);
    if (!parsed.success || isExpired(parsed.data, now)) drop.push(key);
    else keep.push(parsed.data);
  }
  if (drop.length > 0) await delMany(drop, summaries());
  return keep.sort((a, b) => b.created_at - a.created_at);
}

/** 요약 하나를 다시 연다. 없거나 만료됐으면 undefined(만료된 것은 지운다). */
export async function getSummary(id: string): Promise<SavedSummary | undefined> {
  const parsed = SavedSummary.safeParse(await get(id, summaries()));
  if (!parsed.success) return undefined;
  if (isExpired(parsed.data, Date.now())) {
    await del(id, summaries());
    return undefined;
  }
  return parsed.data;
}

export async function deleteSummary(id: string): Promise<void> {
  await del(id, summaries());
}

/** 저장된 요약을 모두 지운다(동의 기록은 남긴다). */
export async function clearSummaries(): Promise<void> {
  await clear(summaries());
}

/** 앱 시작 시 호출: 만료된 요약을 지우고, 지운 개수를 돌려준다. */
export async function purgeExpired(): Promise<number> {
  const before = (await entries(summaries())).length;
  const after = (await listSummaries()).length;
  return before - after;
}

/** 외부 전송(OpenAI) 동의 여부. 기록이 없으면 false. */
export async function getConsent(): Promise<boolean> {
  return (await get<boolean>(CONSENT_KEY, settings())) === true;
}

export async function setConsent(v: boolean): Promise<void> {
  await set(CONSENT_KEY, v, settings());
}

/**
 * 브라우저가 저장소를 함부로 비우지 않도록 영구 저장을 요청한다(지원하지 않으면 false).
 * 앱 시작 시 한 번 호출하면 된다.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

/** 테스트용: 열어 둔 스토어 핸들을 버린다. */
export function resetStoresForTest(): void {
  summaryStore = null;
  settingsStore = null;
}
