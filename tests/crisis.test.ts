import { describe, expect, it } from 'vitest';
import scriptsData from './fixtures/scripts.json' with { type: 'json' };
import { detectCrisisKeywords } from '../lib/crisis.js';

type Script = { id: string; category: string; turns: { text: string }[] };
const scripts = (scriptsData as { scripts: Script[] }).scripts;
const said = (s: Script) => s.turns.map((t) => t.text).join(' ');

describe('detectCrisisKeywords — 테스트 대본', () => {
  it.each(scripts.filter((s) => s.category === 'crisis').map((s) => [s.id, said(s)]))(
    '위기 대본 %s 감지',
    (_id, text) => expect(detectCrisisKeywords(text)).toBe(true),
  );

  it.each(scripts.filter((s) => s.category !== 'crisis').map((s) => [s.id, said(s)]))(
    '일반 대본 %s 오탐 없음',
    (_id, text) => expect(detectCrisisKeywords(text)).toBe(false),
  );
});

describe('detectCrisisKeywords — 추가 사례', () => {
  it.each([
    '살고 싶지 않아요',
    '아빠가 저를 때려요',
    '아들한테 또 맞았어요',
    '전 남편이 죽이겠다고 협박해요',
    '이틀 동안 굶었어요',
    '먹을 게 하나도 없어요',
    '월세 밀려서 쫓겨나게 생겼어요',
    '오늘 잘 데가 없어요',
    '전기가 끊겼어요',
    'I want to die',
    'My husband hits me',
    'I was evicted and have nowhere to sleep',
    "I haven't eaten in days",
    'Tôi muốn chết',
    'Tôi không có chỗ ở',
  ])('위기: %s', (text) => expect(detectCrisisKeywords(text)).toBe(true));

  it.each([
    '배고파 죽겠어요',
    '더워 죽겠네',
    '주차 때문에 미치겠어요',
    '서류가 맞는지 확인하고 싶어요',
    '번호가 맞았어요',
    '이사 가려고 집을 내놨어요',
    '가스 요금 고지서 문의요',
    '어머니 기초연금 신청하려고요',
    'I want to register my address',
    'This is killing me, the line is so long',
    'Tôi muốn đăng ký tạm trú',
    '',
  ])('일반: %s', (text) => expect(detectCrisisKeywords(text)).toBe(false));
});
