import type { ReactNode } from 'react';
import {
  ChatIcon,
  ChevronLeft,
  DocIcon,
  HeartIcon,
  HomeIcon,
  PushToTalkButton,
  ScreenTitle,
} from '../components/index.js';
import type { MessageKey } from '../i18n/index.js';
import { useT } from '../i18n/useT.js';
import { useAppState, useFlow } from '../state/context.js';

const OPTIONS: { id: string; icon: ReactNode }[] = [
  { id: 'move', icon: <HomeIcon size={38} /> },
  { id: 'welfare', icon: <HeartIcon size={38} /> },
  { id: 'cert', icon: <DocIcon size={38} /> },
  { id: 'other', icon: <ChatIcon size={38} /> },
];

/**
 * 디자인 2번 "어떤 민원이세요?"(보기에서 고르기). 고른 것은 사용자가 한 말로 들어간다:
 * 찰떡이 민원 종류를 판단하는 것이 아니라 사용자가 직접 고른 말이다.
 */
export function SelectScreen() {
  const state = useAppState();
  const flow = useFlow();
  const tr = useT();
  const busy = state.phase !== 'idle';

  return (
    <div className="flex flex-1 flex-col gap-3">
      <button
        type="button"
        onClick={() => flow.setHomePanel('none')}
        className="-ml-2 flex h-12 items-center gap-1 self-start rounded-lg px-2 text-[18px] font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
      >
        <ChevronLeft size={24} />
        <span>{tr('common.back')}</span>
      </button>
      <ScreenTitle title={tr('select.title')} subtitle={tr('select.subtitle')} />

      <div className="mt-1 flex flex-col gap-3">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={busy}
            onClick={() =>
              void flow.submitText(tr(`select.${o.id}.say` as MessageKey), 'quick', {
                language: state.uiLanguage,
              })
            }
            className="flex min-h-[100px] items-center gap-4 rounded-[22px] border-2 border-line bg-white px-5 text-left transition hover:border-accent focus:outline-none focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/20 disabled:opacity-50"
          >
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] bg-accent-soft text-accent">
              {o.icon}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[24px] font-black">
                {tr(`select.${o.id}.title` as MessageKey)}
              </span>
              <span className="text-[17px] text-ink-3">
                {tr(`select.${o.id}.desc` as MessageKey)}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-auto pt-4">
        <PushToTalkButton label={tr('select.speak')} shape="pill" disabled={busy} />
      </div>
    </div>
  );
}
