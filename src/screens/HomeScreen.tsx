import { useState, type FC } from 'react';
import { BigButton, ScreenTitle, AiMayBeWrong } from '../components/index.js';
import { DemoAdapter, DEMO_SCENARIOS } from '../demo/index.js';
import { useAppState, useLiveActions } from '../state/index.js';
import { deleteSummary, listSummaries } from '../storage/index.js';
import { unlockAudio } from '../voice/speak.js';

export const HomeScreen: FC = () => {
  const { state, dispatch } = useAppState();
  const live = useLiveActions();
  const [showTextInput, setShowTextInput] = useState(false);
  const [inputText, setInputText] = useState('');

  const handleStartVoice = () => {
    unlockAudio();
    if (state.mode === 'live' && !state.consentGiven) {
      dispatch({ type: 'NAVIGATE', screen: 'consent' });
      return;
    }
    dispatch({ type: 'START_LISTENING' });
  };

  const handleDeleteSaved = async (id: string) => {
    try {
      await deleteSummary(id);
      dispatch({ type: 'SET_SAVED_SUMMARIES', summaries: await listSummaries() });
    } catch {
      /* 저장소를 못 쓰면 목록만 그대로 둔다 */
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || state.busy) return;

    if (state.mode === 'live') {
      unlockAudio();
      void live.submitUserText(inputText, 'text');
      setInputText('');
      return;
    }

    dispatch({
      type: 'ADD_MESSAGE',
      message: {
        role: 'user',
        text: inputText,
        language: state.language,
        source: 'text',
      },
    });

    // 체험 모드: 진행 중인 예시 시나리오의 첫 응답으로 시작
    const firstResult = DemoAdapter.getTurnResult(state.demoScenario, 0);
    dispatch({
      type: 'SET_TURN_RESULT',
      slots: firstResult.slots,
      nextQuestion: firstResult.next_question,
      quickAnswers: firstResult.quick_answers,
      askCount: firstResult.ask_count,
      done: firstResult.done,
      crisis: firstResult.crisis,
    });
  };

  const handleStartDemoScenario = (scenarioId: 'pension' | 'moving') => {
    dispatch({ type: 'RESET_FLOW' });
    dispatch({ type: 'SET_MODE', mode: 'demo' });
    dispatch({ type: 'SET_DEMO_SCENARIO', id: scenarioId });
    const scenario = DEMO_SCENARIOS[scenarioId];

    dispatch({
      type: 'ADD_MESSAGE',
      message: {
        role: 'user',
        text: scenario.initialPrompt,
        language: 'ko',
        source: 'quick',
      },
    });

    const turn1 = scenario.steps[0].result;
    dispatch({
      type: 'SET_TURN_RESULT',
      slots: turn1.slots,
      nextQuestion: turn1.next_question,
      quickAnswers: turn1.quick_answers,
      askCount: turn1.ask_count,
      done: turn1.done,
      crisis: turn1.crisis,
    });
  };

  return (
    <div className="flex flex-col justify-between flex-1 py-2">
      <div>
        <ScreenTitle
          title="어떤 일로 오셨나요?"
          subtitle="주민센터에 가기 전에 편하게 말씀해 주세요"
        />

        {/* 메인 말하기 버튼 (가장 큰 터치 영역 84px+) */}
        <div className="my-6">
          <BigButton
            variant="primary"
            onClick={handleStartVoice}
            icon="🎙️"
            className="min-h-[84px] text-2xl shadow-xl bg-blue-600 hover:bg-blue-700"
            subtitle="누르면 바로 듣기 시작해요"
          >
            눌러서 말하기
          </BigButton>
        </div>

        {/* 보조 입력 버튼: 글로 쓰기 & 보기에서 고르기 */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <BigButton
            variant="secondary"
            onClick={() => setShowTextInput(!showTextInput)}
            icon="✏️"
            className="text-base py-3"
          >
            글로 쓰기
          </BigButton>

          <BigButton
            variant="secondary"
            onClick={() => handleStartDemoScenario('pension')}
            icon="📋"
            className="text-base py-3"
          >
            예시로 고르기
          </BigButton>
        </div>

        {/* 글로 쓰기 펼침 입력창 */}
        {showTextInput && (
          <form
            onSubmit={handleTextSubmit}
            className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-2xl"
          >
            <label htmlFor="civil-input" className="block text-sm font-bold text-gray-700 mb-2">
              용건을 직접 입력해 주세요:
            </label>
            <textarea
              id="civil-input"
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="예: 어머니 기초연금 대신 신청하려고 왔습니다."
              className="w-full p-3 border border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-blue-500 focus:outline-none mb-3"
            />
            <BigButton
              type="submit"
              variant="accent"
              className="min-h-[48px] py-2 text-base"
              disabled={state.busy}
            >
              {state.busy ? '정리하고 있어요…' : '입력 완료'}
            </BigButton>
          </form>
        )}

        {/* 예시로 체험하기 섹션 */}
        <section
          aria-labelledby="demo-scenarios-heading"
          className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4"
        >
          <h2
            id="demo-scenarios-heading"
            className="font-bold text-sm text-gray-700 mb-3 flex items-center justify-between"
          >
            <span>✨ 예시로 미리 체험해보기</span>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
              체험 모드
            </span>
          </h2>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleStartDemoScenario('pension')}
              className="w-full text-left p-3.5 bg-white border border-gray-200 rounded-xl hover:border-blue-400 active:bg-blue-50 transition cursor-pointer flex items-center justify-between"
            >
              <div>
                <span className="font-bold text-base text-gray-900 block">
                  ① 어머니 기초연금 신청 대리
                </span>
                <span className="text-xs text-gray-500 mt-0.5 block">
                  부모님 대신 복지 혜택을 알아보고 신청할 때
                </span>
              </div>
              <span className="text-gray-400 text-xl font-bold">›</span>
            </button>

            <button
              type="button"
              onClick={() => handleStartDemoScenario('moving')}
              className="w-full text-left p-3.5 bg-white border border-gray-200 rounded-xl hover:border-blue-400 active:bg-blue-50 transition cursor-pointer flex items-center justify-between"
            >
              <div>
                <span className="font-bold text-base text-gray-900 block">② 이사 전입신고</span>
                <span className="text-xs text-gray-500 mt-0.5 block">
                  새 주소지로 이사 후 주민등록 주소를 바꿀 때
                </span>
              </div>
              <span className="text-gray-400 text-xl font-bold">›</span>
            </button>
          </div>
        </section>

        {/* 저장된 요약 목록 (있을 경우 표시) */}
        {state.savedSummaries.length > 0 && (
          <section aria-labelledby="saved-summaries-heading" className="mt-4 mb-4">
            <h2 id="saved-summaries-heading" className="font-bold text-base text-gray-900 mb-2">
              최근 정리한 내역 ({state.savedSummaries.length})
            </h2>
            <div className="space-y-2">
              {state.savedSummaries.map((summary) => (
                <div
                  key={summary.id}
                  className="p-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-sm text-gray-900">{summary.card.who}</p>
                    <p className="text-xs text-gray-500">{summary.card.request}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        dispatch({ type: 'SET_CARD', card: summary.card });
                        dispatch({ type: 'SET_CONTACTS', contacts: summary.contacts });
                        dispatch({ type: 'NAVIGATE', screen: 'showing' });
                      }}
                      className="text-xs bg-blue-50 text-blue-700 font-bold px-3 py-1.5 rounded-lg border border-blue-200"
                    >
                      열기
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteSaved(summary.id)}
                      className="text-xs bg-gray-50 text-gray-600 font-bold px-3 py-1.5 rounded-lg border border-gray-200"
                      aria-label={`${summary.card.who} 지우기`}
                    >
                      지우기
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <AiMayBeWrong variant="subtle" className="mt-2" />
    </div>
  );
};
