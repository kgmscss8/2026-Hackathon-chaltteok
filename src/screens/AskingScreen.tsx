import { useEffect, useState } from 'react';
import {
  AiNotice,
  BigButton,
  Card,
  Mascot,
  PushToTalkButton,
  SpeakerIcon,
  TextComposer,
} from '../components/index.js';
import { useT } from '../i18n/useT.js';
import { useAppState, useFlow } from '../state/context.js';
import { speak, stopSpeaking } from '../voice/speak.js';

const MAX_QUESTIONS = 3;

/**
 * 화면 3(디자인 4번 "되묻기"). 질문을 읽어 주고, 빠른 답 + 항상 "해당 없어요·잘 모르겠어요·직접 말할게요"(F3).
 * /api/turn은 끝 3개를 사용자 언어로 그 기본 선택지로 준다. 마지막("직접 말할게요")은 글로 쓰기를 연다.
 */
export function AskingScreen() {
  const state = useAppState();
  const flow = useFlow();
  const tr = useT();
  const [writing, setWriting] = useState(false);
  const busy = state.phase !== 'idle';
  const question = state.nextQuestion ?? '';
  const answers = state.quickAnswers;
  const step = Math.min(MAX_QUESTIONS, Math.max(1, state.askCount));

  // 새 질문이 오면 소리로도 읽어 준다(실패하면 조용히 넘어감)
  useEffect(() => {
    if (!question) return;
    void speak(question, state.language);
    return () => stopSpeaking();
  }, [question, state.language]);

  const choose = (answer: string, index: number) => {
    if (busy) return;
    if (index === answers.length - 1) {
      setWriting(true); // "직접 말할게요": 아래 대답하기(말) 또는 글로
      return;
    }
    stopSpeaking();
    void flow.submitText(answer, 'quick');
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-[19px] font-bold text-ink-3">{tr('ask.oneMore')}</div>
        <div className="flex items-center gap-2.5">
          <span className="text-[16px] font-bold text-ink-3">
            {tr('ask.step', { n: step, max: MAX_QUESTIONS })}
          </span>
          <span className="flex gap-1.5" aria-hidden="true">
            {Array.from({ length: MAX_QUESTIONS }, (_, i) => (
              <span
                key={i}
                className={`h-3 w-3 rounded-full ${i < step ? 'bg-accent' : 'border-2 border-[#8A857B]'}`}
              />
            ))}
          </span>
        </div>
      </div>

      <Card accent className="relative flex flex-col gap-4 p-[22px]">
        <Mascot mood="hello" size={76} className="absolute -top-9 right-3" />
        <h1
          className="m-0 pr-14 text-[28px] font-black leading-[1.3] tracking-[-0.5px]"
          aria-live="polite"
        >
          {question}
        </h1>
        <button
          type="button"
          onClick={() => void speak(question, state.language)}
          className="inline-flex h-12 items-center gap-2 self-start rounded-full border-2 border-line-strong bg-paper px-[18px] text-[17px] font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
        >
          <SpeakerIcon size={22} />
          <span>{tr('ask.replayShort')}</span>
        </button>
      </Card>

      {writing ? (
        <TextComposer
          label={tr('ask.writeLabel')}
          multiline={false}
          disabled={busy}
          onSubmit={(text) => void flow.submitText(text, 'text')}
          onCancel={() => setWriting(false)}
        />
      ) : (
        <>
          <div className="text-[17px] text-ink-2">{tr('ask.hint')}</div>
          <div className="grid grid-cols-2 gap-2.5">
            {answers.map((answer, i) => {
              const fixed = i >= answers.length - 3; // 해당 없어요·잘 모르겠어요·직접 말할게요
              return (
                <button
                  key={`${i}-${answer}`}
                  type="button"
                  disabled={busy}
                  onClick={() => choose(answer, i)}
                  className={`flex min-h-[68px] items-center justify-center rounded-[16px] border-2 border-line px-2 text-center leading-snug focus:outline-none focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/20 disabled:opacity-50 ${
                    fixed
                      ? 'bg-paper-dim text-[18px] font-medium text-ink-2'
                      : 'bg-white text-[20px] font-bold text-ink hover:border-accent'
                  }`}
                >
                  {answer}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-auto flex flex-col items-center gap-4 pt-3">
        <PushToTalkButton label={tr('ask.answer')} shape="round" disabled={busy} />
        <BigButton
          variant="ghost"
          className="!min-h-[48px] !text-[17px]"
          disabled={busy}
          onClick={() => flow.finishEarly()}
        >
          {tr('ask.finish')}
        </BigButton>
        <AiNotice className="w-full" />
      </div>
    </div>
  );
}
