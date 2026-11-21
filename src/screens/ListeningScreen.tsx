import { useEffect, useState, type FC } from 'react';
import { BigButton, ScreenTitle, AiMayBeWrong } from '../components/index.js';
import { DemoAdapter } from '../demo/index.js';
import { useAppState } from '../state/index.js';

export const ListeningScreen: FC = () => {
  const { state, dispatch } = useAppState();
  const [transcript, setTranscript] = useState(
    state.interimTranscript || (state.mode === 'demo' ? '우리 어머니 기초연금 대신 신청하려고 하는데요...' : ''),
  );

  useEffect(() => {
    // 데모 모드에서는 텍스트 타이핑 효과로 인식 흉내
    if (state.mode === 'demo' && !state.interimTranscript) {
      const demoText = '우리 어머니 기초연금 대신 신청하려고 하는데요.';
      let i = 0;
      const interval = setInterval(() => {
        if (i <= demoText.length) {
          setTranscript(demoText.slice(0, i));
          i += 2;
        } else {
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [state.mode, state.interimTranscript]);

  const handleFinishSpeaking = () => {
    dispatch({ type: 'STOP_LISTENING' });

    const spokenText = transcript || '우리 어머니 기초연금 대신 신청하려고 하는데요.';
    dispatch({
      type: 'ADD_MESSAGE',
      message: {
        role: 'user',
        text: spokenText,
        language: state.language,
        source: 'voice',
      },
    });

    if (state.mode === 'demo') {
      const turnResult = DemoAdapter.getTurnResult('pension', 0);
      dispatch({
        type: 'SET_TURN_RESULT',
        slots: turnResult.slots,
        nextQuestion: turnResult.next_question,
        quickAnswers: turnResult.quick_answers,
        askCount: turnResult.ask_count,
        done: turnResult.done,
        crisis: turnResult.crisis,
      });
    } else {
      dispatch({ type: 'NAVIGATE', screen: 'asking' });
    }
  };

  const handleCancel = () => {
    dispatch({ type: 'STOP_LISTENING' });
    dispatch({ type: 'NAVIGATE', screen: 'home' });
  };

  return (
    <div className="flex flex-col justify-between flex-1 py-4 text-center">
      <div>
        <ScreenTitle
          title="듣고 있어요"
          subtitle="천천히 편하게 말씀해 주세요"
        />

        {/* 음파 녹음 애니메이션 표시 */}
        <div className="my-8 flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-28 w-28 rounded-full bg-blue-400 opacity-30"></span>
            <div className="relative inline-flex items-center justify-center h-24 w-24 rounded-full bg-blue-600 text-white text-4xl shadow-lg">
              🎙️
            </div>
          </div>
          <span className="mt-4 font-bold text-blue-700 text-lg flex items-center gap-2">
            <span className="inline-block w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
            녹음 및 인식 중입니다...
          </span>
        </div>

        {/* 실시간 인식 텍스트 박스 */}
        <div className="bg-slate-50 border-2 border-dashed border-blue-200 rounded-2xl p-5 text-left mb-6 min-h-[110px]">
          <span className="text-xs font-bold text-blue-600 block mb-1">인식된 내용:</span>
          <p className="text-xl font-bold text-gray-900 leading-relaxed">
            {transcript || '말씀을 기다리고 있습니다...'}
          </p>
        </div>
      </div>

      <div className="space-y-3 pt-4">
        <BigButton
          variant="primary"
          onClick={handleFinishSpeaking}
          icon="✅"
          className="bg-blue-600 hover:bg-blue-700"
          subtitle="말씀이 끝나셨으면 눌러주세요"
        >
          다 말했어요
        </BigButton>

        <BigButton
          variant="subtle"
          onClick={handleCancel}
          className="text-base py-3"
        >
          취소하고 돌아가기
        </BigButton>

        <AiMayBeWrong variant="subtle" />
      </div>
    </div>
  );
};
