import { useEffect } from 'react';
import { BigButton } from '../components/index.js';
import { errorText } from '../i18n/index.js';
import { useT } from '../i18n/useT.js';
import { useAppState, useFlow } from '../state/context.js';
import { speak } from '../voice/speak.js';

/** 오류 안내(F13): 쉬운 말 + 다시 하기·글로 쓰기·예시로 체험(사용량 초과면 체험을 먼저) */
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
    <div className="flex flex-1 flex-col gap-4" role="alert">
      <h1 className="text-[28px] font-black">⚠️ {tr('error.title')}</h1>
      <p className="rounded-2xl border-2 border-amber-500 bg-amber-50 p-5 text-xl font-bold text-amber-950">
        {message}
      </p>
      <div className="mt-auto space-y-3 pt-4">
        <BigButton
          variant={rateLimited ? 'secondary' : 'primary'}
          icon="🔄"
          onClick={() => flow.leaveError()}
        >
          {tr('error.retry')}
        </BigButton>
        <BigButton variant="secondary" icon="✏️" onClick={() => flow.goHome('write')}>
          {tr('error.write')}
        </BigButton>
        <BigButton
          variant={rateLimited ? 'primary' : 'secondary'}
          icon="✨"
          onClick={() => flow.browseDemo()}
        >
          {tr('error.demo')}
        </BigButton>
      </div>
    </div>
  );
}
