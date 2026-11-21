import type { Contact, SummaryCard, TurnResult } from '../../lib/schema.js';

export interface DemoStep {
  userInput: string;
  result: TurnResult;
}

export interface DemoScenario {
  id: 'pension' | 'moving';
  title: string;
  subtitle: string;
  initialPrompt: string;
  steps: DemoStep[];
  finalCard: SummaryCard;
  contacts: Contact[];
}

export const DEMO_SCENARIO_PENSION: DemoScenario = {
  id: 'pension',
  title: '어머니 기초연금 신청 대리',
  subtitle: '고령의 부모님을 대신하여 기초연금 자격 및 신청을 문의하는 예시',
  initialPrompt: '우리 어머니 기초연금 대신 신청하려고 하는데요.',
  steps: [
    {
      userInput: '우리 어머니 기초연금 대신 신청하려고 하는데요.',
      result: {
        slots: {
          whose_matter: { value: '어머니 (본인 대리)', evidence: '우리 어머니' },
          purpose: { value: '기초연금 신청', evidence: '기초연금 대신 신청하려고' },
          desired: { value: '대리 접수 및 자격 안내', evidence: '대신 신청' },
          date: { value: null, evidence: null },
          question: { value: null, evidence: null },
        },
        questions_to_ask: ['만 65세 이상 연령 확인', '대리 신청 위임장 준비 여부'],
        next_question: '어머님께서 현재 만 65세 이상이신가요?',
        quick_answers: [
          '네, 만 65세 넘으셨어요',
          '올해 만 65세가 되세요',
          '잘 모르겠어요',
          '직접 말할게요',
        ],
        ask_count: 1,
        done: false,
        crisis: false,
      },
    },
    {
      userInput: '네, 만 65세 넘으셨어요',
      result: {
        slots: {
          whose_matter: { value: '어머니 (본인 대리)', evidence: '우리 어머니' },
          purpose: { value: '기초연금 신청', evidence: '기초연금 대신 신청하려고' },
          desired: { value: '대리 접수 및 자격 안내', evidence: '대신 신청' },
          date: { value: '만 65세 이상 (수급 연령 충족)', evidence: '만 65세 넘으셨어요' },
          question: { value: null, evidence: null },
        },
        questions_to_ask: ['소득인정액 심사 안내', '대리인 신분증 및 가족관계증명서 확인'],
        next_question:
          '오늘 창구에서 신청서를 바로 접수하시겠습니까, 아니면 필요 서류 안내를 먼저 받으시겠습니까?',
        quick_answers: [
          '신청서 바로 접수하고 싶어요',
          '필요한 서류 안내 먼저 받고 싶어요',
          '잘 모르겠어요',
          '직접 말할게요',
        ],
        ask_count: 2,
        done: false,
        crisis: false,
      },
    },
    {
      userInput: '신청서 바로 접수하고 싶어요',
      result: {
        slots: {
          whose_matter: { value: '어머니 (본인 대리)', evidence: '우리 어머니' },
          purpose: { value: '기초연금 신청', evidence: '기초연금 대신 신청하려고' },
          desired: { value: '기초연금 신청서 즉시 접수', evidence: '신청서 바로 접수하고 싶어요' },
          date: { value: '만 65세 이상', evidence: '만 65세 넘으셨어요' },
          question: { value: '대리 신청 시 구비서류 일치 여부', evidence: '대신 신청' },
        },
        questions_to_ask: [
          '대리인 및 어머니 신분증 지참 여부 확인',
          '위임장 및 가족관계증명서 확인',
          '통장사본(수급희망계좌) 확인',
        ],
        next_question: null,
        quick_answers: [],
        ask_count: 3,
        done: true,
        crisis: false,
      },
    },
  ],
  finalCard: {
    who: '어머니(본인 아님)의 기초연금 대리 신청 건',
    situation: '만 65세 이상 어머님을 대신하여 자녀가 기초연금 신청을 위해 주민센터 방문',
    request: '기초연금 신청서 접수 및 심사 진행',
    unknowns: ['대리인 위임장 및 가족관계증명서 지참 여부'],
    to_ask: [
      '대리인 및 대상자 신분증, 위임장 지참 여부 확인',
      '수급희망 통장사본 제출 여부 확인',
    ],
    spoken_language: 'ko',
  },
  contacts: [
    {
      tags: ['welfare'],
      name: '국민연금공단 고객센터',
      phone: '1355',
      scope: '국민연금·기초연금 자격 및 모의계산 상담',
      source: 'https://www.nps.or.kr',
      checked_at: '2026-11-21',
    },
    {
      tags: ['welfare'],
      name: '보건복지상담센터',
      phone: '129',
      scope: '복지 제도 및 수급 기준 상담',
      source: 'https://www.129.go.kr',
      checked_at: '2026-11-21',
    },
    {
      tags: ['welfare', 'resident', 'general'],
      name: '관할 주민센터 복지창구',
      phone: null,
      scope: '신청서 접수 및 복지 담당 공무원 상담',
      source: null,
      checked_at: '2026-11-21',
    },
  ],
};

export const DEMO_SCENARIO_MOVING: DemoScenario = {
  id: 'moving',
  title: '이사 전입신고',
  subtitle: '이사 후 관할 주민센터에 주민등록 전입신고를 진행하는 예시',
  initialPrompt: '이번에 이사 와서 전입신고 하러 왔어요.',
  steps: [
    {
      userInput: '이번에 이사 와서 전입신고 하러 왔어요.',
      result: {
        slots: {
          whose_matter: { value: '본인 및 세대원', evidence: '이사 와서' },
          purpose: { value: '전입신고', evidence: '전입신고 하러 왔어요' },
          desired: { value: '새 주소지 전입 처리', evidence: '전입신고' },
          date: { value: null, evidence: null },
          question: { value: null, evidence: null },
        },
        questions_to_ask: ['이사한 날짜(14일 이내 여부) 확인', '신분증 지참 여부'],
        next_question: '새 주소지로 실제로 이사하신 날짜가 언제인가요?',
        quick_answers: [
          '이번 주에 이사했어요 (14일 이내)',
          '오늘 이사했어요',
          '잘 모르겠어요',
          '직접 말할게요',
        ],
        ask_count: 1,
        done: false,
        crisis: false,
      },
    },
    {
      userInput: '이번 주에 이사했어요 (14일 이내)',
      result: {
        slots: {
          whose_matter: { value: '본인 및 세대원', evidence: '이사 와서' },
          purpose: { value: '전입신고', evidence: '전입신고 하러 왔어요' },
          desired: { value: '새 주소지 전입 처리', evidence: '전입신고' },
          date: { value: '최근 1주일 이내 (법정 기한 14일 이내)', evidence: '이번 주에 이사했어요' },
          question: { value: null, evidence: null },
        },
        questions_to_ask: ['세대주 본인 방문 여부', '임대차계약서 확정일자 부여 여부'],
        next_question: '방문하신 분이 세대주 본인이신가요, 아니면 세대원이신가요?',
        quick_answers: [
          '세대주 본인이에요',
          '세대원이에요',
          '잘 모르겠어요',
          '직접 말할게요',
        ],
        ask_count: 2,
        done: false,
        crisis: false,
      },
    },
    {
      userInput: '세대주 본인이에요',
      result: {
        slots: {
          whose_matter: { value: '세대주 본인', evidence: '세대주 본인이에요' },
          purpose: { value: '전입신고 및 확정일자 확인', evidence: '전입신고' },
          desired: { value: '주민등록 전입신고서 수리', evidence: '전입신고' },
          date: { value: '이사 후 14일 이내', evidence: '이번 주에 이사했어요' },
          question: { value: '주택 임대차 확정일자 동시 처리 여부', evidence: null },
        },
        questions_to_ask: [
          '본인 신분증 확인',
          '임대차계약서 원본 지참 시 확정일자 동시 부여 가능 여부 안내',
        ],
        next_question: null,
        quick_answers: [],
        ask_count: 3,
        done: true,
        crisis: false,
      },
    },
  ],
  finalCard: {
    who: '세대주 본인의 관내 전입신고 건',
    situation: '최근 주소지 이전 후 법정 신고 기간(14일) 내 주민센터 방문',
    request: '주민등록 전입신고서 접수 및 주소 변경 완료',
    unknowns: ['임대차계약서 확정일자 동시 신청 희망 여부'],
    to_ask: [
      '신분증 확인',
      '임대차계약서 원본 지참 여부 및 확정일자 부여 필요 여부 확인',
    ],
    spoken_language: 'ko',
  },
  contacts: [
    {
      tags: ['resident', 'general'],
      name: '정부민원안내콜센터',
      phone: '110',
      scope: '주민등록 및 정부 전입신고 종합 민원 안내',
      source: 'https://www.110.go.kr',
      checked_at: '2026-11-21',
    },
    {
      tags: ['resident', 'general'],
      name: '관할 주민센터 민원행정창구',
      phone: null,
      scope: '전입신고서 접수 및 확정일자 부여',
      source: null,
      checked_at: '2026-11-21',
    },
  ],
};

export const DEMO_SCENARIOS = {
  pension: DEMO_SCENARIO_PENSION,
  moving: DEMO_SCENARIO_MOVING,
};
