import { useEffect, useState, type FC } from 'react';
import { BigButton, ScreenTitle, AiMayBeWrong } from '../components/index.js';
import { DemoAdapter } from '../demo/index.js';
import { useAppState, useLiveActions } from '../state/index.js';
import { speak, stopSpeaking } from '../voice/speak.js';

const DIRECT = '직접 말할게요';

export const AskingScreen: FC = () => {
  const { state, dispatch } = useAppState();
  const live = useLiveActions();
  const [showDirectInput, setShowDirectInput] = useState(false);
  const [directText, setDirectText] = useState('');
  const isDemo = state.mode === 'demo';

  const currentQuestion = state.nextQuestion || '추가로 확인이 필요한 사항이 있습니다.';
  const quickAnswers =
    state.quickAnswers.length > 0
      ? state.quickAnswers
      : ['네, 맞아요', '아니에요', '해당 없어요', '잘 모르겠어요', DIRECT];

  // 실제 모드: 질문을 소리로 읽어 준다(실패하면 조용히 넘어가고 글자는 그대로)
  useEffect(() => {
    if (isDemo || !state.nextQuestion) return;
    void speak(state.nextQuestion, state.language);
    return () => stopSpeaking();
  }, [isDemo, state.nextQuestion, state.language]);

  const handleSelectAnswer = (answer: string, source: 'quick' | 'text' = 'quick') => {
    if (state.busy) return;
    if (answer === DIRECT) {
      setShowDirectInput(true);
      return;
    }

    if (!isDemo) {
      stopSpeaking();
      void live.submitUserText(answer, source);
      return;
    }

    dispatch({
      type: 'ADD_MESSAGE',
      message: { role: 'user', text: answer, language: state.language, source },
    });

    // 체험 모드: 다음 예시 단계로
    const turnResult = DemoAdapter.getTurnResult(state.demoScenario, state.askCount);
    dispatch({
      type: 'SET_TURN_RESULT',
      slots: turnResult.slots,
      nextQuestion: turnResult.next_question,
      quickAnswers: turnResult.quick_answers,
      askCount: turnResult.ask_count,
      done: turnResult.done,
      crisis: turnResult.crisis,
      questionsToAsk: turnResult.questions_to_ask,
    });

    if (turnResult.done) {
      dispatch({ type: 'SET_CARD', card: DemoAdapter.getSummaryCard(state.demoScenario) });
      dispatch({ type: 'SET_CONTACTS', contacts: DemoAdapter.getContacts(state.demoScenario) });
    }
  };

  const handleDirectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directText.trim()) return;
    setShowDirectInput(false);
    handleSelectAnswer(directText, 'text');
    setDirectText('');
  };

  const handleSpeakAnswer = () => {
    stopSpeaking();
    setShowDirectInput(false);
    dispatch({ type: 'START_LISTENING' });
  };

  return (
    <div className="flex flex-col justify-between flex-1 py-3">
      <div>
        <ScreenTitle
          step={`질문 ${state.askCount} / 3`}
          title="빠진 내용을 확인해 주세요"
          subtitle="정확한 민원 정리를 위해 한 가지만 여쭤볼게요"
        />

        {/* 질문 카드 (22px+ 굵은 텍스트) */}
        <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between gap-2 text-blue-700 text-sm font-bold mb-2">
            <span>🤖 AI 확인 질문</span>
            {!isDemo && state.nextQuestion && (
              <button
                type="button"
                onClick={() => void speak(state.nextQuestion!, state.language)}
                className="text-xs bg-white border border-blue-200 rounded-lg px-2 py-1"
              >
                🔊 다시 듣기
              </button>
            )}
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-blue-950 leading-snug">
            "{currentQuestion}"
          </p>
        </div>

        {state.busy && (
          <p role="status" className="mb-4 text-center text-base font-bold text-blue-700">
            ⏳ 정리하고 있어요…
          </p>
        )}

        {/* 직접 답하기: 말로 하거나 글로 쓰기 */}
        {showDirectInput && (
          <form
            onSubmit={handleDirectSubmit}
            className="mb-5 p-4 bg-gray-50 border border-gray-300 rounded-2xl"
          >
            {!isDemo && (
              <BigButton
                type="button"
                variant="primary"
                icon="🎙️"
                onClick={handleSpeakAnswer}
                className="mb-3 text-base py-3"
              >
                말로 답하기
              </BigButton>
            )}
            <label htmlFor="direct-answer" className="block text-sm font-bold text-gray-700 mb-2">
              또는 글로 적어 주세요:
            </label>
            <input
              id="direct-answer"
              type="text"
              value={directText}
              onChange={(e) => setDirectText(e.target.value)}
              placeholder="답변 내용을 적어주세요"
              className="w-full p-3 border border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-blue-500 focus:outline-none mb-3"
            />
            <div className="flex gap-2">
              <BigButton
                type="submit"
                variant="accent"
                className="min-h-[48px] py-2 text-base"
                disabled={state.busy}
              >
                입력 완료
              </BigButton>
              <BigButton
                type="button"
                variant="subtle"
                onClick={() => setShowDirectInput(false)}
                className="min-h-[48px] py-2 text-base"
              >
                닫기
              </BigButton>
            </div>
          </form>
        )}

        {/* 빠른 답 버튼 목록 */}
        <div className="space-y-3 mb-6">
          <span className="text-sm font-bold text-gray-600 block mb-1">
            아래 보기 중에서 골라주세요:
          </span>
          {quickAnswers.map((answer, index) => {
            // /api/turn은 끝 3개를 항상 "해당 없어요·잘 모르겠어요·직접 말할게요"(사용자 언어)로 준다
            const fromEnd = quickAnswers.length - index;
            const isSpecial =
              answer === '해당 없어요' ||
              answer === '잘 모르겠어요' ||
              answer === DIRECT ||
              (!isDemo && fromEnd <= 3);
            const isDirect = answer === DIRECT || (!isDemo && fromEnd === 1);
            return (
              <BigButton
                key={index}
                variant={isSpecial ? 'secondary' : 'primary'}
                onClick={() => handleSelectAnswer(isDirect ? DIRECT : answer)}
                className={isSpecial ? 'text-base font-semibold py-3.5' : 'text-lg font-bold'}
                disabled={state.busy}
              >
                {answer}
              </BigButton>
            );
          })}
        </div>
      </div>

      <AiMayBeWrong variant="subtle" />
    </div>
  );
};
