/**
 * 누르는 동안 말하기(F1). 녹음기(B의 useRecorder)는 앱에 하나만 두고,
 * 어느 화면의 말하기 버튼이든 같은 녹음기·같은 "듣는 중" 화면(D4, 디자인 3번)을 쓴다.
 * 버튼은 포인터를 붙잡아(setPointerCapture) 듣는 중 화면이 덮어도 손 뗌을 놓치지 않는다.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { useT } from '../i18n/useT.js';
import { useAppState, useFlow } from '../state/context.js';
import { stopSpeaking, unlockAudio } from '../voice/speak.js';
import { RecorderError, useRecorder } from '../voice/useRecorder.js';
import { MicIcon } from './Icons.js';
import { Mascot } from './Mascot.js';

interface VoiceApi {
  begin(): void;
  end(): void;
  cancel(): void;
  holding: boolean;
  level: number;
  supported: boolean;
}

const VoiceContext = createContext<VoiceApi | null>(null);

export function VoiceProvider({ children }: { children: ReactNode }) {
  const rec = useRecorder();
  const flow = useFlow();
  const state = useAppState();
  const holding = useRef(false);
  const [isHolding, setHolding] = useState(false);
  const demo = state.mode === 'demo';

  const begin = useCallback(() => {
    if (holding.current || !flow.canTalk()) return;
    unlockAudio();
    stopSpeaking();
    holding.current = true;
    setHolding(true);
    flow.voiceStarted();
    if (!demo) rec.start();
  }, [demo, flow, rec]);

  const end = useCallback(() => {
    if (!holding.current) return;
    holding.current = false;
    setHolding(false);
    if (demo) {
      void flow.demoTalk();
      return;
    }
    rec
      .stop()
      .then((blob) => flow.submitVoice(blob))
      .catch((err: unknown) =>
        flow.voiceFailed(err instanceof RecorderError ? err.code : 'failed'),
      );
  }, [demo, flow, rec]);

  const cancel = useCallback(() => {
    if (!holding.current) return;
    holding.current = false;
    setHolding(false);
    if (!demo) rec.cancel();
    flow.voiceCancelled();
  }, [demo, flow, rec]);

  // 녹음을 시작하지 못한 경우(권한 거부·마이크 없음·미지원): 누르고 있는 중이라도 바로 알린다
  const { errorCode, recording } = rec;
  useEffect(() => {
    if (errorCode && !recording && holding.current) {
      holding.current = false;
      setHolding(false);
      flow.voiceFailed(errorCode);
    }
  }, [errorCode, recording, flow]);

  return (
    <VoiceContext.Provider
      value={{ begin, end, cancel, holding: isHolding, level: rec.level, supported: rec.supported }}
    >
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice(): VoiceApi {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error('VoiceProvider 안에서만 쓸 수 있습니다');
  return ctx;
}

type PttShape = 'hero' | 'round' | 'pill';

/**
 * 꾹 누르고 말하기 버튼(키보드: 스페이스·엔터를 누르고 있는 동안).
 *   hero  220px 원(홈)   round 140px 원(되묻기)   pill 가로 72px(고르기·고치기)
 */
export function PushToTalkButton({
  label,
  shape = 'hero',
  disabled,
}: {
  label: string;
  shape?: PttShape;
  disabled?: boolean;
}) {
  const voice = useVoice();
  const tr = useT();

  const down = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    voice.begin();
  };
  const keyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      voice.begin();
    }
  };
  const keyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      voice.end();
    }
  };

  const shapes: Record<PttShape, string> = {
    hero: 'h-[220px] w-[220px] rounded-full flex-col gap-2 text-[24px] shadow-[0_0_0_16px_rgba(29,78,216,0.12)]',
    round:
      'h-[140px] w-[140px] rounded-full flex-col gap-1 text-[18px] shadow-[0_0_0_12px_rgba(29,78,216,0.12)]',
    pill: 'h-[72px] w-full rounded-full gap-3 text-[22px]',
  };
  const iconSize = shape === 'hero' ? 80 : shape === 'round' ? 52 : 32;

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={down}
      onPointerUp={() => voice.end()}
      onPointerCancel={() => voice.cancel()}
      onKeyDown={keyDown}
      onKeyUp={keyUp}
      onContextMenu={(e) => e.preventDefault()}
      aria-pressed={voice.holding}
      aria-label={`${label}. ${tr('ptt.hint')}`}
      className={`flex shrink-0 select-none touch-none items-center justify-center font-bold text-white transition [-webkit-touch-callout:none] focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/40 disabled:opacity-50 ${
        voice.holding ? 'bg-accent-dark scale-[0.97]' : 'bg-accent hover:bg-accent-dark'
      } ${shapes[shape]}`}
    >
      <MicIcon size={iconSize} color="#fff" width={1.8} />
      <span>{voice.holding ? tr('listen.speaking') : label}</span>
    </button>
  );
}

const BARS = [
  14, 26, 40, 22, 48, 58, 34, 52, 62, 42, 30, 56, 60, 38, 50, 44, 28, 46, 36, 22, 30, 12,
];

/** 화면 2(디자인 3번) "듣는 중": 녹음 → 글로 옮기기 → 정리 단계를 화면 위에 덮어 보여 준다 */
export function ListeningOverlay() {
  const { phase, heard, mode } = useAppState();
  const voice = useVoice();
  const tr = useT();
  if (phase === 'idle') return null;

  const recording = phase === 'recording';
  const level = recording ? (mode === 'demo' ? 0.55 : voice.level) : 0;
  const title = recording
    ? tr('listen.title')
    : phase === 'transcribing'
      ? tr('listen.transcribing')
      : tr('listen.thinking');

  return (
    <div
      className={`fixed inset-0 z-40 flex justify-center bg-paper ${recording ? 'pointer-events-none' : ''}`}
      role="status"
      aria-live="assertive"
    >
      <div className="flex w-full max-w-[480px] flex-col">
        <div className="flex h-16 items-center justify-end px-5">
          <span className="inline-flex h-9 items-center gap-2 rounded-full bg-accent-soft px-3.5 text-[16px] font-bold text-accent-dark">
            <span
              className={`h-2.5 w-2.5 rounded-full ${recording ? 'bg-[#C2410C] animate-pulse' : 'bg-mochi'}`}
            />
            {recording ? tr('listen.badge') : tr('common.busy')}
          </span>
        </div>

        <div className="flex flex-1 flex-col items-center gap-4 px-5 pt-2">
          <h1 className="m-0 text-center text-[32px] font-black leading-tight tracking-[-0.5px]">
            {title}
          </h1>
          <Mascot mood={recording ? 'listening' : 'writing'} size={150} bob={!recording} />

          <div className="flex min-h-[130px] w-full flex-col gap-2 rounded-[22px] border-2 border-line bg-white px-5 py-4">
            <span className="text-[15px] font-bold text-ink-3">{tr('listen.heard')}</span>
            <p className="m-0 text-[22px] font-medium leading-[1.5]">
              {heard || (recording && mode === 'demo' ? tr('listen.demo') : '…')}
              {recording && (
                <span className="ml-1 inline-block h-6 w-[3px] animate-pulse bg-accent align-[-4px]" />
              )}
            </p>
          </div>

          {recording && (
            <div className="flex h-16 items-center gap-[5px]" aria-hidden="true">
              {BARS.map((h, i) => (
                <div
                  key={i}
                  className="w-[7px] rounded bg-accent transition-[height] duration-100"
                  style={{ height: `${Math.max(8, h * (0.35 + level * 1.1))}px` }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1.5 px-5 pb-10 pt-4 text-center">
          {recording ? (
            <>
              <div className="text-[22px] font-bold">{tr('listen.releaseBig')}</div>
              <div className="text-[17px] text-ink-3">{tr('listen.keep')}</div>
            </>
          ) : (
            <div className="text-[17px] text-ink-3">
              {tr('mascot.name')} · {tr('common.busy')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
