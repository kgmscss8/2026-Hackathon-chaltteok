import type { FC } from 'react';
import { BigButton, ScreenTitle } from '../components/index.js';
import { useAppState } from '../state/index.js';

export const CrisisScreen: FC = () => {
  const { state, dispatch } = useAppState();

  const handleResume = () => {
    dispatch({
      type: 'NAVIGATE',
      screen: state.previousScreen || 'home',
    });
  };

  return (
    <div className="flex flex-col justify-between flex-1 py-4 text-center">
      <div>
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">
          🚨
        </div>

        <ScreenTitle
          title="도움이 필요하신가요?"
          subtitle="생명·안전이나 긴급한 생계 위기 시 바로 연락하세요"
        />

        {/* 3대 긴급 전화 버튼 */}
        <div className="space-y-4 my-6">
          <a
            href="tel:119"
            className="w-full min-h-[72px] bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black text-2xl rounded-2xl flex items-center justify-center gap-3 shadow-lg transition"
          >
            <span>🚑 긴급 구조 119</span>
          </a>

          <a
            href="tel:112"
            className="w-full min-h-[72px] bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-black text-2xl rounded-2xl flex items-center justify-center gap-3 shadow-lg transition"
          >
            <span>👮 경찰 신고 112</span>
          </a>

          <a
            href="tel:129"
            className="w-full min-h-[72px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-2xl rounded-2xl flex items-center justify-center gap-3 shadow-lg transition"
          >
            <span>🤝 보건복지상담 129</span>
          </a>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-left text-sm text-amber-900">
          <p className="font-bold mb-1">안내:</p>
          <p>
            위급한 상황이 아니며 주민센터 민원 정리를 계속 진행하시려면 아래 버튼을 눌러주세요.
          </p>
        </div>
      </div>

      <div className="pt-4">
        <BigButton
          variant="secondary"
          onClick={handleResume}
          className="text-lg py-4"
        >
          계속 민원 정리하기
        </BigButton>
      </div>
    </div>
  );
};
