import { useState, type FC } from 'react';
import { BigButton, ScreenTitle, AiMayBeWrong } from '../components/index.js';
import { DemoAdapter } from '../demo/index.js';
import { useAppState } from '../state/index.js';

export const AskingScreen: FC = () => {
  const { state, dispatch } = useAppState();
  const [showDirectInput, setShowDirectInput] = useState(false);
  const [directText, setDirectText] = useState('');

  const currentQuestion = state.nextQuestion || '추가로 확인이 필요한 사항이 있습니다.';
  const quickAnswers = state.quickAnswers.length > 0
    ? state.quickAnswers
    : ['네, 맞아요', '아니에요', '잘 모르겠어요', '직접 말할게요'];

  const handleSelectAnswer = (answer: string) => {
    if (answer === '직접 말할게요') {
      setShowDirectInput(true);
      return;
    }

    dispatch({
      type: 'ADD_MESSAGE',
      message: {
        role: 'user',
        text: answer,
        language: state.language,
        source: 'quick',
      },
    });

    if (state.mode === 'demo') {
      // 데모 모드에서 다음 스텝 진행
      const nextStepIndex = state.askCount; // 1이면 index 1, 2이면 index 2
      const turnResult = DemoAdapter.getTurnResult('pension', nextStepIndex);

      dispatch({
        type: 'SET_TURN_RESULT',
        slots: turnResult.slots,
        nextQuestion: turnResult.next_question,
        quickAnswers: turnResult.quick_answers,
        askCount: turnResult.ask_count,
        done: turnResult.done,
        crisis: turnResult.crisis,
      });

      if (turnResult.done) {
        // 완료 시 카드와 연락처 설정
        dispatch({
          type: 'SET_CARD',
          card: DemoAdapter.getSummaryCard('pension'),
        });
        dispatch({
          type: 'SET_CONTACTS',
          contacts: DemoAdapter.getContacts('pension'),
        });
      }
    }
  };

  const handleDirectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directText.trim()) return;
    setShowDirectInput(false);
    handleSelectAnswer(directText);
    setDirectText('');
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
          <div className="flex items-center gap-2 text-blue-700 text-sm font-bold mb-2">
            <span>🤖 AI 확인 질문</span>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-blue-950 leading-snug">
            "{currentQuestion}"
          </p>
        </div>

        {/* 직접 입력 폼 */}
        {showDirectInput && (
          <form onSubmit={handleDirectSubmit} className="mb-5 p-4 bg-gray-50 border border-gray-300 rounded-2xl">
            <label htmlFor="direct-answer" className="block text-sm font-bold text-gray-700 mb-2">
              답변을 직접 입력해 주세요:
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
              <BigButton type="submit" variant="accent" className="min-h-[48px] py-2 text-base">
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
            const isSpecial = answer === '해당 없어요' || answer === '잘 모르겠어요' || answer === '직접 말할게요';
            return (
              <BigButton
                key={index}
                variant={isSpecial ? 'secondary' : 'primary'}
                onClick={() => handleSelectAnswer(answer)}
                className={isSpecial ? 'text-base font-semibold py-3.5' : 'text-lg font-bold'}
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
