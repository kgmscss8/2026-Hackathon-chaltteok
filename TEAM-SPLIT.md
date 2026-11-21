# 찰떡 4인 분할 작업 안내

## 파트 나누기
| 파트 | 담당 | AI 도구 | PRD 파일 | task-master 태그 | 핵심 |
|---|---|---|---|---|---|
| A | 기반·서버·데이터·저장 | **Claude Code** | `.taskmaster/docs/prd-A-foundation.md` | `a-foundation` | 저장소 뼈대, Vercel, 공통 스키마·오류·OpenAI·마스킹, `/api/contacts`, 연락처 데이터, IndexedDB, PWA |
| B | 음성 | **Gemini CLI** | `.taskmaster/docs/prd-B-voice.md` | `b-voice` | 녹음 훅, `/api/transcribe`, `/api/tts`, 읽어 주기 |
| C | AI·프롬프트 | **Claude Code** | `.taskmaster/docs/prd-C-ai.md` | `c-ai` | `/api/turn`(정리+원문 검증), 되묻기 슬롯, 위기 감지, 요약 카드 조합, 평가 대본 |
| D | 화면·UX | **Gemini CLI** | `.taskmaster/docs/prd-D-ui.md` | `d-ui` | 5개 화면 + 동의·위기·오류, 대화 상태, 창구 보여주기·QR, 예시 시나리오, 시연 |

### 왜 이렇게 나눴나 (바꿔도 됨)
- **Claude → A, C**: 다른 파트가 모두 import 하는 계약·서버 헬퍼(A)와, 정확도가 핵심인 프롬프트·원문 검증(C)을 한 도구 계열에 두면 서버 쪽 코드 스타일과 판단 기준이 일관된다.
- **Gemini → B, D**: 둘 다 고정된 계약 인터페이스를 가져다 쓰는 쪽이라 도구가 달라도 합칠 때 문제가 적다. 화면이 많은 D는 긴 컨텍스트로 여러 파일을 한 번에 보는 데 유리하다.
- **교차 리뷰 짝**: A(Claude) ↔ B(Gemini), C(Claude) ↔ D(Gemini). PR은 다른 도구를 쓰는 짝이 리뷰한다.

- 원래 PRD의 5번째 역할(기획·리서치)은 나눠 맡는다: 연락처 확인 → A, 평가 대본·측정 → C, 시연 대본·현장 확인 → D.
- 각 파트 PRD 안에 `00-common-contract.md`(공통 타입·API·파일 소유·브랜치 규칙)가 그대로 들어 있어서, task-master가 다른 파트의 인터페이스를 알고 태스크를 만든다.
- 원본 PRD는 참고용으로 `.taskmaster/docs/prd-full.md`에 있다(parse-prd에는 쓰지 않는다).

## 시작 순서
1. **A가 먼저 (첫날 반나절)**: 저장소 생성 → 뼈대 → `lib/schema.ts`·`lib/errors.ts`·`lib/openai.ts` → Vercel 연결 → "contract" PR 머지.
   이 PR에 `.taskmaster/docs/` 폴더 전체를 함께 커밋한다.
2. B·C·D는 그동안 각자 PRD를 읽고 task-master 태스크를 만든다(아래). B는 브라우저 녹음, C는 `slots.json`·테스트 대본처럼 A를 기다리지 않는 일부터.
3. 이후 각자 `a/…`, `b/…`, `c/…`, `d/…` 브랜치로 작은 PR을 자주 올린다. PR마다 Vercel 미리보기로 확인 후 머지.

## task-master 사용법 (각자 자기 PC에서)
```powershell
npm install -g task-master-ai
```
```powershell
git clone <공용 저장소 주소>; cd chalddeok
```
```powershell
task-master init
```
init 후 `git status`를 확인한다. task-master가 `AGENTS.md`·`CLAUDE.md`·`GEMINI.md`나 규칙 파일을 만들거나 바꿨다면 커밋하지 말고 되돌린다(규칙 원본은 A가 관리하는 `AGENTS.md` 하나).

**모델 설정은 쓰는 도구에 맞춰 각자 한다** (`.taskmaster/config.json`은 커밋하지 않음). API 키 없이 각자 구독·로그인으로 돌아간다.

Claude 담당(A, C): Claude Code에 로그인된 상태에서
```powershell
task-master models --set-main sonnet --claude-code
```
Gemini 담당(B, D): 먼저 `gemini`를 한 번 실행해 Google 계정으로 로그인한 뒤
```powershell
task-master models --set-main gemini-2.5-pro --gemini-cli
```
플래그나 모델 이름이 설치한 버전과 다르면 `task-master models --setup`에서 provider를 `claude-code` / `gemini-cli`로 고른다.

자기 태그를 만들고 자기 PRD만 파싱한다 (예: 파트 B).
```powershell
task-master add-tag b-voice
```
```powershell
task-master use-tag b-voice
```
```powershell
task-master parse-prd .taskmaster/docs/prd-B-voice.md --num-tasks=12
```
```powershell
task-master analyze-complexity; task-master expand --all
```
```powershell
task-master next
```

### task-master 파일과 git
- `.taskmaster/docs/`(PRD)는 커밋한다.
- `.taskmaster/tasks/`, `.taskmaster/state.json`, `.taskmaster/config.json`은 **각자 로컬에만** 둔다(A가 `.gitignore`에 넣음). 4명이 같은 `tasks.json`을 동시에 고치면 JSON 충돌이 계속 나고, `config.json`은 Claude/Gemini 담당끼리 모델 설정이 다르기 때문이다.
- 서로 진행 상황은 GitHub 이슈/PR로 공유한다.
- `.env`, `.claude/settings.local.json`, `.gemini/`는 절대 커밋하지 않는다.

### AI에게 작업 시킬 때 (Claude Code·Gemini CLI 공통)
- 세션 시작할 때 규칙이 로드됐는지 확인한다: Claude Code `/memory`, Gemini CLI `/memory show`. 둘 다 `AGENTS.md` 내용이 보여야 한다.
- 첫 지시 예: "`task-master next`로 다음 태스크를 보고 구현해. 공통 계약(`.taskmaster/docs/00-common-contract.md`)과 파일 소유 표를 지키고 파트 B 소유 파일만 수정해. 끝나면 lint·typecheck·test 돌려."
- 태스크가 끝나면 `task-master set-status --id=<번호> --status=done`.

## 합칠 때 충돌을 막는 규칙
1. **자기 파트 소유 파일만 고친다**(공통 계약의 "파일 소유" 표).
2. `lib/schema.ts`(계약) 변경은 `contract` 라벨 PR + 4명 승인.
3. `package.json` 의존성 추가는 그것만 담은 작은 커밋/PR로 먼저 올린다.
4. 다른 파트 기능이 아직 없으면 계약 시그니처대로 목으로 개발한다(D는 `src/demo`).
5. 하루 1번 이상 `main`을 자기 브랜치에 반영한다.

## 통합 체크포인트
| 시점 | 내용 | 주관 |
|---|---|---|
| I0 | contract PR 머지, 폰 2종에서 미리보기 주소 마이크 권한 확인 | A, B |
| I1 | demo 모드로 5개 화면 끝까지 관통 | D (C의 예시 JSON) |
| I2 | 말하기 → 인식 → 되묻기 → 요약 실제 연결 | D + B + C |
| I3 | 맞아요 → 참고 연락처 → 저장 → 창구 보여주기 → 오프라인 열기 | D + A |
| I4 | 시연 대본 5종(전입신고, 복지 대리, 외국어, 위기, 사용량 초과) 리허설 | 전원 |

## Vercel 설정 (A)
- GitHub 저장소 Import → Framework: Vite, Build: `npm run build`, Output: `dist`.
- Environment Variables: `OPENAI_API_KEY` (Production·Preview 둘 다). 로컬은 `vercel env pull .env.local`.
- 팀원 4명을 Vercel 팀(또는 GitHub 저장소 협업자)으로 추가해 미리보기 배포를 모두 볼 수 있게 한다.
- OpenAI 콘솔에서 프로젝트 월 예산 한도 설정.
