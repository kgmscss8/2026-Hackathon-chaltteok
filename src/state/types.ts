import type {
  Contact,
  Language,
  Message,
  SavedSummary,
  SlotKey,
  Slots,
  SummaryCard,
  TurnResult,
} from '@lib/schema';
import type { ErrorKey, MessageKey } from '../i18n/index.js';

/** 화면에 띄울 오류: key로 사용자 언어 문구를 고른다 */
export interface AppError {
  key: ErrorKey;
  message_ko: string;
}

/** 화면 0~5 + 언제든 끼어드는 위기·오류. "듣는 중"(화면 2)은 phase로 겹쳐 보여 준다 */
export type Screen = 'consent' | 'home' | 'asking' | 'summary' | 'showing' | 'crisis' | 'error';
export type Mode = 'live' | 'demo';
export type DemoId = 'pension' | 'move';
/** 듣는 중 겹침 화면 단계 */
export type Phase = 'idle' | 'recording' | 'transcribing' | 'thinking';
export type HomePanel = 'none' | 'write' | 'pick';

export interface AppState {
  /** 앱 시작 처리(저장소·동의 복원)가 끝났는지 */
  ready: boolean;
  screen: Screen;
  /** 위기·오류 화면에서 돌아갈 곳 */
  returnTo: Screen;
  mode: Mode;
  demoId: DemoId | null;
  consent: boolean;
  /** 화면 문구 언어 */
  uiLanguage: Language;
  /** 대화 언어(STT가 감지하거나 화면 언어를 따름) */
  language: Language;

  history: Message[];
  slots: Slots;
  askCount: number;
  nextQuestion: string | null;
  quickAnswers: string[];
  questionsToAsk: string[];

  card: SummaryCard | null;
  contacts: Contact[];
  contactsFailed: boolean;
  /** 저장된 요약을 다시 연 경우 그 id(고치기 불가) */
  viewingSavedId: string | null;
  saved: SavedSummary[];
  editSlot: SlotKey | null;

  phase: Phase;
  /** 듣는 중 화면에 보여 줄 들은 내용 */
  heard: string;
  homePanel: HomePanel;
  error: AppError | null;
  /** 잠깐 띄우는 안내(저장·지움·녹음 오류 등) */
  notice: { key: MessageKey; tone: 'info' | 'warn' } | null;
}

export type Action =
  | { type: 'READY'; consent: boolean; saved: SavedSummary[]; uiLanguage?: Language }
  | { type: 'SET_UI_LANGUAGE'; language: Language }
  | { type: 'CONSENT_GIVEN' }
  | { type: 'START'; mode: Mode; demoId?: DemoId | null }
  | { type: 'GO_HOME'; panel?: HomePanel }
  | { type: 'SET_HOME_PANEL'; panel: HomePanel }
  | { type: 'SET_PHASE'; phase: Phase; heard?: string }
  | { type: 'SET_LANGUAGE'; language: Language }
  | { type: 'USER_SAID'; message: Message }
  | { type: 'UNDO_LAST_MESSAGE' }
  | { type: 'TURN_RESULT'; result: TurnResult; done: boolean; card: SummaryCard | null }
  | { type: 'FINISH_EARLY'; card: SummaryCard }
  | { type: 'EDIT'; slot: SlotKey | null }
  | { type: 'SHOW'; card: SummaryCard; contacts: Contact[]; contactsFailed: boolean }
  | { type: 'OPEN_SAVED'; summary: SavedSummary }
  | { type: 'SAVED_LIST'; saved: SavedSummary[] }
  | { type: 'BACK_TO_SUMMARY' }
  | { type: 'CRISIS' }
  | { type: 'LEAVE_CRISIS' }
  | { type: 'ERROR'; error: AppError }
  | { type: 'NEED_CONSENT' }
  | { type: 'LEAVE_ERROR' }
  | { type: 'NOTICE'; key: MessageKey; tone?: 'info' | 'warn' }
  | { type: 'CLEAR_NOTICE' };
