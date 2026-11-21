# 찰떡 PRD — 파트 C: AI·프롬프트 (되묻기·정리·원문 검증·위기 감지)

> 담당: 팀원 C · task-master 태그: `c-ai`
> 이 문서는 전체 PRD 중 **파트 C만** 다룬다. 다른 파트(A 기반, B 음성, D 화면)의 기능은 구현하지 않는다.

<context>

# Overview
찰떡의 핵심은 "개떡같이 말해도 찰떡같이 알아듣는" 정리다. 파트 C는 사용자의 말(텍스트)을 받아 정해진 되묻기 항목(슬롯)을 채우고, 빠진 항목만 최대 3번 되묻고, 원문에 근거 없는 내용은 지워 담당자용 5줄 요약 카드를 만드는 `/api/turn`과 관련 로직을 맡는다. 원칙은 **판단하지 않고 대필만** 한다는 것이다.

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


# Core Features (파트 C 범위)

## C1. 되묻기 항목 정의 (`data/slots.json`, F3)
- 5개 슬롯: `whose_matter`(누구의 일: 본인/가족 대신), `purpose`(용건), `desired`(원하는 것), `date`(관련 날짜·기한), `question`(궁금한 점).
- 슬롯마다: 한국어 이름(카드·미확인 표시용), 되묻기 예시 질문(언어별), 빠른 답 예시, 우선순위(`whose_matter`와 `purpose`가 먼저).

## C2. 정리·되묻기 프롬프트 (`lib/prompts.ts`)
- 시스템 프롬프트 금지 규칙: 민원 종류 판단·자격 판단·결과 예측·준비물 안내·법률 해석 금지, 기관·연락처 생성 금지, 사용자가 말하지 않은 사실 추가 금지.
- 슬롯 `value`는 항상 한국어, `evidence`는 사용자 원문에서 **그대로 복사한 부분 문자열**.
- 이미 값이 있는 슬롯은 묻지 않는다. 정보를 더할 수 있는 빈 슬롯만 우선순위대로 하나씩 묻는다.
- 질문 수 0~3회(`ask_count`). 충분하거나 3회가 되면 `done: true`, `next_question: null`.
- `next_question`과 `quick_answers`는 사용자 언어로. `quick_answers` 끝 3개는 항상 "해당 없어요", "잘 모르겠어요", "직접 말할게요"(사용자 언어 번역). 서버 코드에서 강제로 붙여 보장한다.
- 사용자가 "해당 없어요"/"잘 모르겠어요"를 고르면 그 슬롯은 `null`로 두고 다시 묻지 않는다(슬롯별 "물었음" 표시는 history로 판단).
- `questions_to_ask`: 창구에서 담당자에게 물어볼 것(사용자가 궁금해한 것, 한국어).
- 부분 수정(`edit_slot`이 있을 때): 해당 슬롯만 마지막 사용자 발화로 다시 채우고 나머지 슬롯은 그대로 유지, `done: true`로 돌려준다.

## C3. `/api/turn` 서버 함수 (F3, F4)
- 처리 순서: 요청 `TurnRequest` 검증 → 사용자 발화 `maskPII`(A) → (1) 정리 호출(구조화 출력, `MODELS.chat`) → (2) 검증 단계 → `TurnResult` 스키마 검증 → 응답.
- 구조화 출력 JSON 파싱·스키마 실패 시 1회 재요청, 다시 실패하면 `BAD_JSON`.
- OpenAI 오류는 `fromOpenAIError`(A)로 변환. 내용은 로그 금지.
- 응답 길이 제한(max tokens), 함수 시간 제한 내 완료.
- 수락 기준: 테스트 대본 10개 이상에서 응답이 항상 `TurnResult` 스키마를 통과한다.

## C4. 원문 근거 검증 (`lib/verify.ts`, F4)
- 1차: 코드로 문자열 대조. 각 슬롯의 `evidence`가 사용자 발화(마스킹 후, 공백·문장부호 정규화)에 실제로 포함되는지 확인, 없으면 `value`·`evidence`를 `null`로.
- 2차: LLM 검증 호출 — "각 value가 evidence에서 벗어나는 내용을 담고 있는가"만 판정, 벗어나면 `null`.
- 검증 결과로 `null`이 된 슬롯은 아직 묻지 않았다면 다음 되묻기 대상이 될 수 있다.
- 수락 기준: "원문에 없는 내용 넣기" 함정 대본 5개에서 잘못된 항목 0개.

## C5. 위기 감지 (`lib/crisis.ts`, F11)
- `detectCrisisKeywords(text)`: 생명·안전 위협(죽고 싶다, 맞았다 등), 생계 위기(굶다, 쫓겨나다 등) 키워드 목록. 한국어 + 시연 외국어.
- `/api/turn`의 `crisis`는 LLM 판단 OR 키워드 감지(이중 감지).
- 프론트(D)도 `detectCrisisKeywords`를 인식 직후 호출해 서버 응답 전에 바로 안내를 띄울 수 있다.
- 수락 기준: 위기 대본 5개 전부 감지, 일반 민원 대본 10개 오탐 0개(목표).

## C6. 요약 카드 만들기 (`lib/summary.ts`, F6)
- `buildSummaryCard(slots, questionsToAsk, spoken)` — LLM 없이 슬롯 값으로만 조합(순수 함수).
- ① 누구의 일: `whose_matter` + `purpose`로 한 문장 (예: "어머니(본인 아님)의 기초연금 신청 건") ② 현재 상황 ③ 요청(`desired`) ④ 미확인: 값이 `null`인 슬롯의 한국어 이름 ⑤ 물어볼 것.
- 값이 없으면 "미확인"으로 표기. 외국어로 말했어도 카드는 한국어.
- 화면 5줄 이내가 되도록 각 줄 길이 제한(예: 40자, 넘으면 말줄임).
- 수락 기준: Vitest로 슬롯 조합 10가지 이상 테스트.

## C7. 프론트 호출 함수 (`src/api/turn.ts`)
- `runTurn(req: TurnRequest): Promise<TurnResult>`, 실패 시 `ApiFailure`. 타임아웃 25초 → `AI_UNAVAILABLE`.

## C8. 외국어 (F10, 정리 부분)
- `language`에 맞춰 질문·빠른 답을 생성, 슬롯 값·카드는 한국어. 시연 언어 1~2개 대본으로 테스트.

## C9. 테스트 대본·평가 (`tests/fixtures`)
- 대본: 전입신고, 복지 신청 대리(어머니 기초연금), 외국어 1건, 위기 1건, 함정(없는 내용 유도) 등.
- 평가 스크립트(`npm run eval:turn`, 실제 API 호출, 수동 실행): 필수 항목 채움률, 원문에 없는 항목 수(목표 0), 평균 되묻기 횟수(목표 3 이하) 출력.
- D의 예시 시나리오 2개(`src/demo`)에 들어갈 `TurnResult` 예시 JSON을 이 대본에서 만들어 D에게 넘긴다.

# 하지 않는 것 (다른 파트)
- 음성 인식·TTS(B), 참고 연락처 고르기 `/api/contacts`(A), 화면·대화 상태 흐름(D), 공통 스키마 수정(A, 계약 PR로만).

</context>

<PRD>

# Technical Architecture (파트 C 관점)
```
D(대화 상태) ──TurnRequest──> src/api/turn (C) ──> /api/turn (C)
                                                   ├─ maskPII (A)
                                                   ├─ (1) 정리: prompts.ts + slots.json ──> OpenAI (구조화 출력)
                                                   ├─ (2) 검증: verify.ts (문자열 대조 + LLM 검증)
                                                   ├─ crisis.ts (키워드) OR LLM crisis
                                                   └─ TurnResult 스키마 검증 ──> 응답
D(요약 확인) ──> buildSummaryCard (C, 순수 함수) ──> SummaryCard
```

# Development Roadmap (파트 C)

## Phase 0
1. `data/slots.json`, 테스트 대본(`tests/fixtures`) 초안 — A의 스키마 머지 전에도 진행 가능

## Phase 1
2. `lib/summary.ts` + 테스트 (C6) → D가 요약 화면에 바로 사용
3. `lib/crisis.ts` 키워드 + 테스트 (C5)
4. 예시 시나리오용 `TurnResult` JSON 2세트 D에게 전달

## Phase 2
5. `lib/prompts.ts` 정리 프롬프트 (C2)
6. `/api/turn` 1단계(정리) + 스키마 검증 + 1회 재요청 + 오류 코드 (C3)
7. `lib/verify.ts` 문자열 대조 → LLM 검증 (C4)
8. `src/api/turn.ts` (C7)

## Phase 3
9. 부분 수정(`edit_slot`) 처리
10. 외국어 질문·빠른 답 (C8)
11. 평가 스크립트로 프롬프트 다듬기 (C9)

## Phase 4 (통합)
12. D와 실제 대화 흐름 연결 점검, 시연 대본 5종 전부 통과 확인

# Logical Dependency Chain
- 계약(`TurnRequest`/`TurnResult`/`SummaryCard`)은 이미 고정되어 있으므로 D는 C를 기다리지 않고 예시 데이터로 개발한다.
- 검증(C4)은 정리 결과 형식(C3)에 의존한다: 정리 → 검증 순서.
- `maskPII`(A)가 머지되기 전에는 임시 함수로 두고 교체.

# Risks and Mitigations
| 위험 | 대응 |
|---|---|
| 정리 중 사실 왜곡·없는 내용 추가 | evidence 필수, 문자열 대조 + LLM 검증, 함정 대본 테스트 |
| 빠른 답이 답을 유도 | 서버 코드로 기본 3개 선택지 강제 |
| 같은 질문 반복 | 값 있는 슬롯·이미 물은 슬롯 제외 로직을 코드로도 검사 |
| JSON 형식 오류 | 구조화 출력 + zod + 1회 재요청 + `BAD_JSON` |
| 판단·준비물 안내가 섞임 | 금지 규칙 프롬프트, 평가 대본에 "뭐 가져가야 해요?" 질문 포함해 거절·정리만 하는지 확인 |
| 위기 미감지 | LLM + 키워드 이중 감지 |

</PRD>
