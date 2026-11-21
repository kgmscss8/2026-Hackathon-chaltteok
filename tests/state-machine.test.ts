import { describe, expect, it } from 'vitest';
import { appReducer, INITIAL_SLOTS, INITIAL_STATE } from '../src/state/machine.js';
import type { Slots } from '../lib/schema.js';

describe('App State Machine', () => {
  it('initial state has correct default values', () => {
    expect(INITIAL_STATE.screen).toBe('consent');
    expect(INITIAL_STATE.consentGiven).toBe(false);
    expect(INITIAL_STATE.slots).toEqual(INITIAL_SLOTS);
    expect(INITIAL_STATE.askCount).toBe(0);
    expect(INITIAL_STATE.history).toEqual([]);
  });

  it('transitions to home when consent is given', () => {
    const nextState = appReducer(INITIAL_STATE, { type: 'GIVE_CONSENT' });
    expect(nextState.consentGiven).toBe(true);
    expect(nextState.screen).toBe('home');
  });

  it('handles listening lifecycle', () => {
    let state = appReducer(INITIAL_STATE, { type: 'START_LISTENING' });
    expect(state.screen).toBe('listening');
    expect(state.isRecording).toBe(true);

    state = appReducer(state, { type: 'SET_TRANSCRIPT', text: '어머니 기초연금 신청' });
    expect(state.interimTranscript).toBe('어머니 기초연금 신청');

    state = appReducer(state, { type: 'STOP_LISTENING' });
    expect(state.isRecording).toBe(false);
  });

  it('transitions to asking when turn is not done', () => {
    const updatedSlots: Slots = {
      ...INITIAL_SLOTS,
      whose_matter: { value: '어머니', evidence: '우리 어머니 건인데요' },
    };

    const state = appReducer(INITIAL_STATE, {
      type: 'SET_TURN_RESULT',
      slots: updatedSlots,
      nextQuestion: '어머님께서 현재 몇 세이신가요?',
      quickAnswers: ['만 65세 이상이에요', '잘 모르겠어요', '직접 말할게요'],
      askCount: 1,
      done: false,
      crisis: false,
    });

    expect(state.screen).toBe('asking');
    expect(state.slots.whose_matter.value).toBe('어머니');
    expect(state.askCount).toBe(1);
    expect(state.nextQuestion).toBe('어머님께서 현재 몇 세이신가요?');
  });

  it('transitions to summary when turn is done', () => {
    const state = appReducer(INITIAL_STATE, {
      type: 'SET_TURN_RESULT',
      slots: INITIAL_SLOTS,
      nextQuestion: null,
      quickAnswers: [],
      askCount: 3,
      done: true,
      crisis: false,
    });

    expect(state.screen).toBe('summary');
    expect(state.nextQuestion).toBeNull();
  });

  it('triggers crisis immediately from any state', () => {
    const homeState = appReducer(INITIAL_STATE, { type: 'GIVE_CONSENT' });
    const crisisState = appReducer(homeState, { type: 'TRIGGER_CRISIS' });
    expect(crisisState.screen).toBe('crisis');
    expect(crisisState.previousScreen).toBe('home');
  });

  it('triggers error and can clear error back to previous screen', () => {
    const homeState = appReducer(INITIAL_STATE, { type: 'GIVE_CONSENT' });
    const errorState = appReducer(homeState, {
      type: 'TRIGGER_ERROR',
      error: { code: 'RATE_LIMITED', message_ko: '사용량 초과' },
    });
    expect(errorState.screen).toBe('error');
    expect(errorState.error?.code).toBe('RATE_LIMITED');

    const recovered = appReducer(errorState, { type: 'CLEAR_ERROR' });
    expect(recovered.screen).toBe('home');
    expect(recovered.error).toBeNull();
  });

  it('resets flow properly', () => {
    const dirtyState = {
      ...INITIAL_STATE,
      screen: 'summary' as const,
      askCount: 3,
      history: [
        {
          role: 'user' as const,
          text: '안녕',
          language: 'ko' as const,
          source: 'voice' as const,
        },
      ],
    };

    const reset = appReducer(dirtyState, { type: 'RESET_FLOW' });
    expect(reset.screen).toBe('home');
    expect(reset.askCount).toBe(0);
    expect(reset.history).toEqual([]);
  });
});
