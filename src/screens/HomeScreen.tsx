import { useState } from 'react';
import {
  BigButton,
  Card,
  ChevronRight,
  Mascot,
  PushToTalkButton,
  SpeakerIcon,
  TextComposer,
  TrashIcon,
} from '../components/index.js';
import { useT } from '../i18n/useT.js';
import { useAppState, useFlow } from '../state/context.js';
import type { DemoId } from '../state/types.js';

const DAY = 24 * 60 * 60 * 1000;

/** 화면 1(디자인 1번 "홈"): 가장 큰 눌러서 말하기, 글로 입력·고르기, 저장된 사전 작성, 예시 체험 */
export function HomeScreen() {
  const state = useAppState();
  const flow = useFlow();
  const tr = useT();
  const [now] = useState(Date.now);
  const busy = state.phase !== 'idle';
  const writing = state.homePanel === 'write';

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col items-center gap-3 pt-1 text-center">
        <div className="flex items-end gap-1">
          <Mascot mood="hello" size={112} bob label={tr('mascot.name')} />
        </div>
        <div className="text-[17px] font-bold text-accent">{tr('home.eyebrow')}</div>
        <h1 className="m-0 whitespace-pre-line text-[34px] font-black leading-[1.25] tracking-[-0.5px]">
          {tr('home.headline')}
        </h1>
        <p className="m-0 whitespace-pre-line text-[18px] leading-[1.55] text-ink-2">
          {tr('home.lead')}
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 pt-3">
        <PushToTalkButton label={tr('ptt.idle')} shape="hero" disabled={busy} />
        <div className="mt-2 flex items-center gap-2 text-[17px] text-ink-3">
          <SpeakerIcon size={22} />
          <span>{tr('home.voiceNote')}</span>
        </div>
      </div>

      {writing && (
        <Card className="p-4">
          <TextComposer
            label={tr('home.writeLabel')}
            placeholder={tr('home.writePlaceholder')}
            disabled={busy}
            onSubmit={(text) => void flow.submitText(text, 'text', { language: state.uiLanguage })}
            onCancel={() => flow.setHomePanel('none')}
          />
        </Card>
      )}

      <div className="mt-auto flex flex-col gap-3">
        {state.saved.map((s) => {
          const days = Math.max(1, Math.ceil((s.expires_at - now) / DAY));
          return (
            <div
              key={s.id}
              className="flex items-stretch gap-2 rounded-[18px] border-2 border-line bg-white"
            >
              <button
                type="button"
                onClick={() => flow.openSaved(s)}
                className="flex min-h-[72px] flex-1 items-center justify-between gap-2 rounded-[16px] px-4 py-3 text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
              >
                <span className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-bold text-ink-3">
                    {tr('home.savedLabel')} · {tr('home.expires', { days })}
                  </span>
                  <span className="text-[19px] font-bold leading-snug">{s.card.who}</span>
                </span>
                <ChevronRight size={24} />
              </button>
              <button
                type="button"
                onClick={() => void flow.deleteSaved(s.id)}
                aria-label={`${tr('home.delete')}: ${s.card.who}`}
                className="flex w-14 items-center justify-center border-l-2 border-line-soft text-ink-3 hover:text-danger focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
              >
                <TrashIcon size={22} />
              </button>
            </div>
          );
        })}

        <div className="grid grid-cols-2 gap-2.5">
          <BigButton
            variant={writing ? 'primary' : 'soft'}
            aria-expanded={writing}
            className="!min-h-[56px] !rounded-[14px] !text-[17px]"
            onClick={() => flow.setHomePanel(writing ? 'none' : 'write')}
          >
            {tr('home.writeShort')}
          </BigButton>
          <BigButton
            variant="soft"
            className="!min-h-[56px] !rounded-[14px] !text-[17px]"
            onClick={() => flow.setHomePanel('pick')}
          >
            {tr('home.pick')}
          </BigButton>
        </div>

        <section aria-labelledby="demo-title" className="rounded-[18px] bg-mochi-soft p-4">
          <h2 id="demo-title" className="m-0 mb-2.5 text-[16px] font-bold text-warn">
            {tr('home.demoTitle')}
          </h2>
          <div className="flex flex-col gap-2">
            {(['pension', 'move'] as DemoId[]).map((id) => (
              <button
                key={id}
                type="button"
                disabled={busy}
                onClick={() => void flow.startDemo(id)}
                className="flex min-h-[56px] items-center justify-between rounded-[14px] border-2 border-line bg-white px-4 text-left text-[17px] font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 disabled:opacity-50"
              >
                <span>{tr(id === 'pension' ? 'home.demo.pension' : 'home.demo.move')}</span>
                <ChevronRight size={22} />
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
