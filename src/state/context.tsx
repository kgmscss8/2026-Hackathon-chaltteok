import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Language } from '@lib/schema';
import { demoBackend } from '../demo/index.js';
import * as storage from '../storage/index.js';
import { liveBackend, type Backend } from './backend.js';
import { createFlow, type Flow, type FlowDeps } from './flow.js';
import { INITIAL_STATE } from './machine.js';
import { createStore, type Store } from './store.js';
import type { AppState, DemoId } from './types.js';

const LANGUAGE_KEY = 'chalddeok.language';

export function defaultDeps(): FlowDeps {
  const demos = new Map<DemoId, Backend>();
  return {
    live: liveBackend,
    demo: (id) => {
      if (!demos.has(id)) demos.set(id, demoBackend(id));
      return demos.get(id)!;
    },
    storage,
    prefs: {
      // 화면 언어만 브라우저에 기억(편의 기능). 못 읽으면 한국어로 시작
      loadLanguage: () => {
        const parsed = Language.safeParse(window.localStorage.getItem(LANGUAGE_KEY));
        return parsed.success ? parsed.data : null;
      },
      saveLanguage: (lang) => window.localStorage.setItem(LANGUAGE_KEY, lang),
    },
  };
}

interface AppContextValue {
  store: Store;
  flow: Flow;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  children,
  deps,
  initialState = INITIAL_STATE,
}: {
  children: ReactNode;
  deps?: FlowDeps;
  initialState?: AppState;
}) {
  const [value] = useState<AppContextValue>(() => {
    const store = createStore(initialState);
    return { store, flow: createFlow(store, deps ?? defaultDeps()) };
  });
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('AppProvider 안에서만 쓸 수 있습니다');
  return ctx;
}

export function useAppState(): AppState {
  const { store } = useAppContext();
  return useSyncExternalStore(store.subscribe, store.getState);
}

export function useFlow(): Flow {
  return useAppContext().flow;
}
