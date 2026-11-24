/**
 * 누르는 동안 말하기(F1). 녹음기(B의 useRecorder)는 앱에 하나만 두고,
 * 어느 화면의 말하기 버튼이든 같은 녹음기·같은 "듣는 중" 겹침 화면(D4)을 쓴다.
 * 버튼은 포인터를 붙잡아(setPointerCapture) 겹침 화면이 떠도 손 뗌을 놓치지 않는다.
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

  const release = () => {
    holding.current = false;
    setHolding(false);
  };

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
    release();
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
    release();
    if (!demo) rec.cancel();
    flow.voiceCancelled();
  }, [demo, flow, rec]);

  // 녹음을 시작하지 못한 경우(권한 거부·마이크 없음·미지원): 누르고 있는 중이라도 바로 알린다
  const { errorCode, recording } = rec;
  useEffect(() => {
    if (errorCode && !recording && holding.current) {
      release();
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

/** 꾹 누르고 말하기 버튼(키보드: 스페이스·엔터를 누르고 있는 동안) */
export function PushToTalkButton({
  label,
  size = 'xl',
  disabled,
}: {
  label: string;
  size?: 'xl' | 'lg';
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

  const big = size === 'xl';
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
      aria-describedby="ptt-hint"
      className={`w-full select-none touch-none rounded-3xl font-black text-white shadow-lg transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 disabled:opacity-50 [-webkit-touch-callout:none] ${
        voice.holding ? 'bg-red-700 scale-[0.98]' : 'bg-blue-700 hover:bg-blue-800'
      } ${big ? 'min-h-[132px] text-3xl' : 'min-h-[80px] text-2xl'}`}
    >
      <span className="flex items-center justify-center gap-3">
        <span aria-hidden="true">{voice.holding ? '🔴' : '🎙️'}</span>
        <span>{voice.holding ? tr('ptt.active') : label}</span>
      </span>
      <span id="ptt-hint" className="mt-1 block text-base font-semibold opacity-90">
        {tr('ptt.hint')}
      </span>
    </button>
  );
}

/** 화면 2 "듣는 중": 녹음·글로 옮기기·정리 단계를 앞에 겹쳐 보여 준다 */
export function ListeningOverlay() {
  const { phase, heard, mode } = useAppState();
  const voice = useVoice();
  const tr = useT();
  if (phase === 'idle') return null;

  const recording = phase === 'recording';
  const title = recording
    ? tr('listen.recording')
    : phase === 'transcribing'
      ? tr('listen.transcribing')
      : tr('listen.thinking');
  const ring = recording ? 1 + voice.level * 0.6 : 1;

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center bg-slate-900/80 p-5 ${recording ? 'pointer-events-none' : ''}`}
      role="status"
      aria-live="assertive"
    >
      <div className="w-full max-w-[440px] rounded-3xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-36 w-36 items-center justify-center">
          <div
            className={`flex h-28 w-28 items-center justify-center rounded-full text-5xl text-white transition-transform duration-100 ${recording ? 'bg-red-700' : 'bg-blue-700 animate-pulse'}`}
            style={{ transform: `scale(${ring})` }}
            aria-hidden="true"
          >
            {recording ? '🎙️' : '⏳'}
          </div>
        </div>
        <p className="text-3xl font-black text-gray-900">{title}</p>
        {recording && (
          <p className="mt-2 text-xl font-bold text-red-800">
            {mode === 'demo' ? tr('listen.demo') : tr('listen.release')}
          </p>
        )}
        {heard && !recording && (
          <div className="mt-5 rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 text-left">
            <p className="text-sm font-bold text-blue-800">{tr('listen.heard')}</p>
            <p className="mt-1 text-xl font-bold text-gray-900">“{heard}”</p>
          </div>
        )}
      </div>
    </div>
  );
}
