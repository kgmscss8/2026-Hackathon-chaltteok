import { useState, type FC } from 'react';
import { BigButton, ScreenTitle, AiMayBeWrong } from '../components/index.js';
import { DemoAdapter } from '../demo/index.js';
import type { SlotKey } from '../../lib/schema.js';
import { buildSummaryCard } from '../../lib/summary.js';
import { useAppState, useLiveActions } from '../state/index.js';
import { stopSpeaking } from '../voice/speak.js';

export const SummaryScreen: FC = () => {
  const { state, dispatch } = useAppState();
  const live = useLiveActions();
  const [showOriginal, setShowOriginal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<SlotKey | null>(null);
  const [editValue, setEditValue] = useState('');
  const isDemo = state.mode === 'demo';

  // 실제 모드: /api/turn 결과로 만든 카드(없으면 지금 슬롯으로 만든다). 체험 모드: 예시 카드
  const card =
    state.currentCard ??
    (isDemo
      ? DemoAdapter.getSummaryCard(state.demoScenario)
      : buildSummaryCard(state.slots, state.questionsToAsk, state.language));

  const handleConfirm = () => {
    if (state.busy) return;
    stopSpeaking();
    if (!isDemo) {
      // 맞아요 → 최종 카드로 참고 연락처 받기 → 폰에 저장 → 창구 보여주기
      void live.confirmSummary();
      return;
    }
    if (!state.currentCard) {
      dispatch({ type: 'SET_CARD', card });
    }
    if (state.contacts.length === 0) {
      dispatch({
        type: 'SET_CONTACTS',
        contacts: DemoAdapter.getContacts(state.demoScenario),
      });
    }
    dispatch({ type: 'NAVIGATE', screen: 'showing' });
  };

  const handleSpeakEdit = () => {
    if (!editingSlot) return;
    dispatch({ type: 'SET_EDIT_SLOT', slot: editingSlot });
    setEditingSlot(null);
    dispatch({ type: 'START_LISTENING' });
  };

  const handleEditSlotClick = (slotKey: SlotKey, currentValue: string | null) => {
    setEditingSlot(slotKey);
    setEditValue(currentValue || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot || !editValue.trim() || state.busy) return;

    if (!isDemo) {
      // 그 항목만 다시 정리(원문 근거 검증 포함). 처음부터 다시 하지 않는다(F5)
      void live.submitUserText(editValue, 'text', undefined, { editSlot: editingSlot });
      setEditingSlot(null);
      return;
    }

    const updatedSlots = {
      ...state.slots,
      [editingSlot]: {
        value: editValue,
        evidence: `(직접 수정됨) ${editValue}`,
      },
    };

    dispatch({
      type: 'SET_TURN_RESULT',
      slots: updatedSlots,
      nextQuestion: null,
      quickAnswers: [],
      askCount: state.askCount,
      done: true,
      crisis: false,
    });

    setEditingSlot(null);
  };

  return (
    <div className="flex flex-col justify-between flex-1 py-3">
      <div>
        <ScreenTitle
          title="이렇게 정리되었어요"
          subtitle="틀린 내용이 없는지 항목별로 확인해 주세요"
        />

        <AiMayBeWrong className="mb-5" />

        {/* 요약 카드 목록 */}
        <div className="space-y-3 mb-6">
          <div
            onClick={() => handleEditSlotClick('whose_matter', card.who)}
            className="p-4 bg-white border-2 border-gray-200 rounded-2xl hover:border-blue-400 active:bg-blue-50 cursor-pointer transition"
          >
            <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-1">
              <span>① 누구의 일인지</span>
              <span className="text-blue-600">수정하기 ✎</span>
            </div>
            <p className="text-lg md:text-xl font-extrabold text-gray-900 leading-snug">
              {card.who}
            </p>
          </div>

          <div
            onClick={() => handleEditSlotClick('purpose', card.situation)}
            className="p-4 bg-white border-2 border-gray-200 rounded-2xl hover:border-blue-400 active:bg-blue-50 cursor-pointer transition"
          >
            <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-1">
              <span>② 현재 상황</span>
              <span className="text-blue-600">수정하기 ✎</span>
            </div>
            <p className="text-lg md:text-xl font-bold text-gray-900 leading-snug">
              {card.situation}
            </p>
          </div>

          <div
            onClick={() => handleEditSlotClick('desired', card.request)}
            className="p-4 bg-white border-2 border-gray-200 rounded-2xl hover:border-blue-400 active:bg-blue-50 cursor-pointer transition"
          >
            <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-1">
              <span>③ 원하는 요청 사항</span>
              <span className="text-blue-600">수정하기 ✎</span>
            </div>
            <p className="text-lg md:text-xl font-bold text-blue-900 leading-snug">
              {card.request}
            </p>
          </div>

          {card.unknowns.length > 0 && (
            <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl">
              <span className="text-xs font-bold text-amber-800 block mb-1">
                ④ 미확인 항목 (창구 확인 필요)
              </span>
              <ul className="list-disc list-inside text-base font-semibold text-amber-950">
                {card.unknowns.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {card.to_ask.length > 0 && (
            <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl">
              <span className="text-xs font-bold text-slate-700 block mb-1">
                ⑤ 창구 담당자에게 여쭤볼 것
              </span>
              <ul className="list-disc list-inside text-base font-semibold text-slate-900">
                {card.to_ask.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 부분 수정 모달/인라인 폼 */}
        {editingSlot && (
          <form
            onSubmit={handleSaveEdit}
            className="p-4 mb-5 bg-blue-50 border-2 border-blue-400 rounded-2xl"
          >
            <label htmlFor="slot-edit-input" className="block text-sm font-bold text-blue-900 mb-2">
              항목 내용 수정:
            </label>
            <input
              id="slot-edit-input"
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full p-3 border border-blue-300 rounded-xl text-lg font-bold mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {!isDemo && (
              <BigButton
                type="button"
                variant="secondary"
                icon="🎙️"
                onClick={handleSpeakEdit}
                className="min-h-[48px] py-2 text-base mb-2"
              >
                말로 다시 하기
              </BigButton>
            )}
            <div className="flex gap-2">
              <BigButton
                type="submit"
                variant="primary"
                className="min-h-[48px] py-2 text-base"
                disabled={state.busy}
              >
                수정 완료
              </BigButton>
              <BigButton
                type="button"
                variant="subtle"
                onClick={() => setEditingSlot(null)}
                className="min-h-[48px] py-2 text-base"
              >
                취소
              </BigButton>
            </div>
          </form>
        )}

        {/* 내가 한 말 보기 (원문 근거 evidence 토글) */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowOriginal(!showOriginal)}
            className="w-full text-center py-2 text-sm font-bold text-gray-500 hover:text-gray-800 underline"
          >
            {showOriginal ? '내가 한 말 닫기 ▲' : '내가 한 말 원문 보기 ▼'}
          </button>

          {showOriginal && (
            <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-sm text-gray-700">
              <span className="font-bold block text-gray-900">대화 원문 기록:</span>
              {state.history.length === 0 ? (
                <p className="italic text-gray-400">원문 기록이 없습니다.</p>
              ) : (
                state.history.map((msg, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="font-bold text-blue-600">
                      {msg.role === 'user' ? '나:' : 'AI:'}
                    </span>
                    <span>{msg.text}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 pt-2">
        {state.busy && (
          <p role="status" className="text-center text-base font-bold text-blue-700">
            ⏳ 정리하고 있어요…
          </p>
        )}
        <BigButton
          variant="accent"
          onClick={handleConfirm}
          icon="📱"
          className="min-h-[72px] text-xl bg-emerald-600 hover:bg-emerald-700 shadow-xl"
          subtitle="담당자에게 보여줄 큰 글씨 화면으로 전환합니다"
          disabled={state.busy}
        >
          맞아요 (창구 보여주기)
        </BigButton>
      </div>
    </div>
  );
};
