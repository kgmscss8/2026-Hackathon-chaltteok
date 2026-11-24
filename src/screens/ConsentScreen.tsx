import { AiNotice, BigButton, Card, LockIcon, Mascot, SpeakPill } from '../components/index.js';
import { useT } from '../i18n/useT.js';
import { useFlow } from '../state/context.js';
import { unlockAudio } from '../voice/speak.js';

/** 화면 0: 외부 전송 고지와 동의(핵심 원칙 5). 동의는 폰에만 기록. 찰떡이 "안녕하세요" */
export function ConsentScreen() {
  const tr = useT();
  const flow = useFlow();
  const points = [tr('consent.point1'), tr('consent.point2'), tr('consent.point3')];

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col items-center gap-3 pt-2 text-center">
        <Mascot mood="hello" size={168} bob label={tr('mascot.name')} />
        <div className="text-[17px] font-bold text-accent">{tr('home.eyebrow')}</div>
        <h1 className="m-0 text-[32px] font-black leading-tight tracking-[-0.5px]">
          {tr('consent.title')}
        </h1>
        <p className="m-0 text-[18px] text-ink-2">{tr('consent.subtitle')}</p>
        <SpeakPill text={[tr('consent.title'), ...points].join(' ')} />
      </div>

      <Card className="px-5 py-1">
        {points.map((p, i) => (
          <div
            key={i}
            className={`flex gap-3 py-4 text-[18px] leading-[1.5] ${i < points.length - 1 ? 'border-b-2 border-line-soft' : ''} ${i === 0 ? 'font-bold' : ''}`}
          >
            {i === 0 && (
              <span className="mt-0.5 shrink-0 text-accent">
                <LockIcon size={22} />
              </span>
            )}
            <span>{p}</span>
          </div>
        ))}
      </Card>
      <AiNotice />

      <div className="mt-auto flex flex-col gap-2.5">
        <BigButton
          className="min-h-[72px] rounded-full text-[21px]"
          onClick={() => {
            unlockAudio();
            void flow.giveConsent();
          }}
        >
          {tr('consent.agree')}
        </BigButton>
        <BigButton
          variant="soft"
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
