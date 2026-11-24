import { reducer } from './machine.js';
import type { Action, AppState } from './types.js';

/** 아주 작은 상태 저장소: 흐름(flow)이 dispatch 직후 최신 상태를 바로 읽을 수 있게 한다 */
export interface Store {
  getState(): AppState;
  dispatch(action: Action): void;
  subscribe(listener: () => void): () => void;
}

export function createStore(initial: AppState): Store {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    dispatch(action) {
      const next = reducer(state, action);
      if (next === state) return;
      state = next;
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
