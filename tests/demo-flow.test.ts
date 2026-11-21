import { describe, expect, it } from 'vitest';
import { appReducer, INITIAL_STATE } from '../src/state/machine.js';
import { DemoAdapter } from '../src/demo/index.js';

describe('Demo Flow End-to-End Walkthrough', () => {
  it('walks through all 5 screens in demo mode from consent to showing', () => {
    // 0. 초기 상태: Consent (화면 0)
    let state = INITIAL_STATE;
    expect(state.screen).toBe('consent');
    expect(state.consentGiven).toBe(false);

    // 1. 동의하고 시작 -> Home (화면 1)
    state = appReducer(state, { type: 'GIVE_CONSENT' });
    expect(state.screen).toBe('home');
    expect(state.consentGiven).toBe(true);

    // 2. 홈에서 말하기 시작 -> Listening (화면 2)
    state = appReducer(state, { type: 'START_LISTENING' });
    expect(state.screen).toBe('listening');
    expect(state.isRecording).toBe(true);

    // 음성 인식 텍스트 반영
    state = appReducer(state, {
      type: 'SET_TRANSCRIPT',
      text: '우리 어머니 기초연금 대신 신청하려고 하는데요.',
    });
    expect(state.interimTranscript).toBe('우리 어머니 기초연금 대신 신청하려고 하는데요.');

    // 3. 다 말했어요 -> Asking (화면 3)
    const turn1 = DemoAdapter.getTurnResult('pension', 0);
    state = appReducer(state, {
      type: 'SET_TURN_RESULT',
      slots: turn1.slots,
      nextQuestion: turn1.next_question,
      quickAnswers: turn1.quick_answers,
      askCount: turn1.ask_count,
      done: turn1.done,
      crisis: turn1.crisis,
    });
    expect(state.screen).toBe('asking');
    expect(state.askCount).toBe(1);
    expect(state.nextQuestion).toBe('어머님께서 현재 만 65세 이상이신가요?');

    // 4. 질문 1 답변 선택 -> 질문 2로 전이
    const turn2 = DemoAdapter.getTurnResult('pension', 1);
    state = appReducer(state, {
      type: 'SET_TURN_RESULT',
      slots: turn2.slots,
      nextQuestion: turn2.next_question,
      quickAnswers: turn2.quick_answers,
      askCount: turn2.ask_count,
      done: turn2.done,
      crisis: turn2.crisis,
    });
    expect(state.screen).toBe('asking');
    expect(state.askCount).toBe(2);

    // 5. 질문 2 답변 선택 -> 완료 (done: true) -> Summary (화면 4)
    const turn3 = DemoAdapter.getTurnResult('pension', 2);
    state = appReducer(state, {
      type: 'SET_TURN_RESULT',
      slots: turn3.slots,
      nextQuestion: turn3.next_question,
      quickAnswers: turn3.quick_answers,
      askCount: turn3.ask_count,
      done: turn3.done,
      crisis: turn3.crisis,
    });
    expect(state.screen).toBe('summary');
    expect(state.askCount).toBe(3);

    // 카드 및 연락처 설정
    const finalCard = DemoAdapter.getSummaryCard('pension');
    const contacts = DemoAdapter.getContacts('pension');
    state = appReducer(state, { type: 'SET_CARD', card: finalCard });
    state = appReducer(state, { type: 'SET_CONTACTS', contacts });

    expect(state.currentCard?.who).toContain('기초연금');
    expect(state.contacts.length).toBeGreaterThan(0);

    // 6. 요약 확인 후 "맞아요" 클릭 -> Showing (화면 5)
    state = appReducer(state, { type: 'NAVIGATE', screen: 'showing' });
    expect(state.screen).toBe('showing');
    expect(state.currentCard).not.toBeNull();
  });

  it('handles emergency crisis interrupt and return', () => {
    let state = appReducer(INITIAL_STATE, { type: 'GIVE_CONSENT' });
    expect(state.screen).toBe('home');

    // 긴급 119 트리거
    state = appReducer(state, { type: 'TRIGGER_CRISIS' });
    expect(state.screen).toBe('crisis');
    expect(state.previousScreen).toBe('home');

    // 계속 민원 정리하기 클릭 시 이전 화면으로 복귀
    state = appReducer(state, {
      type: 'NAVIGATE',
      screen: state.previousScreen || 'home',
    });
    expect(state.screen).toBe('home');
  });

  it('handles error flow and resets to home', () => {
    let state = appReducer(INITIAL_STATE, { type: 'GIVE_CONSENT' });
    state = appReducer(state, {
      type: 'TRIGGER_ERROR',
      error: { code: 'AI_UNAVAILABLE', message_ko: 'AI 서버 오류' },
    });
    expect(state.screen).toBe('error');

    state = appReducer(state, { type: 'CLEAR_ERROR' });
    expect(state.screen).toBe('home');
    expect(state.error).toBeNull();
  });
});
