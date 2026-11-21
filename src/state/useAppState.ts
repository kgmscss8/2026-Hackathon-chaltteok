import { useContext } from 'react';
import { StateContext, type StateContextValue } from './StateContext.js';

export function useAppState(): StateContextValue {
  const ctx = useContext(StateContext);
  if (!ctx) {
    throw new Error('useAppState must be used within a StateProvider');
  }
  return ctx;
}
