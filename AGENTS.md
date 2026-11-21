# 찰떡 — AI 코딩 도구 공통 규칙

이 파일은 Claude Code(2명)와 Gemini CLI(2명)가 함께 읽는 **유일한 규칙 원본**이다.
`CLAUDE.md`와 `GEMINI.md`는 `@AGENTS.md` 한 줄로 이 파일을 불러오기만 한다. 규칙은 여기에만 쓴다.

## 공통 계약
- 공통 타입·API 규격·공유 함수 시그니처·파일 소유 표는 `.taskmaster/docs/00-common-contract.md`에 있다. 작업 전에 반드시 읽는다.
- 각 파트 범위: `.taskmaster/docs/prd-A-foundation.md`(A 기반), `prd-B-voice.md`(B 음성), `prd-C-ai.md`(C AI), `prd-D-ui.md`(D 화면).
- 계약(`lib/schema.ts` 포함)은 바꾸지 않는다. 바꿔야 하면 `contract` 라벨 PR을 열고 4명 모두 승인 후 머지한다.

## 핵심 원칙 7가지 (모든 코드에 적용)
1. 판단하지 않고 정리만 한다. 자격·처리 결과·준비물·법률 해석·민원 종류 확정을 내놓지 않는다.
2. 말하지 않은 내용은 넣지 않는다. 모든 요약 항목은 사용자 원문 근거(`evidence`)가 있어야 하고, 없으면 `null`(미확인).
3. 기관·연락처는 `data/contacts.json`에서만 고른다. AI가 기관이나 연락처를 만들어 내지 않는다.
4. 생명·안전 위협이나 생계 위기 발언이 감지되면 119·112·129 안내를 먼저 띄운다.
5. 첫 사용 시 "말한 내용은 정리를 위해 OpenAI로 전송되고, 저장은 내 폰에만 됩니다"를 알리고 동의를 받는다.
6. 사람이 처리한다. AI가 담당자 대신 답하지 않는다. 대면 민원을 더 잘되게 돕는다.
7. AI는 틀릴 수 있다. 요약 확인·창구 보여주기 화면에 "AI는 틀릴 수 있습니다"를 항상 표시한다.

## 파일 소유 (자기 파트 파일만 수정)
| 파트 | 소유 파일·폴더 |
|---|---|
| **A. 기반·서버·데이터·저장** | `package.json`, `vite.config.ts`, `tailwind.config.*`, `tsconfig*.json`, `vercel.json`, `eslint.config.js`, `.prettierrc.json`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.gitignore`, `lib/schema.ts`, `lib/errors.ts`, `lib/openai.ts`, `lib/masking.ts`, `lib/contactsTagger.ts`, `api/contacts.ts`, `data/contacts.json`, `src/storage/*`, `src/api/contacts.ts`, PWA 설정 |
| **B. 음성** | `api/transcribe.ts`, `api/tts.ts`, `src/voice/*`, `src/api/transcribe.ts`, `src/api/tts.ts` |
| **C. AI·프롬프트** | `api/turn.ts`, `lib/prompts.ts`, `lib/verify.ts`, `lib/crisis.ts`, `lib/summary.ts`, `data/slots.json`, `src/api/turn.ts`, `tests/fixtures/*` |
| **D. 화면·UX** | `index.html`, `src/main.tsx`, `src/App.tsx`, `src/screens/*`, `src/components/*`, `src/state/*`, `src/i18n/*`, `src/demo/*`, `public/*` |

- **다른 파트 소유 파일을 고쳐야 할 것 같으면 멈추고 사람에게 먼저 확인한다.** 직접 고치지 말고 이슈나 메시지로 알린다.
- 의존성 추가는 `package.json` 변경만 담은 작은 커밋/PR로 따로 올린다.
- 테스트는 `tests/` 아래에 `<대상>.test.ts`로 둔다.

## 코드 규칙
- `api/**`, `lib/**`에서 `console.log` 등 `console` 사용 금지(ESLint `no-console: error`). 민원 내용을 로그에 남기지 않는다. 오류는 코드(`ErrorCode`)만 다룬다.
- 서버 함수는 상태를 저장하지 않는다(stateless). 대화 상태는 폰이 들고 매 요청에 보낸다.
- 서버 함수(`api/*.ts`)는 `lib/`를 **상대 경로 + `.js` 확장자**로 import 한다. 예: `import { TurnRequest } from '../lib/schema.js'`. 프론트(`src/`)에서는 `@lib/*`, `@data/*` 별칭을 쓴다.
- OpenAI 클라이언트는 `lib/openai.ts`의 `getOpenAI()`와 `MODELS`만 쓴다. OpenAI로 보내는 텍스트는 `lib/masking.ts`의 `maskPII()`를 거친다.
- 오류 응답은 `lib/errors.ts`의 `sendError(res, code)`로 `{ code, message_ko }` 형식을 지킨다.
- API 키는 Vercel 환경변수(`OPENAI_API_KEY`)와 로컬 `.env.local`에만 둔다. 코드·프론트·커밋에 넣지 않는다.

## 명령
- 개발: `npm run dev`(프론트), `vercel dev`(서버 함수 포함)
- **PR 전에 반드시 통과**: `npm run lint && npm run typecheck && npm test`
- 형식 맞추기: `npm run format`

## 브랜치·커밋 규칙
- `main`은 보호한다. PR + 다른 도구를 쓰는 팀원 1명 이상 리뷰 + Vercel 미리보기 성공 후 머지.
- 브랜치 이름: `a/<작업>`, `b/<작업>`, `c/<작업>`, `d/<작업>`.
- 작은 PR을 자주 올리고, 하루 1번 이상 `main`을 자기 브랜치에 반영한다.
- 커밋하지 않는 것: `.env*`, `.taskmaster/tasks/`, `.taskmaster/state.json`, `.taskmaster/config.json`, `.claude/settings.local.json`, `.gemini/`.
- 다른 파트 기능이 아직 없으면 계약 시그니처대로 목(mock)을 만들어 개발한다.
