import { useState } from 'react';
import { BigButton, PushToTalkButton, ScreenTitle, TextComposer } from '../components/index.js';
import { PICK_KEYS } from '../i18n/index.js';
import { useT } from '../i18n/useT.js';
import { useAppState, useFlow } from '../state/context.js';
import type { DemoId } from '../state/types.js';

const DAY = 24 * 60 * 60 * 1000;

/** 화면 1: 가장 큰 "꾹 누르고 말하기", 글로 쓰기·보기에서 고르기, 저장된 요약, 예시 체험 */
export function HomeScreen() {
  const state = useAppState();
  const flow = useFlow();
  const tr = useT();
  const [now] = useState(Date.now); // 남은 보관 일수 계산 기준(화면을 열 때 한 번)
  const busy = state.phase !== 'idle';
  const panel = state.homePanel;
  const togglePanel = (p: 'write' | 'pick') => flow.setHomePanel(panel === p ? 'none' : p);

  return (
    <div className="flex flex-1 flex-col gap-5">
      <ScreenTitle title={tr('home.title')} subtitle={tr('home.subtitle')} />

      <PushToTalkButton label={tr('ptt.idle')} disabled={busy} />

      <div className="grid grid-cols-2 gap-3">
        <BigButton
          variant={panel === 'write' ? 'primary' : 'secondary'}
          icon="✏️"
          className="!px-2 !text-lg"
          aria-expanded={panel === 'write'}
          onClick={() => togglePanel('write')}
        >
          {tr('home.write')}
        </BigButton>
        <BigButton
          variant={panel === 'pick' ? 'primary' : 'secondary'}
          icon="📋"
          className="!px-2 !text-lg"
          aria-expanded={panel === 'pick'}
          onClick={() => togglePanel('pick')}
        >
          {tr('home.pick')}
        </BigButton>
      </div>

      {panel === 'write' && (
        <TextComposer
          label={tr('home.writeLabel')}
          placeholder={tr('home.writePlaceholder')}
          disabled={busy}
          onSubmit={(text) => void flow.submitText(text, 'text', { language: state.uiLanguage })}
          onCancel={() => flow.setHomePanel('none')}
        />
      )}

      {panel === 'pick' && (
        <section aria-labelledby="pick-title" className="space-y-2">
          <h2 id="pick-title" className="text-lg font-bold">
            {tr('home.pickTitle')}
          </h2>
          {PICK_KEYS.map((key) => (
            <BigButton
              key={key}
              variant="secondary"
              disabled={busy}
              className="!items-start !text-left !text-lg"
              onClick={() => void flow.submitText(tr(key), 'quick', { language: state.uiLanguage })}
            >
              {tr(key)}
            </BigButton>
          ))}
        </section>
      )}

      {state.saved.length > 0 && (
        <section aria-labelledby="saved-title" className="space-y-2">
          <h2 id="saved-title" className="text-xl font-black">
            {tr('home.saved')}
          </h2>
          {state.saved.map((s) => {
            const days = Math.max(1, Math.ceil((s.expires_at - now) / DAY));
            return (
              <div key={s.id} className="rounded-2xl border-2 border-gray-300 bg-white p-4">
                <p className="text-lg font-bold">{s.card.who}</p>
                <p className="text-base text-gray-700">
                  {new Date(s.created_at).toLocaleDateString()} · {tr('home.expires', { days })}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <BigButton variant="primary" onClick={() => flow.openSaved(s)}>
                    {tr('home.open')}
                  </BigButton>
                  <BigButton variant="secondary" onClick={() => void flow.deleteSaved(s.id)}>
                    {tr('home.delete')}
                  </BigButton>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section
        aria-labelledby="demo-title"
        className="space-y-2 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 p-4"
      >
        <h2 id="demo-title" className="text-lg font-bold text-amber-950">
          ✨ {tr('home.demoTitle')}
        </h2>
        {(['pension', 'move'] as DemoId[]).map((id) => (
          <BigButton
            key={id}
            variant="secondary"
            disabled={busy}
            className="!text-lg"
            onClick={() => void flow.startDemo(id)}
          >
            {tr(id === 'pension' ? 'home.demo.pension' : 'home.demo.move')}
          </BigButton>
        ))}
      </section>
    </div>
  );
}
