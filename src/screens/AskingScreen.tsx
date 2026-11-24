import { useEffect, useState } from 'react';
import {
  AiNotice,
  BigButton,
  PushToTalkButton,
  ScreenTitle,
  TextComposer,
} from '../components/index.js';
import { useT } from '../i18n/useT.js';
import { useAppState, useFlow } from '../state/context.js';
import { speak, stopSpeaking } from '../voice/speak.js';

const MAX_QUESTIONS = 3;

/**
 * 화면 3: 되묻기. 질문을 읽어 주고, 빠른 답 + 항상 "해당 없어요·잘 모르겠어요·직접 말할게요"(F3).
 * /api/turn은 끝 3개를 사용자 언어로 그 기본 선택지로 준다. 마지막("직접 말할게요")은 말하기·글로 쓰기를 연다.
 */
export function AskingScreen() {
  const state = useAppState();
  const flow = useFlow();
  const tr = useT();
  const [direct, setDirect] = useState(false);
  const busy = state.phase !== 'idle';
  const question = state.nextQuestion ?? '';
  const answers = state.quickAnswers;

  // 새 질문이 오면 소리로도 읽어 준다(실패하면 조용히 넘어감)
  useEffect(() => {
    if (!question) return;
    void speak(question, state.language);
    return () => stopSpeaking();
  }, [question, state.language]);

  const choose = (answer: string, index: number) => {
    if (busy) return;
    if (index === answers.length - 1) {
      setDirect(true); // "직접 말할게요"
      return;
    }
    stopSpeaking();
    void flow.submitText(answer, 'quick');
  };

  return (
    <div className="flex flex-1 flex-col gap-5">
      <ScreenTitle
        step={tr('ask.step', { n: Math.max(1, state.askCount), max: MAX_QUESTIONS })}
        title={tr('ask.title')}
        subtitle={tr('ask.subtitle')}
        speakText={question}
      />

      <div className="rounded-3xl border-2 border-blue-400 bg-blue-50 p-6" aria-live="polite">
        <p className="text-[26px] font-black leading-snug text-blue-950">{question}</p>
        <button
          type="button"
          onClick={() => void speak(question, state.language)}
          className="mt-3 min-h-[48px] rounded-xl border-2 border-blue-300 bg-white px-4 text-base font-bold text-blue-900"
        >
          {tr('ask.replay')}
        </button>
      </div>

      {direct ? (
        <div className="space-y-3">
          <PushToTalkButton label={tr('ptt.answer')} size="lg" disabled={busy} />
          <TextComposer
            label={tr('ask.writeLabel')}
            multiline={false}
            disabled={busy}
            onSubmit={(text) => void flow.submitText(text, 'text')}
            onCancel={() => setDirect(false)}
          />
        </div>
      ) : (
        <section aria-labelledby="answers-title" className="space-y-3">
          <h2 id="answers-title" className="text-lg font-bold text-gray-800">
            {tr('ask.pick')}
          </h2>
          {answers.map((answer, i) => {
            const fixed = i >= answers.length - 3; // 해당 없어요·잘 모르겠어요·직접 말할게요
            return (
              <BigButton
                key={`${i}-${answer}`}
                variant={fixed ? 'secondary' : 'primary'}
                disabled={busy}
                onClick={() => choose(answer, i)}
              >
                {answer}
              </BigButton>
            );
          })}
        </section>
      )}

      <div className="mt-auto space-y-3 pt-2">
        <BigButton variant="ghost" disabled={busy} onClick={() => flow.finishEarly()}>
          {tr('ask.finish')}
        </BigButton>
        <AiNotice />
      </div>
    </div>
  );
}
