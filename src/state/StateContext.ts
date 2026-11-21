import { createContext } from 'react';
import type { AppAction, AppState } from './types.js';

export interface StateContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

export const StateContext = createContext<StateContextValue | null>(null);
