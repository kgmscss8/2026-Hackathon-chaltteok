import { useEffect, useMemo, useRef } from 'react';
import { createLiveActions, type LiveActions } from './liveFlow.js';
import { useAppState } from './useAppState.js';

/** 화면에서 실제 기능(STT·/api/turn·연락처·저장)을 부르는 함수 모음 */
export function useLiveActions(): LiveActions {
  const { state, dispatch } = useAppState();
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // getState는 버튼 이벤트·비동기 처리 중에만 불린다(렌더 중에는 읽지 않음). 최신 상태를 읽기 위한 ref다.
  // eslint-disable-next-line react-hooks/refs
  return useMemo(() => createLiveActions(() => stateRef.current, dispatch), [dispatch]);
}
