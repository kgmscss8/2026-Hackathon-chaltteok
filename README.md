# 2026-Hackathon-chaltteok
2026-11-21-청년AI해커톤-21팀-경기인력개발원-MS8

🍡 찰떡 (Chaltteok)
개떡같이 말해도 찰떡같이 알아듣는다.

민원인의 말을 AI가 이해하고 정리하여, 담당자에게 정확하게 전달할 수 있도록 돕는 AI 민원 대필 서비스입니다.

<p align="center">
<a href="https://chaltteok-phi.vercel.app/">
<strong>🚀 찰떡 서비스 바로가기</strong>
</a>
</p>

📌 프로젝트 소개

**찰떡(Chaltteok)**은 주민센터, 구청 등 공공기관에 방문하기 전 민원인이 자신의 상황을 편하게 말하면 AI가 필요한 정보를 정리하고, 담당자가 이해하기 쉬운 요약 카드로 만들어 주는 모바일 웹 애플리케이션(PWA)입니다.

민원 업무에 익숙하지 않거나 자신의 상황을 논리적으로 설명하기 어려운 사람도 간단히 말하는 것만으로 민원 내용을 정리할 수 있습니다.

조선시대에 글을 모르는 백성을 대신해 민원을 작성해 주던 '외지부'에서 아이디어를 얻었습니다.

찰떡은 AI가 민원인의 말을 대신 판단하는 것이 아니라, 민원인의 의도를 왜곡하지 않고 담당자에게 잘 전달하도록 돕는 것을 목표로 합니다.

🎯 기획 배경 및 문제 정의

공공기관을 방문하는 많은 사람은 자신이 겪고 있는 상황을 어떻게 설명해야 할지 어려움을 겪습니다.

어떤 내용을 먼저 이야기해야 할지 모르는 민원인
민원 용어와 행정 절차가 익숙하지 않은 고령층
한국어로 자신의 상황을 설명하기 어려운 외국인 주민
가족을 대신해 민원을 신청하는 보호자
민원인의 용건을 파악하기 위해 반복적으로 질문해야 하는 담당자

찰떡은 이러한 문제를 해결하기 위해 민원인의 말을 구조화하고, 빠진 정보를 자연스럽게 질문하며, 최종적으로 담당자가 바로 확인할 수 있는 요약을 제공합니다.

✨ 주요 기능
1. 🎙️ 음성 기반 민원 입력
버튼을 눌러 말하는 간편한 음성 입력
음성을 텍스트로 변환
음성 입력이 어려운 사용자를 위한 텍스트 입력 지원
보기에서 선택하는 빠른 답변 지원
2. 🤖 AI 기반 대화 및 정보 보완
사용자의 발언을 분석하여 민원 내용 정리
이미 전달한 정보는 반복해서 질문하지 않음
누락된 정보에 대해서만 최대 3회까지 추가 질문
사용자가 편하게 대답할 수 있는 빠른 답변 제공
3. 📝 AI 민원 요약 카드

사용자의 발언을 바탕으로 담당자가 이해하기 쉬운 한국어 요약을 생성합니다.

요약 카드 구성:

누구의 일인지
현재 상황
요청 사항
확인되지 않은 정보
담당자에게 물어볼 사항

모든 요약 항목은 사용자의 실제 발언을 근거로 작성하며, 확인할 수 없는 정보는 임의로 생성하지 않습니다.

4. ✏️ 요약 확인 및 부분 수정
생성된 요약을 큰 글씨로 확인
AI가 정리한 내용 음성으로 듣기
원문 발언 확인
잘못된 항목만 선택하여 수정
최종 요약 확인 및 저장
5. 🏢 담당자용 창구 화면
담당자가 읽기 편한 요약 카드 제공
최대 5줄 이내로 핵심 내용 정리
큰 글씨와 전체 화면 모드 지원
QR 코드를 통한 요약 내용 전달
관련 기관의 참고 연락처 제공
6. 📞 관련 기관 연락처 안내

확인된 기관 데이터에 기반하여 민원 내용과 관련 있을 수 있는 연락처를 제공합니다.

보건복지상담센터 129
국민연금공단 1355
정부민원안내콜센터 110
거주지 주민센터 등

AI가 임의로 연락처를 생성하지 않으며, 확인된 데이터만 사용합니다.

7. 🌍 다국어 지원
외국어로 민원 상황 설명
사용자 언어에 맞춘 질문과 안내
담당자에게 전달하는 최종 요약은 한국어로 제공
8. 🚨 위기 상황 감지

생명, 안전 또는 생계와 관련된 위기 상황이 감지되면 일반적인 대화보다 긴급 안내를 우선 제공합니다.

119: 응급 상황
112: 경찰 신고
129: 보건복지상담센터
9. 💾 개인정보 보호 및 로컬 저장
사용자가 확인한 민원 요약은 사용자 기기에 저장
IndexedDB 기반 데이터 관리
서버에 민원 대화 상태를 저장하지 않는 구조
기본 7일 이후 저장 데이터 자동 삭제
AI API 호출 시 개인정보 마스킹 적용
10. 📱 PWA 지원
모바일 환경에 최적화된 인터페이스
홈 화면에 앱처럼 설치 가능
저장된 요약 내용 오프라인 열람 지원
🔄 서비스 이용 흐름
mermaid
flowchart TD
    A["서비스 접속"] --> B["개인정보 및 외부 전송 동의"]
    B --> C["음성 또는 텍스트로 민원 설명"]
    C --> D["AI 음성 인식 및 내용 분석"]
    D --> E{"추가 정보가 필요한가?"}
    E -->|Yes| F["AI가 추가 질문"]
    F --> C
    E -->|No| G["민원 요약 생성"]
    G --> H["원문 근거 검증"]
    H --> I["사용자 요약 확인 및 수정"]
    I --> J{"내용이 정확한가?"}
    J -->|No| I
    J -->|Yes| K["기기에 요약 저장"]
    K --> L["담당자용 요약 카드 생성"]
    L --> M["창구 보여주기 및 QR 전달"]

🛠️ 기술 스택
구분	기술
Language	TypeScript
Frontend	React 19
Build Tool	Vite
Styling	Tailwind CSS 4
Backend	Vercel Serverless Functions
AI	OpenAI API
Data Validation	Zod
Local Storage	IndexedDB (idb-keyval)
QR Code	react-qr-code
PWA	vite-plugin-pwa
Testing	Vitest
Code Quality	ESLint, Prettier
Deployment	Vercel
🏗️ 시스템 아키텍처
mermaid
flowchart TB
    U["사용자 모바일 PWA"]
    
    subgraph CLIENT["Frontend"]
        UI["React + TypeScript"]
        VOICE["음성 입력 및 출력"]
        STORAGE["IndexedDB"]
        SUMMARY["민원 요약 및 창구 화면"]
    end

    subgraph SERVER["Vercel Serverless Functions"]
        TRANSCRIBE["/api/transcribe"]
        TURN["/api/turn"]
        TTS["/api/tts"]
        CONTACTS["/api/contacts"]
    end

    AI["OpenAI API"]
    DATA["기관 연락처 및 질문 데이터"]

    U --> UI
    UI --> VOICE
    UI --> SUMMARY
    UI <--> STORAGE
    VOICE --> TRANSCRIBE
    UI --> TURN
    UI --> TTS
    SUMMARY --> CONTACTS
    TRANSCRIBE --> AI
    TURN --> AI
    TTS --> AI
    CONTACTS --> DATA

주요 API
API	기능
POST /api/transcribe	음성을 텍스트로 변환
POST /api/turn	대화 분석, 추가 질문, 민원 내용 정리 및 원문 검증
POST /api/tts	안내 문장 음성 출력
POST /api/contacts	최종 요약에 기반한 관련 기관 연락처 조회
📂 프로젝트 구조
text
2026-Hackathon-chaltteok/
│
├── api/                      # Vercel Serverless API
│   ├── transcribe.ts         # 음성 인식
│   ├── turn.ts               # AI 대화 및 요약
│   ├── tts.ts                # 음성 출력
│   └── contacts.ts           # 기관 연락처
│
├── data/                     # 서비스 데이터
│   ├── contacts.json         # 기관 연락처 데이터
│   └── slots.json            # 추가 질문 항목
│
├── lib/                      # 공통 서버 로직
│   ├── schema.ts             # 데이터 스키마
│   ├── errors.ts             # 오류 처리
│   ├── openai.ts             # OpenAI 설정
│   ├── masking.ts            # 개인정보 마스킹
│   ├── prompts.ts            # AI 프롬프트
│   ├── verify.ts             # 원문 근거 검증
│   └── summary.ts            # 요약 생성
│
├── public/                   # 정적 파일 및 아이콘
│
├── src/
│   ├── api/                  # API 클라이언트
│   ├── components/           # 공통 UI 컴포넌트
│   ├── screens/              # 화면 구성
│   ├── state/                # 애플리케이션 상태
│   ├── storage/              # 로컬 저장소
│   ├── voice/                # 음성 기능
│   ├── i18n/                 # 다국어 지원
│   └── demo/                 # 데모 기능
│
├── tests/                    # 테스트 코드
│
├── package.json
├── vite.config.ts
├── vercel.json
└── README.md

🚀 설치 및 실행 방법
1. 저장소 복제
bash
git clone https://github.com/kgmscss8/2026-Hackathon-chaltteok.git

cd 2026-Hackathon-chaltteok

2. 패키지 설치
bash
npm install

3. 환경 변수 설정

프로젝트 루트에 .env.local 파일을 생성합니다.

env
OPENAI_API_KEY=your_openai_api_key


OpenAI API 키는 서버에서만 사용해야 하며, GitHub 등 외부에 공개하지 않도록 주의합니다.

4. 개발 서버 실행

프론트엔드 개발 서버:

bash
npm run dev


Vercel API를 포함한 로컬 통합 실행:

bash
npx vercel dev

5. 빌드
bash
npm run build

🧪 테스트 및 코드 품질 검사

프로젝트의 안정성을 위해 다음 명령어를 제공합니다.

명령어	설명
npm run lint	ESLint 코드 검사
npm run typecheck	TypeScript 타입 검사
npm test	Vitest 테스트 실행
npm run build	프로덕션 빌드
npm run format	Prettier 코드 포맷팅

PR 제출 전 다음 명령어를 실행합니다.

bash
npm run lint
npm run typecheck
npm test
npm run build

🔐 개인정보 보호 및 AI 사용 원칙

찰떡은 공공민원이라는 서비스 특성을 고려하여 다음 원칙을 지킵니다.

판단하지 않고 정리합니다. 민원인의 자격, 처리 결과, 준비물 또는 법률적 판단을 AI가 임의로 안내하지 않습니다.
말하지 않은 내용은 생성하지 않습니다. 모든 요약 항목은 실제 발언을 근거로 하며, 근거가 없으면 미확인으로 표시합니다.
검증된 기관 정보만 제공합니다. AI가 연락처를 임의로 만들어 내지 않습니다.
위기 상황을 우선합니다. 위기 발언이 감지되면 긴급 연락처 안내를 우선합니다.
외부 전송을 사전에 고지합니다. AI 처리를 위해 OpenAI로 정보가 전송된다는 점을 알리고 동의를 받습니다.
민원 내용은 기기에 저장합니다. 확인된 요약은 사용자 기기의 로컬 저장소에 보관합니다.
AI의 한계를 명시합니다. 요약 확인 및 창구 화면에 AI 오류 가능성을 안내합니다.
본 서비스는 민원 상담이나 행정 처리를 대신하지 않으며, 민원인의 의사를 명확하게 전달하기 위한 보조 도구입니다.
👥 팀 소개

2026 청년 AI 해커톤 | 21팀 | 경기인력개발원 MS8

4명의 팀원이 각자의 전문 영역을 담당하여 하나의 서비스를 개발했습니다.

파트	담당 영역	주요 개발 내용
A	기반·서버·데이터·저장	프로젝트 기반 구축, API, 개인정보 보호, 로컬 저장
B	음성	음성 녹음, 음성 인식, TTS
C	AI·프롬프트	AI 대화, 민원 요약, 원문 검증, 위기 감지
D	화면·UX	사용자 인터페이스, 화면 흐름, 접근성, 시연 기능
🏆 프로젝트 정보
프로젝트명: 찰떡 (Chaltteok)
행사: 2026 청년 AI 해커톤
팀: 21팀
소속: 경기인력개발원 MS8
개발 기간: 2026.11.21 ~
배포: https://chaltteok-phi.vercel.app/
Repository: GitHub

<p align="center">
**개떡같이 말해도 찰떡같이 알아듣는 AI 민원 대필 서비스, 찰떡 🍡**

누구나 자신의 이야기를 쉽고 정확하게 전달할 수 있는 세상을 만듭니다.

</p>
