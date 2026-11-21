import { useReducer, type ReactNode } from 'react';
import { appReducer, INITIAL_STATE } from './machine.js';
import { StateContext } from './StateContext.js';
import type { AppState } from './types.js';

export function StateProvider({
  children,
  initialState = INITIAL_STATE,
}: {
  children: ReactNode;
  initialState?: AppState;
}) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return <StateContext.Provider value={{ state, dispatch }}>{children}</StateContext.Provider>;
}
