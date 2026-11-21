import type { Slots } from '../../lib/schema.js';
import type { AppAction, AppState } from './types.js';

export const INITIAL_SLOTS: Slots = {
  whose_matter: { value: null, evidence: null },
  purpose: { value: null, evidence: null },
  desired: { value: null, evidence: null },
  date: { value: null, evidence: null },
  question: { value: null, evidence: null },
};

export const INITIAL_STATE: AppState = {
  screen: 'consent',
  previousScreen: null,
  mode: 'live', // 실제 API 사용. 예시 체험·사용량 초과 시 'demo'로 전환
  demoScenario: 'pension',
  busy: false,
  questionsToAsk: [],
  consentGiven: false,
  language: 'ko',
  history: [],
  slots: INITIAL_SLOTS,
  askCount: 0,
  nextQuestion: null,
  quickAnswers: [],
  currentCard: null,
  contacts: [],
  savedSummaries: [],
  error: null,
  editSlot: null,
  interimTranscript: '',
  isRecording: false,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'GIVE_CONSENT':
      return {
        ...state,
        consentGiven: true,
        screen: 'home',
      };

    case 'NAVIGATE':
      return {
        ...state,
        previousScreen: state.screen,
        screen: action.screen,
      };

    case 'SET_MODE':
      return {
        ...state,
        mode: action.mode,
      };

    case 'SET_LANGUAGE':
      return {
        ...state,
        language: action.language,
      };

    case 'START_LISTENING':
      return {
        ...state,
        previousScreen: state.screen,
        screen: 'listening',
        isRecording: true,
        interimTranscript: '',
      };

    case 'STOP_LISTENING':
      return {
        ...state,
        isRecording: false,
      };

    case 'SET_TRANSCRIPT':
      return {
        ...state,
        interimTranscript: action.text,
      };

    case 'ADD_MESSAGE':
      return {
        ...state,
        history: [...state.history, action.message],
      };

    case 'SET_TURN_RESULT': {
      const questionsToAsk = action.questionsToAsk ?? state.questionsToAsk;
      if (action.crisis) {
        return {
          ...state,
          previousScreen: state.screen,
          screen: 'crisis',
          slots: action.slots,
          questionsToAsk,
        };
      }
      if (action.done) {
        return {
          ...state,
          previousScreen: state.screen,
          screen: 'summary',
          slots: action.slots,
          askCount: action.askCount,
          nextQuestion: null,
          quickAnswers: [],
          questionsToAsk,
        };
      }
      return {
        ...state,
        previousScreen: state.screen,
        screen: 'asking',
        slots: action.slots,
        askCount: action.askCount,
        nextQuestion: action.nextQuestion,
        quickAnswers: action.quickAnswers,
        questionsToAsk,
      };
    }

    case 'SET_BUSY':
      return { ...state, busy: action.busy };

    case 'SET_DEMO_SCENARIO':
      return { ...state, demoScenario: action.id };

    case 'SET_CARD':
      return {
        ...state,
        currentCard: action.card,
      };

    case 'SET_CONTACTS':
      return {
        ...state,
        contacts: action.contacts,
      };

    case 'SET_SAVED_SUMMARIES':
      return {
        ...state,
        savedSummaries: action.summaries,
      };

    case 'SET_EDIT_SLOT':
      return {
        ...state,
        editSlot: action.slot,
      };

    case 'TRIGGER_CRISIS':
      return {
        ...state,
        previousScreen: state.screen,
        screen: 'crisis',
      };

    case 'TRIGGER_ERROR':
      return {
        ...state,
        previousScreen: state.screen,
        screen: 'error',
        error: action.error,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
        screen: state.previousScreen || 'home',
      };

    case 'RESET_FLOW':
      return {
        ...state,
        // 처음으로 돌아가면 동의한 사용자는 실제 모드로 복귀(동의 전에는 체험만 가능)
        mode: state.consentGiven ? 'live' : 'demo',
        busy: false,
        questionsToAsk: [],
        screen: 'home',
        previousScreen: null,
        history: [],
        slots: INITIAL_SLOTS,
        askCount: 0,
        nextQuestion: null,
        quickAnswers: [],
        currentCard: null,
        contacts: [],
        error: null,
        editSlot: null,
        interimTranscript: '',
        isRecording: false,
      };

    default:
      return state;
  }
}
