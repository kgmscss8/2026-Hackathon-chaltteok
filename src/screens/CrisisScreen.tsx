import { useEffect } from 'react';
import { BigButton, PhoneIcon } from '../components/index.js';
import { useT } from '../i18n/useT.js';
import { useAppState, useFlow } from '../state/context.js';
import { speak } from '../voice/speak.js';

const LINES = [
  { phone: '119', key: 'crisis.119', className: 'bg-danger hover:bg-[#912018]' },
  { phone: '112', key: 'crisis.112', className: 'bg-accent-dark hover:bg-ink' },
  { phone: '129', key: 'crisis.129', className: 'bg-safe hover:bg-[#0d3a1f]' },
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
    <div className="flex flex-1 flex-col gap-4 pt-2" role="alert">
      <h1 className="m-0 text-[32px] font-black leading-tight tracking-[-0.5px] text-danger">
        {tr('crisis.title')}
      </h1>
      <p className="m-0 text-[20px] font-bold leading-[1.5]">{tr('crisis.body')}</p>
      {LINES.map((l) => (
        <a
          key={l.phone}
          href={`tel:${l.phone}`}
          className={`flex min-h-[84px] items-center justify-center gap-3 rounded-[22px] px-4 text-center text-[24px] font-black text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30 ${l.className}`}
        >
          <PhoneIcon size={28} color="#fff" />
          {tr(l.key)}
        </a>
      ))}
      <div className="mt-auto pt-4">
        <BigButton variant="soft" onClick={() => flow.leaveCrisis()}>
          {tr('crisis.continue')}
        </BigButton>
      </div>
    </div>
  );
}
