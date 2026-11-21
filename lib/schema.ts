import { z } from 'zod';

export const SLOT_KEYS = ['whose_matter', 'purpose', 'desired', 'date', 'question'] as const;
export type SlotKey = (typeof SLOT_KEYS)[number];

// 지원 언어: 한국어 + 시연 언어 1~2개 (킥오프에서 확정, 기본안 en, vi)
export const Language = z.enum(['ko', 'en', 'vi']);
export type Language = z.infer<typeof Language>;

// value는 항상 한국어, evidence는 사용자가 실제로 한 말(원래 언어) 그대로
export const SlotValue = z.object({
  value: z.string().nullable(),
  evidence: z.string().nullable(),
});
export const Slots = z.object({
  whose_matter: SlotValue, // 누구의 일인지 (본인/가족 대신)
  purpose: SlotValue,      // 용건
  desired: SlotValue,      // 원하는 것
  date: SlotValue,         // 관련 날짜·기한
  question: SlotValue,     // 궁금한 점
});
export type Slots = z.infer<typeof Slots>;

export const Message = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().max(2000),
  language: Language,
  source: z.enum(['voice', 'text', 'quick']), // 말하기 / 글로 쓰기 / 빠른 답·보기에서 고르기
});
export type Message = z.infer<typeof Message>;

// POST /api/turn 요청
export const TurnRequest = z.object({
  history: z.array(Message).max(30),
  slots: Slots,
  ask_count: z.number().int().min(0).max(3),
  language: Language,
  edit_slot: z.enum(SLOT_KEYS).optional(), // 부분 수정: 이 슬롯만 갱신
});
export type TurnRequest = z.infer<typeof TurnRequest>;

// POST /api/turn 응답
export const TurnResult = z.object({
  slots: Slots,
  questions_to_ask: z.array(z.string()),   // 창구에서 물어볼 것(한국어)
  next_question: z.string().nullable(),     // 사용자 언어, done이면 null
  quick_answers: z.array(z.string()),       // 사용자 언어, 마지막 3개는 항상 해당 없어요/잘 모르겠어요/직접 말할게요
  ask_count: z.number().int().min(0).max(3),
  done: z.boolean(),
  crisis: z.boolean(),
});
export type TurnResult = z.infer<typeof TurnResult>;

// 담당자용 요약 카드 (항상 한국어, 화면에 최대 5줄)
export const SummaryCard = z.object({
  who: z.string(),               // ① 누구의 일 예: "어머니(본인 아님)의 기초연금 신청 건"
  situation: z.string(),         // ② 현재 상황
  request: z.string(),           // ③ 요청
  unknowns: z.array(z.string()), // ④ 미확인 항목(슬롯 이름 한국어)
  to_ask: z.array(z.string()),   // ⑤ 물어볼 것
  spoken_language: Language,
});
export type SummaryCard = z.infer<typeof SummaryCard>;

export const ContactTag = z.enum(['welfare', 'resident', 'general']);
export const Contact = z.object({
  tags: z.array(ContactTag),
  name: z.string(),
  phone: z.string().nullable(),
  scope: z.string(),
  source: z.string().url().nullable(),
  checked_at: z.string(), // YYYY-MM-DD
});
export type Contact = z.infer<typeof Contact>;

// POST /api/contacts
export const ContactsRequest = z.object({ card: SummaryCard });
export const ContactsResponse = z.object({ tags: z.array(ContactTag), contacts: z.array(Contact) });
export type ContactsResponse = z.infer<typeof ContactsResponse>;

// POST /api/transcribe 응답 (요청은 multipart/form-data: audio 파일 + language 힌트 선택)
export const TranscribeResponse = z.object({ text: z.string(), language: Language });

// POST /api/tts 요청 (응답은 audio/mpeg 바이너리)
export const TtsRequest = z.object({ text: z.string().max(500), language: Language });

// 모든 API 오류 응답
export const ErrorCode = z.enum(['AI_UNAVAILABLE', 'RATE_LIMITED', 'BAD_JSON', 'BAD_REQUEST']);
export const ApiError = z.object({ code: ErrorCode, message_ko: z.string() });
export type ApiError = z.infer<typeof ApiError>;

// 폰 IndexedDB 저장 단위
export const SavedSummary = z.object({
  id: z.string(),
  card: SummaryCard,
  slots: Slots,
  history: z.array(Message), // "내가 한 말 보기"용 원문
  contacts: z.array(Contact),
  created_at: z.number(),
  expires_at: z.number(),    // 기본 created_at + 7일
});
export type SavedSummary = z.infer<typeof SavedSummary>;
