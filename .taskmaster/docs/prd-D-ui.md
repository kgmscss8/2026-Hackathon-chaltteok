# 찰떡 PRD — 파트 D: 화면·UX (5개 화면·대화 흐름·창구 보여주기·예시 체험)

> 담당: 팀원 D · task-master 태그: `d-ui`
> 이 문서는 전체 PRD 중 **파트 D만** 다룬다. 다른 파트(A 기반, B 음성, C AI)의 기능은 구현하지 않고 가져다 쓴다.

<context>

# Overview
파트 D는 사용자가 실제로 보는 모든 화면과 화면 사이의 흐름(대화 상태)을 만든다. 대상은 고령층·외국인 주민·보호자이고, 마지막 화면은 창구 담당자가 읽는다. 앱을 켜면 바로 말하기로 시작하고, 큰 글씨·큰 버튼·음성 안내가 기본이다. 다른 파트 기능이 준비되기 전에는 **예시 시나리오(목)로 전체 흐름을 먼저 관통**시킨다.

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

## 파일 소유 (자기 파트 파일만 수정한다)
| 파트 | 소유 파일·폴더 |
|---|---|
| **A. 기반·서버·데이터·저장** | `package.json`, `vite.config.ts`, `tailwind.config.*`, `tsconfig*.json`, `vercel.json`, `.eslintrc*`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.gitignore`, `lib/schema.ts`, `lib/errors.ts`, `lib/openai.ts`, `lib/masking.ts`, `lib/contactsTagger.ts`, `api/contacts.ts`, `data/contacts.json`, `src/storage/*`, `src/api/contacts.ts`, PWA 설정(manifest, service worker) |
| **B. 음성** | `api/transcribe.ts`, `api/tts.ts`, `src/voice/*`, `src/api/transcribe.ts`, `src/api/tts.ts` |
| **C. AI·프롬프트** | `api/turn.ts`, `lib/prompts.ts`, `lib/verify.ts`, `lib/crisis.ts`, `lib/summary.ts`, `data/slots.json`, `src/api/turn.ts`, `tests/fixtures/*` |
| **D. 화면·UX** | `index.html`, `src/main.tsx`, `src/App.tsx`, `src/screens/*`, `src/components/*`, `src/state/*`, `src/i18n/*`, `src/demo/*`, `public/*`(아이콘 제외 시 A와 협의) |

- 의존성 추가(`npm i`)가 필요하면 A에게 요청하거나, 자기 PR에서 `package.json` 변경만 따로 작은 커밋으로 올린다(충돌 최소화).
- 다른 파트 파일에 버그가 있으면 직접 고치지 말고 이슈/메시지로 알린다.

## AI 코딩 도구 (Claude Code 2명 + Gemini CLI 2명)
- 프로젝트 규칙은 **`AGENTS.md` 한 곳**에만 쓴다. `CLAUDE.md`와 `GEMINI.md`는 `@AGENTS.md` 한 줄로 그 파일을 불러온다. 두 도구가 같은 규칙을 읽게 하기 위해서다.
- 사람·도구마다 다른 설정은 커밋하지 않는다: `.taskmaster/config.json`(Claude 담당은 claude-code, Gemini 담당은 gemini-cli 모델), `.taskmaster/tasks/`, `.taskmaster/state.json`, `.claude/settings.local.json`, `.gemini/`, `.env*`.
- 에이전트가 다른 파트 소유 파일을 고치려 하면 멈추고 사람에게 확인한다.
- 어느 도구로 만들었든 PR 전에 `npm run lint && npm run typecheck && npm test`가 통과해야 한다(도구마다 코드 스타일이 달라지는 것을 Prettier·ESLint로 맞춘다).
- 리뷰는 서로 다른 도구를 쓰는 사람이 한다(Claude 담당 PR → Gemini 담당자가 리뷰, 반대도 같음).
- AI에게 작업을 시킬 때는 "공통 계약과 파일 소유 표를 지키고, 내 파트 소유 파일만 수정"하라고 항상 알려 준다(`AGENTS.md`에도 적어 둔다).

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


# Core Features (파트 D 범위)

## D1. 대화 상태와 흐름 (`src/state`)
- 상태 머신: `consent → home → listening → asking ⇄ (listening/typing) → summary → (edit) → showing`, 어느 단계에서든 `crisis`, `error`로 끼어들 수 있다.
- 폰이 `history`, `slots`, `ask_count`, `language`를 들고 매 요청에 함께 보낸다(서버 stateless).
- API 어댑터: `mode: 'live' | 'demo'`. demo면 `src/demo`의 예시 데이터로 같은 인터페이스를 흉내 낸다. `RATE_LIMITED`를 받으면 "예시로 체험하기" 제안 후 demo로 전환.
- 언어: `transcribe` 결과의 `language`를 대화 언어로 사용. UI 문구는 `src/i18n`(ko + 시연 언어).

## D2. 첫 사용 안내 (화면 0, F12·원칙 5)
- "말한 내용은 정리를 위해 OpenAI로 전송되고, 저장은 내 폰에만 됩니다" 고지 + "동의하고 시작" 큰 버튼. 음성으로도 읽어 줌.
- 동의 여부는 `setConsent`(A). 동의 전에는 API 호출 금지, 예시 체험은 가능.

## D3. 홈 (화면 1, F1)
- 가장 큰 "눌러서 말하기" 버튼(누르는 동안만 녹음, `useRecorder`(B)). 아래 "글로 쓰기", "보기에서 고르기"(용건 예시 버튼 목록) 버튼.
- 저장된 요약 목록(`listSummaries`(A)): 날짜·누구의 일 표시, 다시 열기·지우기.
- "예시로 체험하기" 버튼 2개(시나리오 2종).
- 첫 터치 때 `unlockAudio()`(B) 호출.

## D4. 듣는 중 (화면 2)
- 녹음 중 표시(색만이 아닌 아이콘+글자 "듣고 있어요"), 인식된 텍스트 표시.
- 인식 직후 `detectCrisisKeywords`(C)로 즉시 위기 확인.

## D5. 되묻기 (화면 3, F3)
- `next_question`을 큰 글씨로 보여 주고 `speak()`(B)로 읽어 줌.
- 빠른 답 버튼(`quick_answers`, 항상 해당 없어요/잘 모르겠어요/직접 말할게요 포함), "직접 말할게요" → 말하기, 글로 쓰기 선택.
- 진행 표시("질문 1/3"). `done`이면 요약 확인으로.

## D6. 요약 확인 (화면 4, F4·F5)
- `buildSummaryCard`(C)로 카드 생성, 항목별 큰 글씨 + 읽어 주기.
- 항목을 누르면 그 항목만 다시 말하기/고치기(`edit_slot`으로 `/api/turn` 호출), 처음부터 다시 하지 않음.
- "내가 한 말 보기": `history`의 사용자 원문과 각 항목 `evidence` 표시.
- "맞아요" → `/api/contacts`(A) 호출 → `saveSummary`(A) → 창구 보여주기.
- "AI는 틀릴 수 있습니다" 상시 표시.

## D7. 담당자용 카드·창구 보여주기 (화면 5, F6·F7·F2)
- 5줄 이내, 굵은 고딕 22px 이상: ① 누구의 일 ② 현재 상황 ③ 요청 ④ 미확인 ⑤ 물어볼 것.
- 전체 화면 버튼(Fullscreen API), 가로 전환 지원, 최대 글씨.
- QR: `react-qr-code`로 **요약 텍스트 자체**를 담는다(URL 아님). 길이 초과 시 줄여 담기.
- 참고 연락처(`ContactsResponse`): 기관명·안내 범위·전화 걸기 버튼(`tel:`), 출처·확인일, "자세한 내용은 위 기관에 상담하세요".
- "AI는 틀릴 수 있습니다" 상시 표시. 오프라인에서도 저장된 요약으로 열림.

## D8. 위기 안내·오류 안내 (F11·F13)
- 위기: 119(긴급)·112(범죄)·129(복지 위기) 큰 전화 버튼 화면을 최우선으로 띄우고, "계속 정리하기"로 돌아갈 수 있음.
- 오류: `ApiError.message_ko`를 쉬운 말로 표시 + "다시 하기"/"글로 쓰기"/"예시로 체험하기" 버튼.

## D9. 예시 시나리오 (`src/demo`, F13)
- AI 없이 흐름을 끝까지 체험하는 2개: ① 어머니 기초연금 신청 대리 ② 전입신고. C가 넘겨준 `TurnResult` JSON + 고정 연락처 사용.
- Phase 1에서 이 데이터로 5개 화면을 관통시킨다.

## D10. 접근성 (모든 화면)
- 본문 17px 이상, 담당자 카드 굵은 고딕 22px 이상, 주요 버튼 높이 64px 이상.
- 색만으로 구분하지 않음, 명도 대비 4.5:1 이상, 모든 안내는 음성으로도(`speak`).
- 기능은 텍스트 링크가 아닌 버튼으로. 390×844 기준 레이아웃.

## D11. 시연·현장 확인 준비 (Phase 4)
- 시연 대본(전입신고, 복지 신청 대리, 외국어 1건, 위기 1건, 사용량 초과 1건)으로 화면 흐름 리허설.
- 담당자 카드를 주민센터 직원/공무원 경험자에게 보여 판독 시간 측정, 어르신 2~3명 사용 테스트 후 형식 조정.

# 하지 않는 것 (다른 파트)
- 녹음·TTS 내부(B), 프롬프트·검증·카드 조합 로직(C), 저장소·연락처 API·PWA 설정(A).
- 준비물·자격 안내, 민원 종류 표시 금지.

</context>

<PRD>

# Technical Architecture (파트 D 관점)
```
src/App.tsx ── src/state (상태 머신, live/demo 어댑터)
   ├─ screens/Consent, Home, Listening, Asking, Summary, Showing, Crisis, Error
   ├─ 사용: useRecorder·speak (B) / runTurn·buildSummaryCard·detectCrisisKeywords (C)
   │        fetchContacts·saveSummary·listSummaries·consent (A)
   └─ demo/ (예시 시나리오 2종, 같은 인터페이스)
```

# Development Roadmap (파트 D)

## Phase 0
1. A 뼈대 머지 후 라우팅/상태 머신 골격, 공통 컴포넌트(BigButton 64px+, AiMayBeWrong 배지, ScreenTitle)

## Phase 1 (예시 데이터로 끝까지 관통)
2. `src/demo` 예시 시나리오 2종(C 데이터 받기 전엔 직접 작성 후 교체)
3. 5개 화면 + 첫 사용 안내를 demo 모드로 연결 (D2~D7 기본형)
4. 위기·오류 화면 (D8)

## Phase 2 (실제 기능 연결)
5. B의 `useRecorder`·`speak` 연결 (말하기 버튼, 질문 읽기)
6. C의 `runTurn`·`buildSummaryCard`·`detectCrisisKeywords` 연결
7. `RATE_LIMITED` → demo 전환

## Phase 3
8. 부분 수정, 내가 한 말 보기 (D6)
9. 창구 보여주기 전체 화면·가로·QR·참고 연락처 (D7, A의 `/api/contacts`)
10. 저장 목록·다시 열기·지우기 (A의 `src/storage`)
11. 외국어 UI 문구 (`src/i18n`), 접근성 점검 (D10)

## Phase 4
12. 시연 리허설·현장 확인·형식 조정 (D11)

# Logical Dependency Chain
- A의 Phase 0 뼈대가 먼저. 이후 모든 다른 파트 기능은 계약 시그니처로 목을 만들어 먼저 화면을 완성한다.
- B·C·A 기능이 머지되는 순서대로 demo 어댑터를 live로 바꾼다. 둘 다 유지(시연 실패 대비).
- 참고 연락처는 "맞아요" 이후 최종 카드로만 호출(대화 중 표시 금지).

# Risks and Mitigations
| 위험 | 대응 |
|---|---|
| 다른 파트 지연으로 화면 연결 불가 | demo 어댑터로 먼저 완성 |
| 고령층 조작 어려움 | 버튼 하나 우선, 큰 글씨, 음성 안내, 어르신 테스트 |
| 창구 직원이 카드를 안 읽음 | 5줄 굵은 카드, 현장 반응 확인 후 조정 |
| AI 오답을 사실로 믿음 | "AI는 틀릴 수 있습니다" 상시, 확인 단계·부분 수정 |
| QR 용량 초과 | 텍스트 길이 제한·줄임 |

</PRD>
