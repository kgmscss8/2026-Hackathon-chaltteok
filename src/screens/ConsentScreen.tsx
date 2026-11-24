import { AiNotice, BigButton, ScreenTitle } from '../components/index.js';
import { useT } from '../i18n/useT.js';
import { useFlow } from '../state/context.js';
import { unlockAudio } from '../voice/speak.js';

/** 화면 0: 외부 전송 고지와 동의(핵심 원칙 5). 동의는 폰에만 기록 */
export function ConsentScreen() {
  const tr = useT();
  const flow = useFlow();
  const points = [tr('consent.point1'), tr('consent.point2'), tr('consent.point3')];

  return (
    <div className="flex flex-1 flex-col">
      <ScreenTitle
        title={tr('consent.title')}
        subtitle={tr('consent.subtitle')}
        speakText={[tr('consent.title'), ...points].join(' ')}
      />
      <ul className="mb-5 space-y-3">
        {points.map((p, i) => (
          <li
            key={i}
            className={`flex gap-3 rounded-2xl border-2 p-4 text-lg ${i === 0 ? 'border-blue-400 bg-blue-50 font-bold text-blue-950' : 'border-gray-200 bg-white'}`}
          >
            <span aria-hidden="true">{['🔒', '🤝', '🗑️'][i]}</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <AiNotice className="mb-6" />
      <div className="mt-auto space-y-3">
        <BigButton
          icon="✅"
          onClick={() => {
            unlockAudio();
            void flow.giveConsent();
          }}
        >
          {tr('consent.agree')}
        </BigButton>
        <BigButton
          variant="secondary"
          onClick={() => {
            unlockAudio();
            flow.browseDemo();
          }}
        >
          {tr('consent.demo')}
        </BigButton>
      </div>
    </div>
  );
}
