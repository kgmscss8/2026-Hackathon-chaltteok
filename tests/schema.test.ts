import { describe, expect, it } from 'vitest';
import {
  ApiError,
  Contact,
  ContactsRequest,
  ContactsResponse,
  Language,
  Message,
  SavedSummary,
  SLOT_KEYS,
  Slots,
  SlotValue,
  SummaryCard,
  TranscribeResponse,
  TtsRequest,
  TurnRequest,
  TurnResult,
} from '../lib/schema.js';

const empty = { value: null, evidence: null };
const slots = {
  whose_matter: { value: '어머니 (가족 대신)', evidence: '엄마 기초연금 신청하려는데' },
  purpose: { value: '기초연금 신청 방법 문의', evidence: '기초연금 신청하려는데 뭐가 필요한지' },
  desired: empty,
  date: empty,
  question: { value: '필요한 것이 무엇인지', evidence: '뭐가 필요한지 모르겠어요' },
};
const message = {
  role: 'user',
  text: '엄마 기초연금 신청하려는데 뭐가 필요한지 모르겠어요',
  language: 'ko',
  source: 'voice',
};
const card = {
  who: '어머니(본인 아님)의 기초연금 신청 건',
  situation: '신청 방법을 모름',
  request: '미확인',
  unknowns: ['원하는 것', '관련 날짜·기한'],
  to_ask: ['대신 가서 신청해도 되나요?'],
  spoken_language: 'ko',
};
const contact = {
  tags: ['welfare'],
  name: '보건복지상담센터',
  phone: '129',
  scope: '복지 제도 상담',
  source: 'https://www.bokjiro.go.kr',
  checked_at: '2026-11-21',
};
const turnResult = {
  slots,
  questions_to_ask: ['대신 가서 신청해도 되나요?'],
  next_question: '언제까지 해결하고 싶으세요?',
  quick_answers: ['이번 주 안에', '급하지 않아요', '해당 없어요', '잘 모르겠어요', '직접 말할게요'],
  ask_count: 1,
  done: false,
  crisis: false,
};

describe('SLOT_KEYS / Language', () => {
  it('슬롯 5개를 정해진 순서로 가진다', () => {
    expect(SLOT_KEYS).toEqual(['whose_matter', 'purpose', 'desired', 'date', 'question']);
  });
  it('지원 언어만 통과한다', () => {
    expect(Language.safeParse('ko').success).toBe(true);
    expect(Language.safeParse('ja').success).toBe(false);
  });
});

describe('SlotValue / Slots', () => {
  it('값·근거가 둘 다 null(미확인)이어도 통과한다', () => {
    expect(SlotValue.safeParse(empty).success).toBe(true);
    expect(Slots.safeParse(slots).success).toBe(true);
  });
  it('슬롯이 빠지면 실패한다', () => {
    const { date: _date, ...missing } = slots;
    void _date;
    expect(Slots.safeParse(missing).success).toBe(false);
  });
  it('value가 문자열·null이 아니면 실패한다', () => {
    expect(SlotValue.safeParse({ value: 1, evidence: null }).success).toBe(false);
  });
});

describe('Message', () => {
  it('정상 메시지는 통과한다', () => {
    expect(Message.safeParse(message).success).toBe(true);
  });
  it('2000자를 넘으면 실패한다', () => {
    expect(Message.safeParse({ ...message, text: 'a'.repeat(2001) }).success).toBe(false);
  });
  it('정해지지 않은 source는 실패한다', () => {
    expect(Message.safeParse({ ...message, source: 'video' }).success).toBe(false);
  });
});

describe('TurnRequest', () => {
  const req = { history: [message], slots, ask_count: 0, language: 'ko' };
  it('정상 요청과 edit_slot이 있는 요청이 통과한다', () => {
    expect(TurnRequest.safeParse(req).success).toBe(true);
    expect(TurnRequest.safeParse({ ...req, edit_slot: 'date' }).success).toBe(true);
  });
  it('ask_count가 3을 넘으면 실패한다', () => {
    expect(TurnRequest.safeParse({ ...req, ask_count: 4 }).success).toBe(false);
  });
  it('history가 30개를 넘으면 실패한다', () => {
    expect(TurnRequest.safeParse({ ...req, history: Array(31).fill(message) }).success).toBe(false);
  });
  it('없는 슬롯 이름으로 edit_slot을 주면 실패한다', () => {
    expect(TurnRequest.safeParse({ ...req, edit_slot: 'name' }).success).toBe(false);
  });
});

describe('TurnResult', () => {
  it('PRD 예시 응답이 통과한다', () => {
    expect(TurnResult.safeParse(turnResult).success).toBe(true);
  });
  it('done이면 next_question이 null이어도 통과한다', () => {
    expect(TurnResult.safeParse({ ...turnResult, next_question: null, done: true }).success).toBe(
      true,
    );
  });
  it('crisis가 없으면 실패한다', () => {
    const { crisis: _crisis, ...missing } = turnResult;
    void _crisis;
    expect(TurnResult.safeParse(missing).success).toBe(false);
  });
});

describe('SummaryCard', () => {
  it('정상 카드는 통과한다', () => {
    expect(SummaryCard.safeParse(card).success).toBe(true);
  });
  it('unknowns가 배열이 아니면 실패한다', () => {
    expect(SummaryCard.safeParse({ ...card, unknowns: '날짜' }).success).toBe(false);
  });
});

describe('Contact / ContactsRequest / ContactsResponse', () => {
  it('정상 연락처, 전화·출처가 없는 주민센터가 통과한다', () => {
    expect(Contact.safeParse(contact).success).toBe(true);
    expect(
      Contact.safeParse({ ...contact, name: '거주지 주민센터', phone: null, source: null }).success,
    ).toBe(true);
  });
  it('정해지지 않은 태그나 잘못된 URL은 실패한다', () => {
    expect(Contact.safeParse({ ...contact, tags: ['medical'] }).success).toBe(false);
    expect(Contact.safeParse({ ...contact, source: 'bokjiro' }).success).toBe(false);
  });
  it('요청·응답 형식을 검사한다', () => {
    expect(ContactsRequest.safeParse({ card }).success).toBe(true);
    expect(ContactsRequest.safeParse({}).success).toBe(false);
    expect(ContactsResponse.safeParse({ tags: ['welfare'], contacts: [contact] }).success).toBe(
      true,
    );
    expect(ContactsResponse.safeParse({ tags: ['welfare'] }).success).toBe(false);
  });
});

describe('TranscribeResponse / TtsRequest', () => {
  it('정상 값은 통과한다', () => {
    expect(TranscribeResponse.safeParse({ text: '안녕하세요', language: 'ko' }).success).toBe(true);
    expect(
      TtsRequest.safeParse({ text: '언제까지 해결하고 싶으세요?', language: 'ko' }).success,
    ).toBe(true);
  });
  it('TTS 문장이 500자를 넘으면 실패한다', () => {
    expect(TtsRequest.safeParse({ text: 'a'.repeat(501), language: 'ko' }).success).toBe(false);
  });
  it('language가 없으면 실패한다', () => {
    expect(TranscribeResponse.safeParse({ text: '안녕하세요' }).success).toBe(false);
  });
});

describe('ApiError', () => {
  it('정해진 코드만 통과한다', () => {
    expect(ApiError.safeParse({ code: 'RATE_LIMITED', message_ko: '잠시 뒤' }).success).toBe(true);
    expect(ApiError.safeParse({ code: 'TIMEOUT', message_ko: '잠시 뒤' }).success).toBe(false);
  });
});

describe('SavedSummary', () => {
  const saved = {
    id: 'a1',
    card,
    slots,
    history: [message],
    contacts: [contact],
    created_at: 1_700_000_000_000,
    expires_at: 1_700_000_000_000 + 7 * 24 * 60 * 60 * 1000,
  };
  it('정상 저장 단위는 통과한다', () => {
    expect(SavedSummary.safeParse(saved).success).toBe(true);
  });
  it('expires_at이 숫자가 아니면 실패한다', () => {
    expect(SavedSummary.safeParse({ ...saved, expires_at: '내일' }).success).toBe(false);
  });
});
