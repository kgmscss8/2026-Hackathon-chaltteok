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
  | 'consent'
  | 'home'
  | 'listening'
  | 'asking'
  | 'summary'
  | 'showing'
  | 'crisis'
  | 'error';

export type AppMode = 'live' | 'demo';

export interface AppState {
  screen: ScreenState;
  previousScreen: ScreenState | null;
  mode: AppMode;
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
    }
  | { type: 'SET_CARD'; card: SummaryCard }
  | { type: 'SET_CONTACTS'; contacts: Contact[] }
  | { type: 'SET_SAVED_SUMMARIES'; summaries: SavedSummary[] }
  | { type: 'SET_EDIT_SLOT'; slot: SlotKey | null }
  | { type: 'TRIGGER_CRISIS' }
  | { type: 'TRIGGER_ERROR'; error: ApiError }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_FLOW' };
