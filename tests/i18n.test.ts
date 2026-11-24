import { describe, expect, it } from 'vitest';
import { ErrorCode, SLOT_KEYS } from '../lib/schema.js';
import { DICTIONARIES, errorText, recorderErrorText, slotLabel, t } from '../src/i18n/index.js';
import { RECORDER_ERROR_KO } from '../src/voice/useRecorder.js';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('화면 문구(ko·en·vi)', () => {
  const ko = DICTIONARIES.ko;

  for (const lang of ['en', 'vi'] as const) {
    it(`${lang}: 한국어와 같은 키를 모두 갖고, 비어 있지 않고, {자리}가 같다`, () => {
      const dict = DICTIONARIES[lang];
      expect(Object.keys(dict).sort()).toEqual(Object.keys(ko).sort());
      for (const [key, text] of Object.entries(ko)) {
        const other = dict[key as keyof typeof ko];
        expect(other.trim(), key).not.toBe('');
        expect(placeholders(other), key).toEqual(placeholders(text));
      }
    });
  }

  it('오류 코드·녹음 오류·항목 이름이 세 언어 모두 있다', () => {
    for (const lang of ['ko', 'en', 'vi'] as const) {
      for (const code of [...ErrorCode.options, 'NOT_HEARD' as const])
        expect(errorText(lang, code)).not.toMatch(/^error\./);
      for (const code of Object.keys(RECORDER_ERROR_KO) as (keyof typeof RECORDER_ERROR_KO)[])
        expect(recorderErrorText(lang, code)).not.toMatch(/^rec\./);
      for (const key of SLOT_KEYS) expect(slotLabel(lang, key)).not.toMatch(/^slot\./);
    }
  });

  it('{자리}에 값을 넣는다', () => {
    expect(t('ko', 'ask.step', { n: 2, max: 3 })).toBe('질문 2 / 3');
    expect(t('en', 'show.call', { phone: '129' })).toBe('Call 129');
  });

  it('외부 전송 고지 문구(핵심 원칙 5)', () => {
    expect(t('ko', 'consent.point1')).toBe(
      '말씀하신 내용은 정리를 위해 OpenAI로 전송되고, 저장은 내 폰에만 됩니다.',
    );
  });
});
