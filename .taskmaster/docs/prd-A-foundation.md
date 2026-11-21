# 찰떡 PRD — 파트 A: 기반·서버·데이터·저장·배포

> 담당: 팀원 A · task-master 태그: `a-foundation`
> 이 문서는 전체 PRD 중 **파트 A만** 다룬다. 다른 파트(B 음성, C AI, D 화면)의 기능은 구현하지 않는다.

<context>

# Overview
파트 A는 4명이 함께 쓰는 공용 GitHub 저장소와 Vercel 배포의 뼈대를 만들고, 모두가 import 하는 공통 계약(`lib/schema.ts`)과 공통 서버 헬퍼(오류·OpenAI 클라이언트·마스킹)를 제공한다. 또한 확인된 기관 연락처 데이터와 `/api/contacts`, 폰 로컬 저장(IndexedDB), PWA 오프라인을 맡는다.

**가장 먼저 끝내야 하는 파트다.** Phase 0(뼈대 + 계약) PR이 머지되어야 B·C·D가 본격 작업을 시작할 수 있다.

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


# Core Features (파트 A 범위)

## A1. 저장소 뼈대와 배포 (Phase 0, 최우선)
- Vite + React + TypeScript + Tailwind 프로젝트 생성, 위 "파일 소유" 표의 폴더 구조를 빈 파일/`index.ts`로 미리 만든다(`src/screens`, `src/voice`, `src/storage`, `src/demo`, `api`, `lib`, `data`, `tests`).
- `@lib`, `@data` 경로 별칭(vite.config, tsconfig 둘 다).
- ESLint/Prettier/Vitest 설정. `api/**`, `lib/**`에 `no-console: error` 규칙.
- `vercel.json`: SPA rewrite(`/api/*` 제외 → `index.html`), 함수 최대 실행 시간 설정.
- `.gitignore`: `.env*`, `node_modules`, `dist`, `.vercel`, `.taskmaster/tasks/`, `.taskmaster/state.json`, `.taskmaster/config.json`, `.claude/settings.local.json`, `.gemini/`.
- `AGENTS.md`: 핵심 원칙 7가지, 공통 계약 위치(`.taskmaster/docs/00-common-contract.md`), 파일 소유 표, `console.log` 금지, 커밋·브랜치 규칙, lint/typecheck/test 명령, "다른 파트 파일은 고치기 전에 사람에게 확인" 규칙. Claude Code(2명)와 Gemini CLI(2명)가 모두 이 규칙을 따른다.
- `CLAUDE.md`, `GEMINI.md`: `@AGENTS.md` 한 줄만 둔다(규칙 중복 금지). Claude Code는 `/memory`, Gemini CLI는 `/memory show`로 규칙이 로드되는지 확인한다.
- `package.json` 스크립트: `dev`, `build`, `lint`, `typecheck`, `test`를 모든 도구가 같은 이름으로 쓰도록 고정.
- GitHub 저장소를 Vercel에 연결, `main` 보호 규칙, PR 미리보기 배포 확인.
- `/api/health` 같은 임시 함수로 `api → ../lib` 상대 import가 미리보기 배포에서 동작하는지 확인 후 삭제.
- 수락 기준: 팀원 누구나 `npm i && npm run dev`(프론트), `vercel dev`(서버 함수 포함)로 로컬 실행된다. PR을 열면 미리보기 URL이 생긴다.

## A2. 공통 계약 코드 (Phase 0)
- `lib/schema.ts`를 공통 계약 그대로 작성하고 각 스키마에 대한 Vitest 파싱 테스트(정상/오류 예시) 작성.
- `lib/errors.ts`: `ApiFailure`, `sendError`, `fromOpenAIError`, `MESSAGE_KO`(쉬운 말 문구). 예: RATE_LIMITED → "지금 사용하는 사람이 많아요. 잠시 뒤 다시 하거나 예시로 체험해 보세요."
- `lib/openai.ts`: `getOpenAI()`(환경변수 없으면 `AI_UNAVAILABLE`), `MODELS = { transcribe, chat, tts }` 상수. 모델은 OpenAI 콘솔에서 현재 모델 확인 후 한 곳에서 결정.
- 수락 기준: B·C·D가 이 파일들만 import 해서 타입 오류 없이 개발을 시작할 수 있다.

## A3. 개인정보 마스킹 (`lib/masking.ts`)
- 주민등록번호(하이픈·공백 유무), 휴대폰·일반 전화번호 패턴을 `******`로 가린다.
- 공공기관 대표번호(129, 110, 1355 등 3~4자리)는 가리지 않는다.
- 수락 기준: 20개 이상의 테스트 케이스(가려야 할 것/가리면 안 되는 것) 통과.

## A4. 기관 연락처 데이터 (`data/contacts.json`, F8)
- 항목: 기관명, 전화번호, 안내 범위, 출처 URL, 확인일, 태그(`welfare`·`resident`·`general`).
- 초기 데이터: 보건복지상담센터 129(welfare), 국민연금공단 1355(welfare), 정부민원안내콜센터 110(resident, general), 거주지 주민센터(전화 없음, 전 태그).
- 각 번호를 공식 사이트에서 직접 확인하고 `checked_at`에 날짜 기록. Vitest로 `Contact` 스키마 통과 검사.

## A5. 참고 연락처 API (`/api/contacts`, F2)
- 입력: 사용자가 "맞아요"로 확인한 최종 `SummaryCard`만.
- `lib/contactsTagger.ts`: 카드 내용(마스킹 후)을 LLM에 보내 정해진 태그 목록 중 관련 태그만 고르게 한다(구조화 출력, 태그 외 값 불가). 태그는 민원 종류 확정이 아니라 연락처 선택용.
- LLM 실패 시 `general` 태그로 대체(연락처는 항상 최소 1개 나온다).
- 연락처는 `data/contacts.json`에서만 필터해 돌려준다. LLM 응답에 기관명·번호가 섞여도 무시.
- 부분 수정으로 카드가 바뀌면 프론트가 다시 호출한다(서버는 stateless).
- 수락 기준: 데이터에 없는 연락처는 절대 응답에 나오지 않는다(테스트). 응답이 `ContactsResponse` 스키마를 통과한다.

## A6. 폰 로컬 저장 (`src/storage`, F9)
- `idb-keyval`로 공통 계약의 저장 함수 구현. 저장·목록·다시 열기·지우기·전체 지우기.
- 기본 7일 뒤 만료: 앱 시작 시와 `listSummaries()` 호출 시 만료 항목 삭제.
- 외부 전송 동의 여부(`getConsent`/`setConsent`)도 폰에만 저장.
- 수락 기준: `fake-indexeddb`로 저장·만료·삭제 테스트 통과.

## A7. PWA·오프라인
- vite-plugin-pwa: manifest(이름 "찰떡", 아이콘, `display: standalone`), 앱 셸 precache.
- 오프라인에서 홈·저장된 요약·창구 보여주기 화면이 열린다(API 호출만 실패).
- 수락 기준: 안드로이드 크롬·iOS 사파리에서 홈 화면에 추가 가능, 비행기 모드에서 저장된 요약이 열린다.

## A8. 비용·장애 대비
- OpenAI 프로젝트 월 예산 한도 설정(콘솔), 한도 초과 시 `RATE_LIMITED`가 내려가는지 확인.
- 요청 본문 크기 검사 헬퍼(`assertBodySize`)를 `lib/errors.ts`에 두어 B·C가 사용.

# 하지 않는 것 (다른 파트)
- 녹음·음성 인식·TTS(B), 되묻기·요약 프롬프트·원문 검증·위기 감지(C), 화면·상태 흐름·예시 시나리오(D).
- 준비물·자격 안내, 민원 종류 판단은 어떤 파트도 하지 않는다.

</context>

<PRD>

# Technical Architecture (파트 A 관점)
```
[휴대폰 PWA] ── src/storage (IndexedDB, A) / service worker (A)
     │
     └─HTTPS─> Vercel ── /api/contacts (A) ── lib/contactsTagger (A) ──> OpenAI
                       └─ lib/schema · errors · openai · masking (A, 전원 사용)
```

# Development Roadmap (파트 A)

## Phase 0 (첫날, 다른 파트가 기다림)
1. 저장소 뼈대·Vercel 연결·미리보기 배포 확인 (A1)
2. `lib/schema.ts`, `lib/errors.ts`, `lib/openai.ts` (A2) → **"contract" PR 머지 후 팀에 공지**
3. `AGENTS.md`(+ `CLAUDE.md`·`GEMINI.md` 불러오기), ESLint `no-console` 규칙

## Phase 1
4. `lib/masking.ts` + 테스트 (A3)
5. `data/contacts.json` 확인·작성 (A4)
6. `/api/contacts` + `src/api/contacts.ts` (A5)

## Phase 2~3
7. `src/storage` 저장·만료·동의 (A6)
8. PWA·오프라인 (A7)
9. 예산 한도·본문 크기 제한 (A8)

## Phase 4 (통합)
10. 모든 PR의 미리보기 배포 점검, 폰 2종(안드로이드 크롬, iOS 사파리)에서 통합 확인
11. 연락처 데이터 재확인(확인일 갱신)

# Logical Dependency Chain
- A1 → A2가 끝나야 B·C·D가 import 할 수 있다(최우선).
- A3(마스킹)은 C의 `/api/turn`, B의 `/api/tts`가 사용하므로 Phase 1 초반에 머지.
- A5는 C의 `SummaryCard`(스키마는 계약에 이미 고정)만 필요하므로 C 구현을 기다리지 않는다.
- A6은 D의 저장 목록·창구 화면이 사용한다. 그 전까지 D는 메모리 목으로 개발.

# Risks and Mitigations
| 위험 | 대응 |
|---|---|
| Vercel 함수에서 `lib/` import 실패 | Phase 0에 미리보기 배포로 확인, 상대 경로 사용 |
| 계약 변경으로 다른 파트 깨짐 | `contract` 라벨 PR + 4명 승인 |
| 잘못된 연락처 안내 | 공식 사이트 직접 확인, 출처·확인일 기록, 데이터 밖 연락처 차단 테스트 |
| 개인정보가 OpenAI로 전송 | `maskPII` 필수 + 테스트, 서버 로그 금지 |

</PRD>
