import type { FC } from 'react';
import { BigButton, ScreenTitle } from '../components/index.js';
import { useAppState } from '../state/index.js';

export const ErrorScreen: FC = () => {
  const { state, dispatch } = useAppState();

  const errorMessage =
    state.error?.message_ko || '일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';

  const handleRetry = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // 사용량 초과·장애 시 AI 없이 예시로 체험(F13). 진행 중이던 대화는 비우고 시작한다
  const handleSwitchToDemo = () => {
    dispatch({ type: 'CLEAR_ERROR' });
    dispatch({ type: 'RESET_FLOW' });
    dispatch({ type: 'SET_MODE', mode: 'demo' });
    dispatch({ type: 'NAVIGATE', screen: 'home' });
  };
  const rateLimited = state.error?.code === 'RATE_LIMITED';

  return (
    <div className="flex flex-col justify-between flex-1 py-4 text-center">
      <div>
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
          ⚠️
        </div>

        <ScreenTitle title="안내 말씀 드려요" subtitle="정리하는 도중 문제가 생겼습니다" />

        <div className="my-6 p-6 bg-red-50 border-2 border-red-200 rounded-2xl text-left">
          <span className="text-xs font-bold text-red-600 block mb-1">안내 내용:</span>
          <p className="text-lg font-extrabold text-red-950 leading-relaxed">{errorMessage}</p>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          인터넷 연결 상태를 확인하시거나, AI 없이 즉시 사용 가능한 예시 체험 모드를 이용해 보세요.
        </p>
      </div>

      <div className="space-y-3 pt-4">
        <BigButton variant={rateLimited ? 'secondary' : 'primary'} onClick={handleRetry} icon="🔄">
          다시 시도하기
        </BigButton>

        <BigButton
          variant={rateLimited ? 'primary' : 'secondary'}
          onClick={handleSwitchToDemo}
          icon="✨"
        >
          예시로 체험하기
        </BigButton>
      </div>
    </div>
  );
};
