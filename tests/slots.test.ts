// 파트 C: data/slots.json과 tests/fixtures/scripts.json의 모양 검사
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import slotsData from '../data/slots.json' with { type: 'json' };
import scriptsData from './fixtures/scripts.json' with { type: 'json' };
import { Language, SLOT_KEYS } from '../lib/schema.js';

const LANGS = Language.options;
const PerLanguage = <T extends z.ZodTypeAny>(t: T) => z.object({ ko: t, en: t, vi: t }).strict();

const SlotsFile = z
  .object({
    version: z.literal(1),
    max_questions: z.literal(3),
    fixed_quick_answers: PerLanguage(z.array(z.string().min(1)).length(3)),
    slots: z
      .array(
        z
          .object({
            key: z.enum(SLOT_KEYS),
            name_ko: z.string().min(1),
            description_ko: z.string().min(1),
            priority: z.number().int().min(1),
            questions: PerLanguage(z.string().min(1)),
            quick_answers: PerLanguage(z.array(z.string().min(1)).min(1).max(3)),
          })
          .strict(),
      )
      .length(SLOT_KEYS.length),
  })
  .strict();

const ScriptsFile = z.object({
  version: z.literal(1),
  note: z.string(),
  scripts: z.array(
    z
      .object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        title: z.string().min(1),
        category: z.enum(['normal', 'trap', 'crisis', 'foreign', 'edit']),
        language: Language,
        turns: z
          .array(
            z
              .object({
                text: z.string().min(1).max(2000),
                source: z.enum(['voice', 'text', 'quick']),
              })
              .strict(),
          )
          .min(1),
        expect: z
          .object({
            crisis: z.boolean(),
            filled: z.array(z.enum(SLOT_KEYS)),
            unknown: z.array(z.enum(SLOT_KEYS)),
            must_not_contain: z.array(z.string().min(1)),
            max_asks: z.number().int().min(0).max(3),
          })
          .strict(),
      })
      .strict(),
  ),
});

describe('data/slots.json', () => {
  const data = SlotsFile.parse(slotsData);

  it('5개 슬롯이 계약의 SLOT_KEYS와 정확히 한 번씩 맞는다', () => {
    expect([...data.slots.map((s) => s.key)].sort()).toEqual([...SLOT_KEYS].sort());
  });

  it('우선순위가 겹치지 않고, 누구의 일·용건이 먼저다', () => {
    const byPriority = [...data.slots].sort((a, b) => a.priority - b.priority);
    expect(new Set(data.slots.map((s) => s.priority)).size).toBe(data.slots.length);
    expect(byPriority.slice(0, 2).map((s) => s.key)).toEqual(['whose_matter', 'purpose']);
  });

  it('고정 빠른 답(해당 없어요/잘 모르겠어요/직접 말할게요)이 모든 언어에 있다', () => {
    expect(data.fixed_quick_answers.ko).toEqual(['해당 없어요', '잘 모르겠어요', '직접 말할게요']);
    for (const lang of LANGS) expect(data.fixed_quick_answers[lang]).toHaveLength(3);
  });

  it('슬롯별 빠른 답이 고정 빠른 답과 겹치지 않는다(중복 버튼 방지)', () => {
    for (const lang of LANGS) {
      const fixed = new Set(data.fixed_quick_answers[lang]);
      for (const s of data.slots) {
        for (const q of s.quick_answers[lang]) expect(fixed.has(q)).toBe(false);
      }
    }
  });

  it('한국어 이름이 모두 다르다(미확인 항목 표시용)', () => {
    expect(new Set(data.slots.map((s) => s.name_ko)).size).toBe(data.slots.length);
  });
});

describe('tests/fixtures/scripts.json', () => {
  const { scripts } = ScriptsFile.parse(scriptsData);

  it('id가 겹치지 않는다', () => {
    expect(new Set(scripts.map((s) => s.id)).size).toBe(scripts.length);
  });

  it('PRD 수락 기준에 필요한 만큼 대본이 있다', () => {
    const count = (c: string) => scripts.filter((s) => s.category === c).length;
    expect(scripts.length).toBeGreaterThanOrEqual(10); // C3: 10개 이상
    expect(count('trap')).toBeGreaterThanOrEqual(5); // C4: 함정 5개
    expect(count('crisis')).toBeGreaterThanOrEqual(5); // C5: 위기 5개
    expect(scripts.filter((s) => !s.expect.crisis).length).toBeGreaterThanOrEqual(10); // C5: 일반 10개 오탐 0
    expect(count('foreign')).toBeGreaterThanOrEqual(1); // C9: 외국어 1건 이상
  });

  it('PRD C9의 필수 대본(전입신고, 어머니 기초연금 대리)이 있다', () => {
    const ids = scripts.map((s) => s.id);
    expect(ids).toContain('normal-move-in');
    expect(ids).toContain('normal-pension-mother');
  });

  it('위기 대본만 crisis=true다', () => {
    for (const s of scripts) expect(s.expect.crisis).toBe(s.category === 'crisis');
  });

  it('filled와 unknown이 겹치지 않는다', () => {
    for (const s of scripts) {
      const filled = new Set(s.expect.filled);
      for (const k of s.expect.unknown) expect(filled.has(k)).toBe(false);
    }
  });

  it('함정 대본은 금지어가 있고, 금지어는 사용자 원문에 없다', () => {
    for (const s of scripts) {
      const said = s.turns.map((t) => t.text).join(' ');
      if (s.category === 'trap') expect(s.expect.must_not_contain.length).toBeGreaterThan(0);
      for (const w of s.expect.must_not_contain)
        expect(said.includes(w), `${s.id}: ${w}`).toBe(false);
    }
  });
});
