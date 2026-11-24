import { useEffect } from 'react';
import { BigButton } from '../components/index.js';
import { useT } from '../i18n/useT.js';
import { useAppState, useFlow } from '../state/context.js';
import { speak } from '../voice/speak.js';

const LINES = [
  { phone: '119', key: 'crisis.119', className: 'bg-red-700 hover:bg-red-800' },
  { phone: '112', key: 'crisis.112', className: 'bg-blue-800 hover:bg-blue-900' },
  { phone: '129', key: 'crisis.129', className: 'bg-emerald-700 hover:bg-emerald-800' },
] as const;

/** 위기 안내(F11): 119·112·129를 가장 먼저. 어느 단계에서든 끼어든다 */
export function CrisisScreen() {
  const tr = useT();
  const flow = useFlow();
  const { uiLanguage } = useAppState();

  useEffect(() => {
    void speak(`${tr('crisis.title')} ${tr('crisis.body')}`, uiLanguage);
  }, [tr, uiLanguage]);

  return (
    <div className="flex flex-1 flex-col gap-4" role="alert">
      <h1 className="text-[30px] font-black text-red-800">🚨 {tr('crisis.title')}</h1>
      <p className="text-xl font-bold">{tr('crisis.body')}</p>
      {LINES.map((l) => (
        <a
          key={l.phone}
          href={`tel:${l.phone}`}
          className={`flex min-h-[80px] items-center justify-center rounded-2xl px-4 text-center text-2xl font-black text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-gray-400 ${l.className}`}
        >
          📞 {tr(l.key)}
        </a>
      ))}
      <div className="mt-auto pt-4">
        <BigButton variant="secondary" onClick={() => flow.leaveCrisis()}>
          {tr('crisis.continue')}
        </BigButton>
      </div>
    </div>
  );
}
