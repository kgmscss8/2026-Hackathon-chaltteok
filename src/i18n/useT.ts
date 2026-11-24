import { useCallback } from 'react';
import { useAppState } from '../state/context.js';
import { t, type MessageKey } from './index.js';

/** 지금 화면 언어로 문구를 꺼내는 함수 */
export function useT() {
  const lang = useAppState().uiLanguage;
  return useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => t(lang, key, vars),
    [lang],
  );
}
