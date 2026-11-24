/**
 * 화면에서 일어난 일을 실제 기능(또는 체험용 예시)에 연결하는 흐름.
 *   말하기 → STT → 위기 키워드 → /api/turn(되묻기 0~3번) → 요약 카드
 *   → 부분 수정 → "맞아요" → 참고 연락처 → 폰 저장 → 창구 보여주기
 * 의존 기능은 주입받아 테스트에서 가짜로 바꿔 끼운다.
 */
import { detectCrisisKeywords } from '@lib/crisis';
import { ApiFailure, MESSAGE_KO } from '@lib/errors';
import type { Contact, Language, Message, SavedSummary, SlotKey } from '@lib/schema';
import { buildSummaryCard } from '@lib/summary';
import { errorText, type MessageKey } from '../i18n/index.js';
import type { RecorderErrorCode } from '../voice/useRecorder.js';
import type { Backend } from './backend.js';
import type { Store } from './store.js';
import type { AppError, DemoId, HomePanel } from './types.js';

export const MAX_TEXT = 2000;
const MAX_HISTORY = 30;

export interface StorageDeps {
  getConsent(): Promise<boolean>;
  setConsent(v: boolean): Promise<void>;
  listSummaries(): Promise<SavedSummary[]>;
  saveSummary(s: Omit<SavedSummary, 'id' | 'created_at' | 'expires_at'>): Promise<SavedSummary>;
  deleteSummary(id: string): Promise<void>;
  purgeExpired(): Promise<number>;
  requestPersistentStorage(): Promise<boolean>;
}

export interface PrefsDeps {
  loadLanguage(): Language | null;
  saveLanguage(lang: Language): void;
}

export interface FlowDeps {
  live: Backend;
  demo(id: DemoId): Backend;
  storage: StorageDeps;
  prefs: PrefsDeps;
}

export const NOT_HEARD: AppError = { key: 'NOT_HEARD', message_ko: errorText('ko', 'NOT_HEARD') };

function toAppError(err: unknown): AppError {
  if (err instanceof ApiFailure) return { key: err.error.code, message_ko: err.error.message_ko };
  return { key: 'AI_UNAVAILABLE', message_ko: MESSAGE_KO.AI_UNAVAILABLE };
}

export type Flow = ReturnType<typeof createFlow>;

export function createFlow(store: Store, deps: FlowDeps) {
  const { getState: get, dispatch } = store;

  const backend = (): Backend => {
    const s = get();
    return s.mode === 'demo' ? deps.demo(s.demoId ?? 'pension') : deps.live;
  };
  const needsConsent = () => {
    const s = get();
    if (s.mode === 'live' && !s.consent) {
      dispatch({ type: 'NEED_CONSENT' });
      return true;
    }
    return false;
  };
  const notice = (key: MessageKey, tone: 'info' | 'warn' = 'info') =>
    dispatch({ type: 'NOTICE', key, tone });

  async function refreshSaved() {
    try {
      dispatch({ type: 'SAVED_LIST', saved: await deps.storage.listSummaries() });
    } catch {
      /* 저장소를 못 쓰는 브라우저 */
    }
  }

  /** 사용자 말(음성·글·빠른 답)을 받아 정리·되묻기까지 */
  async function submitText(
    text: string,
    source: Message['source'],
    opts: { language?: Language; editSlot?: SlotKey | null } = {},
  ): Promise<void> {
    const trimmed = text.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
    if (!trimmed || needsConsent()) return;
    const s = get();
    const language = opts.language ?? s.language;
    const editSlot = opts.editSlot === undefined ? s.editSlot : opts.editSlot;
    const message: Message = { role: 'user', text: trimmed, language, source };

    dispatch({ type: 'USER_SAID', message });
    dispatch({ type: 'SET_PHASE', phase: 'thinking', heard: trimmed });

    // 생명·안전·생계 위기 말은 서버를 기다리지 않고 바로 안내(F11)
    if (detectCrisisKeywords(trimmed)) {
      dispatch({ type: 'CRISIS' });
      return;
    }

    try {
      const result = await backend().runTurn({
        history: [...s.history, message].slice(-MAX_HISTORY),
        slots: s.slots,
        ask_count: s.askCount,
        language,
        ...(editSlot ? { edit_slot: editSlot } : {}),
      });
      // 고치기는 그 항목만 바꾸고 바로 요약 확인으로. 더 물을 게 없으면 끝
      const done = result.done || !!editSlot || !result.next_question;
      dispatch({
        type: 'TURN_RESULT',
        result,
        done,
        card:
          done && !result.crisis
            ? buildSummaryCard(result.slots, result.questions_to_ask, language)
            : null,
      });
    } catch (err) {
      dispatch({ type: 'UNDO_LAST_MESSAGE' }); // 다시 하기 때 같은 말이 두 번 들어가지 않게
      dispatch({ type: 'ERROR', error: toAppError(err) });
    }
  }

  /** 녹음 → 글자 → submitText */
  async function submitVoice(blob: Blob): Promise<void> {
    if (needsConsent()) return;
    const editSlot = get().editSlot;
    dispatch({ type: 'SET_PHASE', phase: 'transcribing' });
    let text: string;
    let language: Language;
    try {
      ({ text, language } = await backend().transcribe(blob));
    } catch (err) {
      dispatch({ type: 'ERROR', error: toAppError(err) });
      return;
    }
    if (!text.trim()) {
      dispatch({ type: 'ERROR', error: NOT_HEARD });
      return;
    }
    // 외국어로 말하면 질문·안내도 그 언어로(카드는 한국어)
    if (language !== get().language) dispatch({ type: 'SET_LANGUAGE', language });
    await submitText(text, 'voice', { language, editSlot });
  }

  return {
    async startup() {
      const { storage, prefs } = deps;
      await storage.purgeExpired().catch(() => 0);
      void storage.requestPersistentStorage().catch(() => false);
      const consent = await storage.getConsent().catch(() => false);
      const saved = await storage.listSummaries().catch(() => [] as SavedSummary[]);
      let uiLanguage: Language | undefined;
      try {
        uiLanguage = prefs.loadLanguage() ?? undefined;
      } catch {
        /* 저장소 없음 */
      }
      dispatch({ type: 'READY', consent, saved, uiLanguage });
    },

    setUiLanguage(language: Language) {
      dispatch({ type: 'SET_UI_LANGUAGE', language });
      try {
        deps.prefs.saveLanguage(language);
      } catch {
        /* 저장 못 해도 이번엔 적용 */
      }
    },

    async giveConsent() {
      dispatch({ type: 'CONSENT_GIVEN' });
      await deps.storage.setConsent(true).catch(() => undefined);
    },

    /** 동의 없이 둘러보기·오류에서 체험 전환: 체험 모드 홈 */
    browseDemo() {
      dispatch({ type: 'START', mode: 'demo', demoId: null });
    },

    /** 예시 시나리오 시작: 준비한 첫 말을 넣고 바로 되묻기로 */
    async startDemo(id: DemoId) {
      dispatch({ type: 'START', mode: 'demo', demoId: id });
      const first = deps.demo(id).scriptedInput?.(0);
      if (first) await submitText(first, 'voice', { language: 'ko' });
    },

    submitText,
    submitVoice,

    /** 체험 모드 말하기: 녹음 대신 준비한 말을 넣는다 */
    async demoTalk() {
      const s = get();
      const userTurns = s.history.filter((m) => m.role === 'user').length;
      const text = backend().scriptedInput?.(userTurns);
      if (!text) {
        dispatch({ type: 'SET_PHASE', phase: 'idle' });
        return;
      }
      dispatch({ type: 'SET_PHASE', phase: 'transcribing' });
      await new Promise((r) => setTimeout(r, 400));
      await submitText(text, 'voice', { language: 'ko' });
    },

    /** 말하기를 시작해도 되는지(실제 모드는 동의 필요, 처리 중이면 안 됨) */
    canTalk(): boolean {
      if (get().phase !== 'idle') return false;
      return !needsConsent();
    },
    voiceStarted() {
      dispatch({ type: 'SET_PHASE', phase: 'recording' });
    },
    voiceCancelled() {
      dispatch({ type: 'SET_PHASE', phase: 'idle' });
    },
    voiceFailed(code: RecorderErrorCode) {
      dispatch({ type: 'SET_PHASE', phase: 'idle' });
      notice(`rec.${code}` as MessageKey, 'warn');
    },

    /** 질문을 그만하고 지금까지로 요약 */
    finishEarly() {
      const s = get();
      dispatch({
        type: 'FINISH_EARLY',
        card: buildSummaryCard(s.slots, s.questionsToAsk, s.language),
      });
    },

    startEdit(slot: SlotKey | null) {
      dispatch({ type: 'EDIT', slot });
    },

    /** "맞아요": 최종 카드로 참고 연락처 → 폰 저장 → 창구 보여주기 */
    async confirm() {
      const s = get();
      const card = s.card ?? buildSummaryCard(s.slots, s.questionsToAsk, s.language);
      dispatch({ type: 'SET_PHASE', phase: 'thinking', heard: '' });

      let contacts: Contact[] = [];
      let contactsFailed = false;
      try {
        contacts = await backend().fetchContacts(card);
      } catch {
        contactsFailed = true; // 연락처는 참고용: 못 받아도 카드는 보여 준다
      }

      if (s.mode === 'live') {
        try {
          await deps.storage.saveSummary({ card, slots: s.slots, history: s.history, contacts });
          await refreshSaved();
          notice('common.saved');
        } catch {
          /* 사생활 보호 모드 등: 저장 없이 계속 */
        }
      }
      dispatch({ type: 'SHOW', card, contacts, contactsFailed });
    },

    backToSummary() {
      dispatch({ type: 'BACK_TO_SUMMARY' });
    },

    openSaved(summary: SavedSummary) {
      dispatch({ type: 'OPEN_SAVED', summary });
    },

    async deleteSaved(id: string) {
      try {
        await deps.storage.deleteSummary(id);
      } catch {
        /* 이미 없음 */
      }
      await refreshSaved();
      notice('home.deleted');
      if (get().viewingSavedId === id) dispatch({ type: 'GO_HOME' });
    },

    goHome(panel?: HomePanel) {
      dispatch({ type: 'GO_HOME', panel });
    },
    setHomePanel(panel: HomePanel) {
      dispatch({ type: 'SET_HOME_PANEL', panel });
    },
    crisis() {
      dispatch({ type: 'CRISIS' });
    },
    leaveCrisis() {
      dispatch({ type: 'LEAVE_CRISIS' });
    },
    leaveError() {
      dispatch({ type: 'LEAVE_ERROR' });
    },
    clearNotice() {
      dispatch({ type: 'CLEAR_NOTICE' });
    },
  };
}
