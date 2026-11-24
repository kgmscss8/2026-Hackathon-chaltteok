import { useEffect } from 'react';
import { BigButton, Card, Mascot } from '../components/index.js';
import { errorText } from '../i18n/index.js';
import { useT } from '../i18n/useT.js';
import { useAppState, useFlow } from '../state/context.js';
import { speak } from '../voice/speak.js';

/** 오류 안내(F13): 찰떡이 "다시 말씀해 주시겠어요?" + 다시 하기·글로 쓰기·예시(사용량 초과면 예시를 먼저) */
export function ErrorScreen() {
  const state = useAppState();
  const flow = useFlow();
  const tr = useT();
  const key = state.error?.key ?? 'AI_UNAVAILABLE';
  const message = errorText(state.uiLanguage, key);
  const rateLimited = key === 'RATE_LIMITED';

  useEffect(() => {
    void speak(message, state.uiLanguage);
  }, [message, state.uiLanguage]);

  return (
    <div className="flex flex-1 flex-col gap-4 pt-2" role="alert">
      <div className="flex flex-col items-center gap-2 text-center">
        <Mascot mood="puzzled" size={156} label={tr('mascot.name')} />
        <h1 className="m-0 text-[30px] font-black leading-tight tracking-[-0.5px]">
          {tr('error.title')}
        </h1>
      </div>
      <Card className="p-5">
        <p className="m-0 text-[20px] font-bold leading-[1.5]">{message}</p>
      </Card>
      <div className="mt-auto flex flex-col gap-2.5 pt-4">
        <BigButton variant={rateLimited ? 'soft' : 'primary'} onClick={() => flow.leaveError()}>
          {tr('error.retry')}
        </BigButton>
        <BigButton variant="soft" onClick={() => flow.goHome('write')}>
          {tr('error.write')}
        </BigButton>
        <BigButton variant={rateLimited ? 'primary' : 'soft'} onClick={() => flow.browseDemo()}>
          {tr('error.demo')}
        </BigButton>
      </div>
    </div>
  );
}
