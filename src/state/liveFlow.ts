/**
 * 실제 모드(live) 흐름: 화면에서 일어난 일을 A·B·C의 실제 기능에 연결한다.
 *   말하기 → STT(B) → 위기 키워드(C) → /api/turn(C) → 요약 카드(C)
 *   → "맞아요" → 참고 연락처(A) → 폰 저장(A) → 창구 보여주기
 * 의존 함수는 주입할 수 있어 테스트에서 가짜로 바꿔 끼운다.
 */
import { detectCrisisKeywords } from '../../lib/crisis.js';
import { ApiFailure, toApiError } from '../../lib/errors.js';
import type { ApiError, Contact, Language, Message, SlotKey } from '../../lib/schema.js';
import { buildSummaryCard } from '../../lib/summary.js';
import { fetchContacts } from '../api/contacts.js';
import { transcribe } from '../api/transcribe.js';
import { runTurn } from '../api/turn.js';
import {
  getConsent,
  listSummaries,
  purgeExpired,
  requestPersistentStorage,
  saveSummary,
  setConsent,
} from '../storage/index.js';
import type { AppAction, AppState } from './types.js';

export interface LiveDeps {
  runTurn: typeof runTurn;
  transcribe: typeof transcribe;
  fetchContacts: typeof fetchContacts;
  saveSummary: typeof saveSummary;
  listSummaries: typeof listSummaries;
  getConsent: typeof getConsent;
  setConsent: typeof setConsent;
  purgeExpired: typeof purgeExpired;
  requestPersistentStorage: typeof requestPersistentStorage;
}

export const defaultLiveDeps: LiveDeps = {
  runTurn,
  transcribe,
  fetchContacts,
  saveSummary,
  listSummaries,
  getConsent,
  setConsent,
  purgeExpired,
  requestPersistentStorage,
};

export const NOT_HEARD: ApiError = {
  code: 'BAD_REQUEST',
  message_ko: '잘 들리지 않았어요. 조금 더 가까이에서 다시 말씀하시거나 글로 써 주세요.',
};

const MAX_TEXT = 2000;
const MAX_HISTORY = 30;

function toError(err: unknown): ApiError {
  return err instanceof ApiFailure ? err.error : toApiError('AI_UNAVAILABLE');
}

export type LiveActions = ReturnType<typeof createLiveActions>;

export function createLiveActions(
  getState: () => AppState,
  dispatch: (action: AppAction) => void,
  deps: LiveDeps = defaultLiveDeps,
) {
  /** 사용자 말(음성·글·빠른 답)을 받아 /api/turn까지 처리한다. */
  async function submitUserText(
    text: string,
    source: Message['source'],
    language?: Language,
    options: { editSlot?: SlotKey } = {},
  ): Promise<void> {
    const s = getState();
    const trimmed = text.trim().slice(0, MAX_TEXT);
    if (!trimmed) return;
    if (!s.consentGiven) {
      // 동의 없이는 OpenAI로 보내지 않는다(핵심 원칙 5)
      dispatch({ type: 'NAVIGATE', screen: 'consent' });
      return;
    }

    const lang = language ?? s.language;
    const message: Message = { role: 'user', text: trimmed, language: lang, source };
    dispatch({ type: 'ADD_MESSAGE', message });

    // 위기 키워드는 서버 응답을 기다리지 않고 바로 안내한다(F11)
    if (detectCrisisKeywords(trimmed)) {
      dispatch({ type: 'TRIGGER_CRISIS' });
      return;
    }

    const editSlot = options.editSlot ?? s.editSlot;
    dispatch({ type: 'SET_BUSY', busy: true });
    try {
      const result = await deps.runTurn({
        history: [...s.history, message].slice(-MAX_HISTORY),
        slots: s.slots,
        ask_count: s.askCount,
        language: lang,
        ...(editSlot ? { edit_slot: editSlot } : {}),
      });
      // 부분 수정은 그 항목만 고치고 바로 요약 확인으로 돌아간다
      const done = result.done || editSlot !== null;
      dispatch({
        type: 'SET_TURN_RESULT',
        slots: result.slots,
        nextQuestion: result.next_question,
        quickAnswers: result.quick_answers,
        askCount: result.ask_count,
        done,
        crisis: result.crisis,
        questionsToAsk: result.questions_to_ask,
      });
      if (done && !result.crisis) {
        dispatch({
          type: 'SET_CARD',
          card: buildSummaryCard(result.slots, result.questions_to_ask, lang),
        });
      }
      if (editSlot) dispatch({ type: 'SET_EDIT_SLOT', slot: null });
    } catch (err) {
      dispatch({ type: 'TRIGGER_ERROR', error: toError(err) });
    } finally {
      dispatch({ type: 'SET_BUSY', busy: false });
    }
  }

  /** 녹음 파일 → 글자 → submitUserText */
  async function submitVoice(blob: Blob): Promise<void> {
    if (!getState().consentGiven) {
      dispatch({ type: 'NAVIGATE', screen: 'consent' });
      return;
    }
    dispatch({ type: 'SET_BUSY', busy: true });
    let text: string;
    let language: Language;
    try {
      // 언어 힌트를 주지 않아 외국어도 그대로 받아 적게 한다(F10)
      ({ text, language } = await deps.transcribe(blob));
    } catch (err) {
      dispatch({ type: 'SET_BUSY', busy: false });
      dispatch({ type: 'TRIGGER_ERROR', error: toError(err) });
      return;
    }
    dispatch({ type: 'SET_BUSY', busy: false });

    if (!text.trim()) {
      dispatch({ type: 'TRIGGER_ERROR', error: NOT_HEARD });
      return;
    }
    dispatch({ type: 'SET_TRANSCRIPT', text });
    dispatch({ type: 'SET_LANGUAGE', language });
    await submitUserText(text, 'voice', language);
  }

  /** 요약 확인 "맞아요": 최종 카드로 참고 연락처를 받고 폰에 저장한 뒤 창구 보여주기로 */
  async function confirmSummary(): Promise<void> {
    const s = getState();
    const card = s.currentCard ?? buildSummaryCard(s.slots, s.questionsToAsk, s.language);
    dispatch({ type: 'SET_CARD', card });
    dispatch({ type: 'SET_BUSY', busy: true });

    let contacts: Contact[];
    try {
      contacts = (await deps.fetchContacts(card)).contacts;
    } catch {
      // 연락처는 참고용이다. 못 받아도 카드는 보여 준다.
      contacts = [];
    }
    dispatch({ type: 'SET_CONTACTS', contacts });

    try {
      await deps.saveSummary({ card, slots: s.slots, history: s.history, contacts });
      dispatch({ type: 'SET_SAVED_SUMMARIES', summaries: await deps.listSummaries() });
    } catch {
      // 저장소를 못 쓰는 브라우저(사생활 보호 모드 등)에서도 화면은 계속 보여 준다
    }

    dispatch({ type: 'SET_BUSY', busy: false });
    dispatch({ type: 'NAVIGATE', screen: 'showing' });
  }

  /** "동의하고 시작하기": 동의는 폰에만 기록 */
  async function giveConsent(): Promise<void> {
    dispatch({ type: 'SET_MODE', mode: 'live' });
    dispatch({ type: 'GIVE_CONSENT' });
    try {
      await deps.setConsent(true);
    } catch {
      // 기록을 못 해도 이번 사용은 계속한다(다음에 다시 물어봄)
    }
  }

  /** 앱 시작: 만료 정리 → 영구 저장 요청 → 이전 동의 복원 → 저장 목록 */
  async function startup(): Promise<void> {
    try {
      await deps.purgeExpired();
    } catch {
      /* 저장소 없음 */
    }
    void deps.requestPersistentStorage().catch(() => false);
    try {
      if (await deps.getConsent()) dispatch({ type: 'GIVE_CONSENT' });
    } catch {
      /* 저장소 없음 → 동의 화면부터 */
    }
    try {
      dispatch({ type: 'SET_SAVED_SUMMARIES', summaries: await deps.listSummaries() });
    } catch {
      /* 저장소 없음 */
    }
  }

  return { submitUserText, submitVoice, confirmSummary, giveConsent, startup };
}
