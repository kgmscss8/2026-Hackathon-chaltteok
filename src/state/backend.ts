/**
 * 화면이 쓰는 서버 기능 묶음. 실제 모드(live)는 A·B·C의 API를,
 * 체험 모드(demo)는 src/demo의 예시 데이터를 같은 모양으로 돌려준다(D1).
 */
import type { Contact, Language, SummaryCard, TurnRequest, TurnResult } from '@lib/schema';
import { fetchContacts } from '../api/contacts.js';
import { transcribe } from '../api/transcribe.js';
import { runTurn } from '../api/turn.js';

export interface Backend {
  transcribe(blob: Blob): Promise<{ text: string; language: Language }>;
  runTurn(req: TurnRequest): Promise<TurnResult>;
  fetchContacts(card: SummaryCard): Promise<Contact[]>;
  /** 체험 모드: 지금 차례에 미리 준비한 사용자 말 */
  scriptedInput?(userTurns: number): string | null;
}

export const liveBackend: Backend = {
  // 언어 힌트를 주지 않아 외국어도 그대로 받아 적는다(F10)
  transcribe: (blob) => transcribe(blob),
  runTurn: (req) => runTurn(req),
  fetchContacts: async (card) => (await fetchContacts(card)).contacts,
};
