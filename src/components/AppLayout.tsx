import type { FC, ReactNode } from 'react';
import { useAppState } from '../state/index.js';

export interface AppLayoutProps {
  children: ReactNode;
  showEmergencyCall?: boolean;
}

export const AppLayout: FC<AppLayoutProps> = ({
  children,
  showEmergencyCall = true,
}) => {
  const { state, dispatch } = useAppState();

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center text-[17px] text-gray-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      <div className="w-full max-w-[440px] min-h-screen bg-white flex flex-col shadow-xl relative border-x border-slate-200">
        {/* 상단 네비게이션 & 상태 바 */}
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20">
          <button
            type="button"
            onClick={() => dispatch({ type: 'RESET_FLOW' })}
            className="flex items-center gap-2 font-black text-2xl text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg p-1"
            aria-label="찰떡 홈으로 이동"
          >
            <span>찰떡</span>
            {state.mode === 'demo' && (
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                체험 모드
              </span>
            )}
          </button>

          <div className="flex items-center gap-2">
            {showEmergencyCall && state.screen !== 'crisis' && (
              <button
                type="button"
                onClick={() => dispatch({ type: 'TRIGGER_CRISIS' })}
                className="bg-red-50 text-red-600 border border-red-200 text-sm font-bold px-2.5 py-1.5 rounded-xl hover:bg-red-100 active:bg-red-200 focus-visible:ring-2 focus-visible:ring-red-400"
                aria-label="긴급 신고 화면으로 이동"
              >
                긴급 119
              </button>
            )}
          </div>
        </header>

        {/* 본문 콘텐츠 영역 (스크롤 가능) */}
        <main className="flex-1 p-5 flex flex-col justify-between overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
