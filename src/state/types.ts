import type {
  Contact,
  Language,
  Message,
  SavedSummary,
  SlotKey,
  Slots,
  SummaryCard,
  ApiError,
} from '../../lib/schema.js';

export type ScreenState =
  'consent' | 'home' | 'listening' | 'asking' | 'summary' | 'showing' | 'crisis' | 'error';

export type AppMode = 'live' | 'demo';
export type DemoScenarioId = 'pension' | 'moving';

export interface AppState {
  screen: ScreenState;
  previousScreen: ScreenState | null;
  mode: AppMode;
  /** 체험 모드에서 진행 중인 예시 시나리오 */
  demoScenario: DemoScenarioId;
  /** 서버 응답을 기다리는 중 (버튼 잠금·안내 표시용) */
  busy: boolean;
  /** /api/turn이 돌려준 "창구에서 물어볼 것" (요약 카드 ⑤) */
  questionsToAsk: string[];
  consentGiven: boolean;
  language: Language;
  history: Message[];
  slots: Slots;
  askCount: number;
  nextQuestion: string | null;
  quickAnswers: string[];
  currentCard: SummaryCard | null;
  contacts: Contact[];
  savedSummaries: SavedSummary[];
  error: ApiError | null;
  editSlot: SlotKey | null;
  interimTranscript: string;
  isRecording: boolean;
}

export type AppAction =
  | { type: 'GIVE_CONSENT' }
  | { type: 'NAVIGATE'; screen: ScreenState }
  | { type: 'SET_MODE'; mode: AppMode }
  | { type: 'SET_LANGUAGE'; language: Language }
  | { type: 'START_LISTENING' }
  | { type: 'STOP_LISTENING' }
  | { type: 'SET_TRANSCRIPT'; text: string }
  | {
      type: 'ADD_MESSAGE';
      message: Message;
    }
  | {
      type: 'SET_TURN_RESULT';
      slots: Slots;
      nextQuestion: string | null;
      quickAnswers: string[];
      askCount: number;
      done: boolean;
      crisis: boolean;
      questionsToAsk?: string[];
    }
  | { type: 'SET_BUSY'; busy: boolean }
  | { type: 'SET_DEMO_SCENARIO'; id: DemoScenarioId }
  | { type: 'SET_CARD'; card: SummaryCard }
  | { type: 'SET_CONTACTS'; contacts: Contact[] }
  | { type: 'SET_SAVED_SUMMARIES'; summaries: SavedSummary[] }
  | { type: 'SET_EDIT_SLOT'; slot: SlotKey | null }
  | { type: 'TRIGGER_CRISIS' }
  | { type: 'TRIGGER_ERROR'; error: ApiError }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_FLOW' };
