import type { FC } from 'react';
import { BigButton, ScreenTitle, AiMayBeWrong } from '../components/index.js';
import { useAppState } from '../state/index.js';

export const ConsentScreen: FC = () => {
  const { dispatch } = useAppState();

  const handleConsent = () => {
    dispatch({ type: 'GIVE_CONSENT' });
  };

  const handleDemoBrowse = () => {
    dispatch({ type: 'SET_MODE', mode: 'demo' });
    dispatch({ type: 'GIVE_CONSENT' });
  };

  return (
    <div className="flex flex-col justify-between flex-1 py-4">
      <div>
        <ScreenTitle
          title="찰떡 시작하기"
          subtitle="개떡같이 말해도 찰떡같이 알아듣는 민원 요약 도우미"
        />

        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 mb-6 text-gray-800 space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">🔒</span>
            <div>
              <h2 className="font-bold text-lg text-blue-900">개인정보 및 안내 고지</h2>
              <p className="mt-1 text-base leading-relaxed">
                말씀하신 내용은 민원 요약 정리를 위해 AI(OpenAI)로 전송되며,
                <strong className="text-blue-950 font-extrabold underline ml-1">
                  요약본과 대화 내용은 오직 내 폰에만 저장됩니다.
                </strong>
              </p>
            </div>
          </div>

          <div className="border-t border-blue-100 pt-3 text-sm text-gray-600 space-y-1">
            <p>• AI는 자격 판정이나 법률 해석을 하지 않고, 대필·정리만 돕습니다.</p>
            <p>• 주민센터 창구 담당자에게 바로 보여줄 수 있는 5줄 카드로 정리됩니다.</p>
          </div>
        </div>

        <AiMayBeWrong className="mb-4" />
      </div>

      <div className="space-y-3 pt-4">
        <BigButton
          variant="primary"
          onClick={handleConsent}
          icon="✨"
          subtitle="고지 사항에 동의하고 찰떡을 시작합니다"
        >
          동의하고 시작하기
        </BigButton>

        <BigButton
          variant="secondary"
          onClick={handleDemoBrowse}
          subtitle="동의 없이 예시 화면을 먼저 체험해 봅니다"
        >
          예시로 먼저 둘러보기
        </BigButton>
      </div>
    </div>
  );
};
