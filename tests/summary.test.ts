import { describe, expect, it } from 'vitest';
import { SummaryCard, type Slots } from '../lib/schema.js';
import { buildSummaryCard, clip, LINE_MAX, summaryCardLines } from '../lib/summary.js';

const empty = () => ({ value: null, evidence: null });
function slots(v: Partial<Record<keyof Slots, string>>): Slots {
  const s: Slots = {
    whose_matter: empty(),
    purpose: empty(),
    desired: empty(),
    date: empty(),
    question: empty(),
  };
  for (const [k, value] of Object.entries(v)) s[k as keyof Slots] = { value, evidence: value };
  return s;
}

describe('buildSummaryCard', () => {
  it('PRD 예시: 어머니 기초연금 신청 건', () => {
    const card = buildSummaryCard(
      slots({
        whose_matter: '어머니(본인 아님)',
        purpose: '기초연금 신청',
        question: '필요한 것이 무엇인지',
      }),
      ['대신 가서 신청해도 되나요?'],
      'ko',
    );
    expect(SummaryCard.parse(card)).toEqual(card);
    expect(card.who).toBe('어머니(본인 아님)의 기초연금 신청 건');
    expect(card.situation).toBe('관련 날짜·기한 미확인');
    expect(card.request).toBe('미확인');
    expect(card.unknowns).toEqual(['원하는 것', '관련 날짜·기한']);
    expect(card.to_ask).toEqual(['대신 가서 신청해도 되나요?', '필요한 것이 무엇인지']);
  });

  it('모든 슬롯이 차 있으면 미확인 없음', () => {
    const card = buildSummaryCard(
      slots({
        whose_matter: '본인',
        purpose: '전입신고',
        desired: '오늘 신고 접수',
        date: '어제 이사',
        question: '얼마나 걸리는지',
      }),
      [],
      'ko',
    );
    expect(card.who).toBe('본인의 전입신고 건');
    expect(card.situation).toBe('관련 날짜·기한: 어제 이사');
    expect(card.request).toBe('오늘 신고 접수');
    expect(card.unknowns).toEqual([]);
    expect(card.to_ask).toEqual(['얼마나 걸리는지']);
  });

  it('모두 비어 있으면 전부 미확인, 5개 슬롯 이름이 우선순위 순서로', () => {
    const card = buildSummaryCard(slots({}), [], 'ko');
    expect(card.who).toBe('미확인');
    expect(card.request).toBe('미확인');
    expect(card.unknowns).toEqual([
      '누구의 일',
      '용건',
      '원하는 것',
      '관련 날짜·기한',
      '궁금한 점',
    ]);
    expect(card.to_ask).toEqual([]);
  });

  it('누구의 일만 있음', () => {
    expect(buildSummaryCard(slots({ whose_matter: '어머니' }), [], 'ko').who).toBe(
      '어머니의 일 (용건 미확인)',
    );
  });

  it('용건만 있음', () => {
    expect(buildSummaryCard(slots({ purpose: '등본 발급' }), [], 'ko').who).toBe(
      '등본 발급 건 (누구의 일인지 미확인)',
    );
  });

  it('공백뿐인 값은 미확인으로 본다', () => {
    const card = buildSummaryCard(slots({ purpose: '   ', desired: '' }), [], 'ko');
    expect(card.unknowns).toContain('용건');
    expect(card.unknowns).toContain('원하는 것');
  });

  it('긴 값은 40자로 말줄임', () => {
    const long = '가'.repeat(60);
    const card = buildSummaryCard(
      slots({ whose_matter: '본인', purpose: long, desired: long }),
      [long],
      'ko',
    );
    for (const line of [card.who, card.situation, card.request, ...card.to_ask]) {
      expect([...line].length).toBeLessThanOrEqual(LINE_MAX);
    }
    expect(card.request.endsWith('…')).toBe(true);
  });

  it('물어볼 것은 중복을 빼고 최대 3개', () => {
    const card = buildSummaryCard(
      slots({ question: '얼마나 걸리나요' }),
      ['얼마나 걸리나요?', '대신 해도 되나요', '수수료가 있나요', '언제 받나요'],
      'ko',
    );
    expect(card.to_ask).toEqual(['얼마나 걸리나요?', '대신 해도 되나요', '수수료가 있나요']);
  });

  it('빈 물어볼 것은 버린다', () => {
    expect(buildSummaryCard(slots({}), ['', '  ', '?'], 'ko').to_ask).toEqual([]);
  });

  it('외국어로 말해도 카드는 한국어 값 그대로, spoken_language만 기록', () => {
    const card = buildSummaryCard(
      slots({ whose_matter: '본인', purpose: '주소 등록(전입신고)', date: '지난주 이사' }),
      [],
      'vi',
    );
    expect(card.spoken_language).toBe('vi');
    expect(card.who).toBe('본인의 주소 등록(전입신고) 건');
  });

  it('원하는 것·날짜만 있음', () => {
    const card = buildSummaryCard(slots({ desired: '방법 안내', date: '이번 달 안' }), [], 'en');
    expect(card.who).toBe('미확인');
    expect(card.situation).toBe('관련 날짜·기한: 이번 달 안');
    expect(card.unknowns).toEqual(['누구의 일', '용건', '궁금한 점']);
  });

  it('질문 슬롯만 있으면 물어볼 것으로 옮겨진다', () => {
    expect(buildSummaryCard(slots({ question: '대신 해도 되는지' }), [], 'ko').to_ask).toEqual([
      '대신 해도 되는지',
    ]);
  });
});

describe('clip / summaryCardLines', () => {
  it('짧으면 그대로, 공백은 하나로', () => {
    expect(clip('  어머니   기초연금  ')).toBe('어머니 기초연금');
  });

  it('카드는 정확히 5줄', () => {
    const card = buildSummaryCard(slots({ purpose: '등본 발급' }), [], 'ko');
    const lines = summaryCardLines(card);
    expect(lines).toHaveLength(5);
    expect(lines[3]).toBe('④ 미확인: 누구의 일, 원하는 것, 관련 날짜·기한, 궁금한 점');
    expect(lines[4]).toBe('⑤ 물어볼 것: 없음');
  });
});
