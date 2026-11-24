/**
 * 누르는 동안만 녹음(push-to-talk) 훅.
 *   버튼 누름(pointerdown) → start(), 손 뗌(pointerup/cancel) → stop() → Blob
 * - 브라우저별 형식 자동 선택: 크롬 webm/opus, iOS 사파리 mp4
 * - 0.5초 미만은 버리고 "조금 더 길게 눌러 주세요"
 * - 60초가 지나면 자동으로 멈추고, 그 뒤 stop()이 그 녹음을 돌려준다
 * - level: 0~1 소리 크기(듣는 중 화면 표시용)
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export const MIN_RECORDING_MS = 500;
export const MAX_RECORDING_MS = 60_000;

export type RecorderErrorCode =
  'unsupported' | 'denied' | 'no-device' | 'busy' | 'too-short' | 'failed';

export const RECORDER_ERROR_KO: Record<RecorderErrorCode, string> = {
  unsupported: '이 브라우저에서는 녹음을 할 수 없어요. "글로 쓰기"를 이용해 주세요.',
  denied:
    '마이크 사용이 막혀 있어요. 브라우저 설정에서 마이크를 허용하거나 "글로 쓰기"를 이용해 주세요.',
  'no-device': '마이크를 찾을 수 없어요. "글로 쓰기"를 이용해 주세요.',
  busy: '다른 앱이 마이크를 쓰고 있어요. 잠시 뒤 다시 눌러 주세요.',
  'too-short': '조금 더 길게 눌러 주세요. 누르고 있는 동안 말씀하시면 돼요.',
  failed: '녹음이 잘 안 됐어요. 다시 한 번 눌러 주세요.',
};

export class RecorderError extends Error {
  constructor(public code: RecorderErrorCode) {
    super(RECORDER_ERROR_KO[code]);
    this.name = 'RecorderError';
  }
}

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/ogg;codecs=opus',
];

/** 이 브라우저가 녹음할 수 있는 형식 중 첫 번째('' = 브라우저 기본값) */
export function pickMimeType(isTypeSupported: (type: string) => boolean): string {
  return MIME_CANDIDATES.find((type) => isTypeSupported(type)) ?? '';
}

/** getUserMedia 오류 → 쉬운 말 코드 */
export function mediaErrorCode(err: unknown): RecorderErrorCode {
  const name = (err as { name?: string } | null)?.name ?? '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError')
    return 'denied';
  if (
    name === 'NotFoundError' ||
    name === 'DevicesNotFoundError' ||
    name === 'OverconstrainedError'
  )
    return 'no-device';
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError')
    return 'busy';
  return 'failed';
}

export function isRecordingSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'
  );
}

export interface UseRecorderReturn {
  start(): void;
  stop(): Promise<Blob>;
  /** 녹음을 버리고 멈춘다(취소) */
  cancel(): void;
  recording: boolean;
  error: string | null;
  errorCode: RecorderErrorCode | null;
  supported: boolean;
  level: number;
}

type Phase = 'idle' | 'starting' | 'recording' | 'stopping';
type Deferred = { resolve: (blob: Blob) => void; reject: (err: Error) => void };

export function useRecorder(): UseRecorderReturn {
  const [recording, setRecording] = useState(false);
  const [errorCode, setErrorCode] = useState<RecorderErrorCode | null>(null);
  const [level, setLevel] = useState(0);
  const [supported] = useState(isRecordingSupported);

  const phase = useRef<Phase>('idle');
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const maxTimer = useRef<number | null>(null);
  const pending = useRef<Deferred | null>(null);
  const autoStopped = useRef<Blob | null>(null);
  const stopWhileStarting = useRef(false);
  const discard = useRef(false);
  const audioCtx = useRef<AudioContext | null>(null);
  const raf = useRef<number | null>(null);

  const fail = useCallback((code: RecorderErrorCode) => {
    setErrorCode(code);
    const deferred = pending.current;
    pending.current = null;
    deferred?.reject(new RecorderError(code));
  }, []);

  const release = useCallback(() => {
    if (maxTimer.current !== null) window.clearTimeout(maxTimer.current);
    maxTimer.current = null;
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    void audioCtx.current?.close().catch(() => undefined);
    audioCtx.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    recorder.current = null;
    phase.current = 'idle';
    setRecording(false);
    setLevel(0);
  }, []);

  // 소리 크기 표시(지원하지 않거나 실패해도 녹음에는 영향 없음)
  const watchLevel = useCallback((s: MediaStream) => {
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(s).connect(analyser);
      audioCtx.current = ctx;
      const data = new Uint8Array(analyser.fftSize);
      let last = 0;
      const tick = (now: number) => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) sum += ((v - 128) / 128) ** 2;
        if (now - last > 80) {
          last = now;
          setLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
        }
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    } catch {
      /* 소리 크기 표시만 생략 */
    }
  }, []);

  const start = useCallback(() => {
    if (!supported) {
      setErrorCode('unsupported');
      return;
    }
    if (phase.current !== 'idle') return;
    phase.current = 'starting';
    setErrorCode(null);
    chunks.current = [];
    autoStopped.current = null;
    stopWhileStarting.current = false;
    discard.current = false;

    navigator.mediaDevices
      .getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      .then((s) => {
        stream.current = s;
        if (stopWhileStarting.current || discard.current) {
          // 권한 창이 뜨는 사이에 손을 뗀 경우: 너무 짧은 녹음으로 처리
          release();
          if (!discard.current) fail('too-short');
          return;
        }
        const mimeType = pickMimeType((t) => MediaRecorder.isTypeSupported(t));
        const rec = mimeType ? new MediaRecorder(s, { mimeType }) : new MediaRecorder(s);
        recorder.current = rec;

        rec.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.current.push(e.data);
        };
        rec.onstop = () => {
          const duration = Date.now() - startedAt.current;
          const blob = new Blob(chunks.current, { type: rec.mimeType || mimeType || 'audio/webm' });
          chunks.current = [];
          const wasDiscarded = discard.current;
          release();
          if (wasDiscarded) {
            pending.current?.reject(new RecorderError('failed'));
            pending.current = null;
            return;
          }
          if (duration < MIN_RECORDING_MS || blob.size === 0) {
            fail('too-short');
            return;
          }
          if (pending.current) {
            pending.current.resolve(blob);
            pending.current = null;
          } else {
            autoStopped.current = blob; // 60초 자동 정지: 다음 stop()이 가져간다
          }
        };
        rec.onerror = () => {
          release();
          fail('failed');
        };

        startedAt.current = Date.now();
        rec.start(250);
        phase.current = 'recording';
        setRecording(true);
        watchLevel(s);
        maxTimer.current = window.setTimeout(() => {
          if (recorder.current?.state === 'recording') recorder.current.stop();
        }, MAX_RECORDING_MS);
      })
      .catch((err: unknown) => {
        release();
        fail(mediaErrorCode(err));
      });
  }, [supported, release, fail, watchLevel]);

  const stop = useCallback((): Promise<Blob> => {
    return new Promise<Blob>((resolve, reject) => {
      if (autoStopped.current) {
        const blob = autoStopped.current;
        autoStopped.current = null;
        resolve(blob);
        return;
      }
      if (phase.current === 'starting') {
        stopWhileStarting.current = true;
        pending.current = { resolve, reject };
        return;
      }
      const rec = recorder.current;
      if (phase.current !== 'recording' || !rec || rec.state !== 'recording') {
        reject(new RecorderError('failed'));
        return;
      }
      phase.current = 'stopping';
      pending.current = { resolve, reject };
      rec.stop();
    });
  }, []);

  const cancel = useCallback(() => {
    discard.current = true;
    autoStopped.current = null;
    if (recorder.current?.state === 'recording') recorder.current.stop();
    else if (phase.current !== 'starting') release();
  }, [release]);

  useEffect(
    () => () => {
      discard.current = true;
      if (recorder.current?.state === 'recording') recorder.current.stop();
      release();
    },
    [release],
  );

  return {
    start,
    stop,
    cancel,
    recording,
    error: errorCode ? RECORDER_ERROR_KO[errorCode] : null,
    errorCode,
    supported,
    level,
  };
}
