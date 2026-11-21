import { describe, expect, it, vi } from 'vitest';
import type { Slots } from '../lib/schema.js';
import {
  changedSlotKeys,
  normalizeForMatch,
  verifyEvidenceByLlm,
  verifyEvidenceByText,
  type FaithfulnessJudge,
} from '../lib/verify.js';

const e = () => ({ value: null, evidence: null });
const base = (): Slots => ({
  whose_matter: e(),
  purpose: e(),
  desired: e(),
  date: e(),
  question: e(),
});

describe('normalizeForMatch', () => {
  it('공백·문장부호를 없애고 소문자로', () => {
    expect(normalizeForMatch(' 엄마, 기초연금  신청! ')).toBe('엄마기초연금신청');
    expect(normalizeForMatch('I moved here.')).toBe('imovedhere');
  });
});

describe('verifyEvidenceByText', () => {
  const said = ['엄마 기초연금 신청하려는데 뭐가 필요한지 모르겠어요'];

  it('원문에 있는 evidence는 통과(공백·문장부호 차이는 무시)', () => {
    const s = base();
    s.purpose = { value: '기초연금 신청', evidence: '기초연금  신청하려는데,' };
    expect(verifyEvidenceByText(s, said).purpose.value).toBe('기초연금 신청');
  });

  it('원문에 없는 evidence는 value까지 null', () => {
    const s = base();
    s.desired = { value: '오늘 접수', evidence: '오늘 접수하고 싶어요' };
    expect(verifyEvidenceByText(s, said).desired).toEqual(e());
  });

  it('evidence 없이 value만 있으면 null', () => {
    const s = base();
    s.date = { value: '이번 달', evidence: null };
    expect(verifyEvidenceByText(s, said).date).toEqual(e());
  });

  it('value 없이 evidence만 있으면 null', () => {
    const s = base();
    s.whose_matter = { value: null, evidence: '엄마' };
    expect(verifyEvidenceByText(s, said).whose_matter).toEqual(e());
  });

  it('여러 발화를 이어 붙인 evidence는 통과시키지 않는다(발화 하나 안에 있어야 함)', () => {
    const s = base();
    s.purpose = { value: '등본', evidence: '등본요 제 거' };
    expect(verifyEvidenceByText(s, ['등본요', '제 거예요']).purpose).toEqual(e());
  });

  it('마스킹된 발화와 대조한다', () => {
    const s = base();
    s.question = { value: '연락처로 연락 가능한지', evidence: '******로 연락' };
    expect(verifyEvidenceByText(s, ['******로 연락 주실 수 있나요']).question.value).not.toBeNull();
  });

  it('외국어 원문 evidence + 한국어 value', () => {
    const s = base();
    s.purpose = { value: '주소 등록', evidence: 'register my new address' };
    expect(
      verifyEvidenceByText(s, ['I moved here last week and I need to register my new address.'])
        .purpose.value,
    ).toBe('주소 등록');
  });

  it('빈 슬롯은 그대로 빈 슬롯', () => {
    expect(verifyEvidenceByText(base(), said)).toEqual(base());
  });
});

describe('verifyEvidenceByLlm', () => {
  const filledSlots = (): Slots => ({
    ...base(),
    whose_matter: { value: '어머니(본인 아님)', evidence: '엄마' },
    purpose: { value: '기초연금 수급 자격 확인', evidence: '기초연금 신청하려는데' },
  });

  it('faithful=false인 슬롯만 null', async () => {
    const judge = vi.fn<FaithfulnessJudge>(async () => [
      { key: 'whose_matter', faithful: true },
      { key: 'purpose', faithful: false },
    ]);
    const out = await verifyEvidenceByLlm(filledSlots(), judge);
    expect(out.whose_matter.value).toBe('어머니(본인 아님)');
    expect(out.purpose).toEqual(e());
    expect(judge.mock.calls[0][0].map((i) => i.key)).toEqual(['whose_matter', 'purpose']);
  });

  it('판정이 빠진 슬롯도 null(엄격)', async () => {
    const out = await verifyEvidenceByLlm(filledSlots(), async () => [
      { key: 'whose_matter', faithful: true },
    ]);
    expect(out.purpose).toEqual(e());
  });

  it('onlyKeys 밖의 슬롯은 묻지도 바꾸지도 않는다', async () => {
    const judge = vi.fn<FaithfulnessJudge>(async () => [{ key: 'purpose', faithful: false }]);
    const out = await verifyEvidenceByLlm(filledSlots(), judge, ['purpose']);
    expect(judge.mock.calls[0][0]).toHaveLength(1);
    expect(out.whose_matter.value).toBe('어머니(본인 아님)');
  });

  it('판정할 것이 없으면 LLM을 부르지 않는다', async () => {
    const judge = vi.fn<FaithfulnessJudge>();
    await verifyEvidenceByLlm(base(), judge);
    expect(judge).not.toHaveBeenCalled();
  });
});

describe('changedSlotKeys', () => {
  it('새로 생기거나 바뀐 슬롯만', () => {
    const before = base();
    before.purpose = { value: '등본', evidence: '등본' };
    const after = { ...before, date: { value: '내일', evidence: '내일까지' } };
    expect(changedSlotKeys(before, after)).toEqual(['date']);
  });
});
