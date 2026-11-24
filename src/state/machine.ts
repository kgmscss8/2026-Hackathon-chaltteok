import type { Slots } from '@lib/schema';
import type { Action, AppState } from './types.js';

export const EMPTY_SLOTS: Slots = {
  whose_matter: { value: null, evidence: null },
  purpose: { value: null, evidence: null },
  desired: { value: null, evidence: null },
  date: { value: null, evidence: null },
  question: { value: null, evidence: null },
};

const EMPTY_CONVERSATION = {
  history: [],
  slots: EMPTY_SLOTS,
  askCount: 0,
  nextQuestion: null,
  quickAnswers: [],
  questionsToAsk: [],
  card: null,
  contacts: [],
  contactsFailed: false,
  viewingSavedId: null,
  editSlot: null,
  phase: 'idle',
  heard: '',
} satisfies Partial<AppState>;

export const INITIAL_STATE: AppState = {
  ready: false,
  screen: 'consent',
  returnTo: 'home',
  mode: 'live',
  demoId: null,
  consent: false,
  uiLanguage: 'ko',
  language: 'ko',
  saved: [],
  homePanel: 'none',
  error: null,
  notice: null,
  ...EMPTY_CONVERSATION,
};

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'READY': {
      const uiLanguage = action.uiLanguage ?? state.uiLanguage;
      return {
        ...state,
        ready: true,
        consent: action.consent,
        saved: action.saved,
        uiLanguage,
        language: uiLanguage,
        screen: action.consent && state.screen === 'consent' ? 'home' : state.screen,
      };
    }

    case 'SET_UI_LANGUAGE':
      return { ...state, uiLanguage: action.language, language: action.language };

    case 'CONSENT_GIVEN':
      return { ...state, consent: true, mode: 'live', demoId: null, screen: 'home' };

    case 'START':
      return {
        ...state,
        ...EMPTY_CONVERSATION,
        mode: action.mode,
        demoId: action.mode === 'demo' ? (action.demoId ?? null) : null,
        language: action.mode === 'demo' ? 'ko' : state.uiLanguage,
        screen: 'home',
        homePanel: 'none',
        error: null,
      };

    case 'GO_HOME':
      // 동의한 사람은 처음으로 가면 실제 모드로, 동의 전에는 체험만
      return {
        ...state,
        ...EMPTY_CONVERSATION,
        mode: state.consent ? 'live' : 'demo',
        demoId: state.consent ? null : state.demoId,
        language: state.uiLanguage,
        screen: 'home',
        homePanel: action.panel ?? 'none',
        error: null,
      };

    case 'SET_HOME_PANEL':
      return { ...state, homePanel: action.panel };

    case 'SET_PHASE':
      return {
        ...state,
        phase: action.phase,
        heard: action.heard ?? (action.phase === 'recording' ? '' : state.heard),
      };

    case 'SET_LANGUAGE':
      return { ...state, language: action.language, uiLanguage: action.language };

    case 'USER_SAID':
      return { ...state, history: [...state.history, action.message] };

    case 'UNDO_LAST_MESSAGE':
      return { ...state, history: state.history.slice(0, -1) };

    case 'TURN_RESULT': {
      const { result } = action;
      const base = {
        ...state,
        slots: result.slots,
        askCount: result.ask_count,
        questionsToAsk: result.questions_to_ask,
        phase: 'idle' as const,
        editSlot: null,
      };
      if (result.crisis)
        return {
          ...base,
          returnTo: state.screen === 'home' ? 'home' : state.screen,
          screen: 'crisis',
        };
      if (action.done) {
        return {
          ...base,
          nextQuestion: null,
          quickAnswers: [],
          card: action.card,
          screen: 'summary',
        };
      }
      return {
        ...base,
        nextQuestion: result.next_question,
        quickAnswers: result.quick_answers,
        screen: 'asking',
      };
    }

    case 'FINISH_EARLY':
      return {
        ...state,
        card: action.card,
        nextQuestion: null,
        quickAnswers: [],
        screen: 'summary',
      };

    case 'EDIT':
      return { ...state, editSlot: action.slot };

    case 'SHOW':
      return {
        ...state,
        card: action.card,
        contacts: action.contacts,
        contactsFailed: action.contactsFailed,
        viewingSavedId: null,
        phase: 'idle',
        screen: 'showing',
      };

    case 'OPEN_SAVED':
      return {
        ...state,
        ...EMPTY_CONVERSATION,
        card: action.summary.card,
        contacts: action.summary.contacts,
        slots: action.summary.slots,
        history: action.summary.history,
        viewingSavedId: action.summary.id,
        screen: 'showing',
      };

    case 'SAVED_LIST':
      return { ...state, saved: action.saved };

    case 'BACK_TO_SUMMARY':
      return { ...state, screen: 'summary' };

    case 'CRISIS':
      return {
        ...state,
        phase: 'idle',
        returnTo:
          state.screen === 'crisis' || state.screen === 'error' ? state.returnTo : state.screen,
        screen: 'crisis',
      };

    case 'LEAVE_CRISIS':
      return { ...state, screen: state.returnTo };

    case 'ERROR':
      return {
        ...state,
        phase: 'idle',
        error: action.error,
        returnTo:
          state.screen === 'crisis' || state.screen === 'error' ? state.returnTo : state.screen,
        screen: 'error',
      };

    case 'NEED_CONSENT':
      return { ...state, phase: 'idle', screen: 'consent' };

    case 'LEAVE_ERROR':
      return { ...state, error: null, screen: state.returnTo };

    case 'NOTICE':
      return { ...state, notice: { key: action.key, tone: action.tone ?? 'info' } };

    case 'CLEAR_NOTICE':
      return { ...state, notice: null };

    default:
      return state;
  }
}
