import { useEffect, useRef, useState, type FC } from 'react';
import { BigButton, ScreenTitle, AiMayBeWrong } from '../components/index.js';
import { DemoAdapter, DEMO_SCENARIOS } from '../demo/index.js';
import { useAppState, useLiveActions } from '../state/index.js';
import { useRecorder } from '../voice/useRecorder.js';
import { stopSpeaking } from '../voice/speak.js';

export const ListeningScreen: FC = () => {
  const { state, dispatch } = useAppState();
  const live = useLiveActions();
  const recorder = useRecorder();
  const isDemo = state.mode === 'demo';
  const demoText = DEMO_SCENARIOS[state.demoScenario].initialPrompt;
  const [demoTranscript, setDemoTranscript] = useState('');
  const startedRef = useRef(false);

  // 실제 모드: 화면에 들어오면 바로 녹음 시작(읽어 주던 소리는 멈춤)
  useEffect(() => {
    if (isDemo || startedRef.current) return;
    startedRef.current = true;
    stopSpeaking();
    recorder.start();
  }, [isDemo, recorder]);

  // 체험 모드: 텍스트 타이핑 효과로 인식 흉내
  useEffect(() => {
    if (!isDemo) return;
    let i = 0;
    const interval = setInterval(() => {
      if (i <= demoText.length) {
        setDemoTranscript(demoText.slice(0, i));
        i += 2;
      } else {
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isDemo, demoText]);

  const transcript = isDemo ? demoTranscript : state.interimTranscript;

  const handleFinishSpeaking = async () => {
    dispatch({ type: 'STOP_LISTENING' });

    if (isDemo) {
      dispatch({
        type: 'ADD_MESSAGE',
        message: { role: 'user', text: demoText, language: 'ko', source: 'voice' },
      });
      const turnResult = DemoAdapter.getTurnResult(state.demoScenario, 0);
      dispatch({
        type: 'SET_TURN_RESULT',
        slots: turnResult.slots,
        nextQuestion: turnResult.next_question,
        quickAnswers: turnResult.quick_answers,
        askCount: turnResult.ask_count,
        done: turnResult.done,
        crisis: turnResult.crisis,
      });
      return;
    }

    let blob: Blob;
    try {
      blob = await recorder.stop();
    } catch {
      return; // recorder.error에 쉬운 말 안내가 들어 있다(아래에 표시)
    }
    await live.submitVoice(blob);
  };

  const handleRetry = () => {
    recorder.start();
  };

  const handleCancel = () => {
    if (recorder.recording) void recorder.stop().catch(() => undefined);
    dispatch({ type: 'STOP_LISTENING' });
    dispatch({ type: 'NAVIGATE', screen: state.editSlot ? 'summary' : 'home' });
    if (state.editSlot) dispatch({ type: 'SET_EDIT_SLOT', slot: null });
  };

  const notSupported = !isDemo && !recorder.supported;
  const recError = !isDemo ? recorder.error : null;
  const isListening = isDemo || recorder.recording;

  return (
    <div className="flex flex-col justify-between flex-1 py-4 text-center">
      <div>
        <ScreenTitle
          title={state.busy ? '정리하고 있어요' : '듣고 있어요'}
          subtitle={
            state.busy ? '잠시만 기다려 주세요' : '다 말씀하시면 아래 "다 말했어요"를 눌러 주세요'
          }
        />

        {/* 녹음 상태 표시 (색만이 아니라 아이콘+글자로) */}
        <div className="my-8 flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center">
            {isListening && !state.busy && (
              <span className="animate-ping absolute inline-flex h-28 w-28 rounded-full bg-blue-400 opacity-30"></span>
            )}
            <div className="relative inline-flex items-center justify-center h-24 w-24 rounded-full bg-blue-600 text-white text-4xl shadow-lg">
              {state.busy ? '⏳' : '🎙️'}
            </div>
          </div>
          <span className="mt-4 font-bold text-blue-700 text-lg flex items-center gap-2">
            {state.busy ? (
              '말씀을 글로 옮기고 정리하는 중…'
            ) : isListening ? (
              <>
                <span className="inline-block w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                녹음 중입니다
              </>
            ) : (
              '마이크를 준비하고 있어요…'
            )}
          </span>
        </div>

        {(notSupported || recError) && (
          <div
            role="alert"
            className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-left text-base font-semibold text-amber-950"
          >
            {notSupported
              ? '이 브라우저에서는 음성 녹음을 지원하지 않아요. "글로 쓰기"를 이용해 주세요.'
              : recError}
          </div>
        )}

        {/* 인식된 텍스트 */}
        <div className="bg-slate-50 border-2 border-dashed border-blue-200 rounded-2xl p-5 text-left mb-6 min-h-[110px]">
          <span className="text-xs font-bold text-blue-600 block mb-1">인식된 내용:</span>
          <p className="text-xl font-bold text-gray-900 leading-relaxed">
            {transcript || '말씀을 기다리고 있습니다...'}
          </p>
        </div>
      </div>

      <div className="space-y-3 pt-4">
        {recError && !recorder.recording ? (
          <BigButton
            variant="primary"
            onClick={handleRetry}
            icon="🎙️"
            className="bg-blue-600 hover:bg-blue-700"
          >
            다시 말하기
          </BigButton>
        ) : (
          <BigButton
            variant="primary"
            onClick={() => void handleFinishSpeaking()}
            icon="✅"
            className="bg-blue-600 hover:bg-blue-700"
            subtitle="말씀이 끝나셨으면 눌러주세요"
            disabled={state.busy || notSupported || (!isDemo && !recorder.recording)}
          >
            다 말했어요
          </BigButton>
        )}

        <BigButton
          variant="subtle"
          onClick={handleCancel}
          className="text-base py-3"
          disabled={state.busy}
        >
          {notSupported || recError ? '글로 쓰러 돌아가기' : '취소하고 돌아가기'}
        </BigButton>

        <AiMayBeWrong variant="subtle" />
      </div>
    </div>
  );
};
