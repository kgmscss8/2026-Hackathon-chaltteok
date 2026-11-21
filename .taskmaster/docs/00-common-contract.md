# 찰떡 공통 계약 (4개 파트 공통, 모든 PRD에 포함)

> 이 섹션은 4명이 따로 만든 코드를 한 저장소에서 합치기 위한 약속이다.
> 여기 적힌 타입·경로·파일 소유는 **바꾸지 않는다**. 바꿔야 하면 `contract` 라벨 PR을 열고 4명 모두 승인 후 머지한다.

## 제품 한 줄 요약
찰떡은 주민센터·구청 방문 전에 민원인이 말하면 AI가 되묻기로 빠진 내용을 채워, 담당자가 바로 읽는 5줄 한국어 요약 카드로 정리해 주는 휴대폰 PWA다. 판단하지 않고 **대필**만 한다.

## 핵심 원칙 (모든 파트 공통)
1. 판단하지 않고 정리만 한다(자격·결과·준비물·법률 해석·민원 종류 확정 금지).
2. 말하지 않은 내용은 넣지 않는다. 모든 요약 항목은 원문 근거(`evidence`)가 있어야 하고, 없으면 `null`(미확인).
3. 기관·연락처는 `data/contacts.json`에서만. AI가 만들어 내지 않는다.
4. 위기 발언(생명·안전·생계) 감지 시 119·112·129 안내를 먼저 띄운다.
5. 첫 사용 시 "말한 내용은 정리를 위해 OpenAI로 전송되고, 저장은 내 폰에만 됩니다" 고지·동의.
6. 요약 확인·창구 보여주기 화면에 "AI는 틀릴 수 있습니다" 상시 표시.
7. 서버는 상태를 저장하지 않으며 민원 내용을 로그에 남기지 않는다(`api/`, `lib/`에서 `console.log` 금지, 오류는 코드만 기록).

## 스택 (고정)
TypeScript, React + Vite, Tailwind CSS, vite-plugin-pwa, Vercel Functions(`/api`), `openai` 공식 SDK, `zod`, `idb-keyval`, `react-qr-code`, ESLint/Prettier, Vitest.
배포: 공용 GitHub 저장소 `main` push → Vercel 자동 배포, PR마다 미리보기 배포. 환경변수 `OPENAI_API_KEY`는 Vercel에만(로컬은 `.env.local`, gitignore).

## AI 코딩 도구 (Claude Code 2명 + Gemini CLI 2명)
- 프로젝트 규칙은 **`AGENTS.md` 한 곳**에만 쓴다. `CLAUDE.md`와 `GEMINI.md`는 `@AGENTS.md` 한 줄로 그 파일을 불러온다. 두 도구가 같은 규칙을 읽게 하기 위해서다.
- 사람·도구마다 다른 설정은 커밋하지 않는다: `.taskmaster/config.json`(Claude 담당은 claude-code, Gemini 담당은 gemini-cli 모델), `.taskmaster/tasks/`, `.taskmaster/state.json`, `.claude/settings.local.json`, `.gemini/`, `.env*`.
- 에이전트가 다른 파트 소유 파일을 고치려 하면 멈추고 사람에게 확인한다.
- 어느 도구로 만들었든 PR 전에 `npm run lint && npm run typecheck && npm test`가 통과해야 한다(도구마다 코드 스타일이 달라지는 것을 Prettier·ESLint로 맞춘다).
- 리뷰는 서로 다른 도구를 쓰는 사람이 한다(Claude 담당 PR → Gemini 담당자가 리뷰, 반대도 같음).
- AI에게 작업을 시킬 때는 "공통 계약과 파일 소유 표를 지키고, 내 파트 소유 파일만 수정"하라고 항상 알려 준다(`AGENTS.md`에도 적어 둔다).

## 파일 소유 (자기 파트 파일만 수정한다)
| 파트 | 소유 파일·폴더 |
|---|---|
| **A. 기반·서버·데이터·저장** | `package.json`, `vite.config.ts`, `tailwind.config.*`, `tsconfig*.json`, `vercel.json`, `.eslintrc*`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.gitignore`, `lib/schema.ts`, `lib/errors.ts`, `lib/openai.ts`, `lib/masking.ts`, `lib/contactsTagger.ts`, `api/contacts.ts`, `data/contacts.json`, `src/storage/*`, `src/api/contacts.ts`, PWA 설정(manifest, service worker) |
| **B. 음성** | `api/transcribe.ts`, `api/tts.ts`, `src/voice/*`, `src/api/transcribe.ts`, `src/api/tts.ts` |
| **C. AI·프롬프트** | `api/turn.ts`, `lib/prompts.ts`, `lib/verify.ts`, `lib/crisis.ts`, `lib/summary.ts`, `data/slots.json`, `src/api/turn.ts`, `tests/fixtures/*` |
| **D. 화면·UX** | `index.html`, `src/main.tsx`, `src/App.tsx`, `src/screens/*`, `src/components/*`, `src/state/*`, `src/i18n/*`, `src/demo/*`, `public/*`(아이콘 제외 시 A와 협의) |

- 의존성 추가(`npm i`)가 필요하면 A에게 요청하거나, 자기 PR에서 `package.json` 변경만 따로 작은 커밋으로 올린다(충돌 최소화).
- 다른 파트 파일에 버그가 있으면 직접 고치지 말고 이슈/메시지로 알린다.

## 경로 별칭
- `@lib/*` → `lib/*` (프론트와 서버 함수 모두에서 import 가능)
- `@data/*` → `data/*`
- 서버 함수는 `lib/`를 **상대 경로**로 import 한다(Vercel 번들링 안정성). A가 Phase 0에서 미리보기 배포로 확인한다.

## 공통 타입 (`lib/schema.ts`, 소유 A — Phase 0에 이 내용 그대로 작성)
```ts
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
```

## API 규격 (고정)
| 메서드 | 경로 | 소유 | 요청 → 응답 |
|---|---|---|---|
| POST | `/api/transcribe` | B | multipart `audio`(webm/mp4, 최대 60초·4MB) → `TranscribeResponse` |
| POST | `/api/turn` | C | `TurnRequest` → `TurnResult` |
| POST | `/api/tts` | B | `TtsRequest` → `audio/mpeg` |
| POST | `/api/contacts` | A | `ContactsRequest` → `ContactsResponse` |

- 실패 시 HTTP 4xx/5xx + `ApiError` JSON. 공통 헬퍼는 `lib/errors.ts`(A)의 `sendError(res, code)`, `fromOpenAIError(err)`를 쓴다.
- OpenAI 클라이언트는 `lib/openai.ts`(A)의 `getOpenAI()`만 쓴다. 모델 이름은 같은 파일의 `MODELS` 상수에서 가져온다.
- OpenAI로 보내는 텍스트는 반드시 `lib/masking.ts`(A)의 `maskPII(text)`를 거친다.
- 프론트 호출 함수: `src/api/transcribe.ts`·`src/api/tts.ts`(B), `src/api/turn.ts`(C), `src/api/contacts.ts`(A). 모두 성공 시 결과, 실패 시 `ApiError`를 throw 하는 `ApiFailure` 클래스(`lib/errors.ts`)로 통일.

## 공유 함수 시그니처 (다른 파트가 import 하는 것)
```ts
// lib/errors.ts (A)
export class ApiFailure extends Error { constructor(public error: ApiError) }
export function sendError(res: VercelResponse, code: ErrorCode): void;
export function fromOpenAIError(err: unknown): ErrorCode; // 429/quota → RATE_LIMITED, 그 외 → AI_UNAVAILABLE
export const MESSAGE_KO: Record<ErrorCode, string>;       // 쉬운 말 안내 문구

// lib/masking.ts (A)
export function maskPII(text: string): string; // 주민등록번호·전화번호 → "******"

// lib/crisis.ts (C)
export function detectCrisisKeywords(text: string): boolean; // 프론트에서도 사용

// lib/summary.ts (C)
export function buildSummaryCard(slots: Slots, questionsToAsk: string[], spoken: Language): SummaryCard;

// src/storage/index.ts (A)
export function saveSummary(s: Omit<SavedSummary, 'id' | 'created_at' | 'expires_at'>): Promise<SavedSummary>;
export function listSummaries(): Promise<SavedSummary[]>; // 만료된 것은 지우고 반환
export function getSummary(id: string): Promise<SavedSummary | undefined>;
export function deleteSummary(id: string): Promise<void>;
export function getConsent(): Promise<boolean>;
export function setConsent(v: boolean): Promise<void>;

// src/voice/useRecorder.ts (B)
export function useRecorder(): { start(): void; stop(): Promise<Blob>; recording: boolean; error: string | null; supported: boolean };
// src/voice/speak.ts (B)
export function speak(text: string, language: Language): Promise<void>; // TTS 실패 시 조용히 무시(화면 문구는 그대로)
export function stopSpeaking(): void;
```

## 브랜치·머지 규칙
- `main` 보호: PR + 1명 이상 리뷰 + Vercel 미리보기 성공 후 머지.
- 브랜치 이름: `a/<작업>`, `b/<작업>`, `c/<작업>`, `d/<작업>`.
- 작은 PR을 자주 머지한다(하루 1회 이상 `main`을 rebase/merge).
- 다른 파트 기능이 아직 없으면 **목(mock)**으로 개발한다: D는 `src/demo`의 예시 시나리오, B·C는 Vitest와 curl로 단독 검증.
