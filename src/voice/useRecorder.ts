import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseRecorderReturn {
  start(): void;
  stop(): Promise<Blob>;
  recording: boolean;
  error: string | null;
  supported: boolean;
}

function getSupportedMimeType(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return '';
  }
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

function mapMediaErrorToKorean(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return '마이크 권한이 차단되어 있어요. 브라우저 설정에서 마이크를 허용하거나 아래 "글로 쓰기"를 이용해 주세요.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return '연결된 마이크를 찾을 수 없어요. 아래 "글로 쓰기"를 이용해 주세요.';
      case 'NotReadableError':
      case 'TrackStartError':
        return '다른 앱에서 마이크를 사용 중이에요. 잠시 후 다시 시도해 주세요.';
      default:
        return '마이크를 켤 수 없어요. 아래 "글로 쓰기"를 이용해 주세요.';
    }
  }
  return '녹음을 시작하지 못했어요. 다시 한 번 눌러 주세요.';
}

export function useRecorder(): UseRecorderReturn {
  const [recording, setRecording] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startTimeRef = useRef<number>(0);
  const maxTimerRef = useRef<number | null>(null);
  const isStartingRef = useRef<boolean>(false);
  const stopRequestedBeforeStartRef = useRef<boolean>(false);
  const stopResolverRef = useRef<{
    resolve: (blob: Blob) => void;
    reject: (err: Error) => void;
  } | null>(null);

  const supported =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined';

  const cleanup = useCallback(() => {
    if (maxTimerRef.current !== null) {
      window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setRecording(false);
  }, []);

  const stop = useCallback((): Promise<Blob> => {
    return new Promise<Blob>((resolve, reject) => {
      if (isStartingRef.current && !mediaRecorderRef.current) {
        stopRequestedBeforeStartRef.current = true;
        const msg = '조금 더 길게 눌러 주세요';
        setError(msg);
        reject(new Error(msg));
        return;
      }

      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state !== 'recording') {
        reject(new Error('녹음 중이 아닙니다.'));
        return;
      }

      stopResolverRef.current = { resolve, reject };
      recorder.stop();
    });
  }, []);

  const start = useCallback((): void => {
    if (!supported) {
      setError('이 브라우저에서는 음성 녹음을 지원하지 않아요. "글로 쓰기"를 이용해 주세요.');
      return;
    }
    if (recording || isStartingRef.current) return;

    setError(null);
    chunksRef.current = [];
    isStartingRef.current = true;
    stopRequestedBeforeStartRef.current = false;

    navigator.mediaDevices
      .getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      .then((stream) => {
        isStartingRef.current = false;

        if (stopRequestedBeforeStartRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const mimeType = getSupportedMimeType();
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);

        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e: BlobEvent) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          const durationMs = Date.now() - startTimeRef.current;
          const finalType = recorder.mimeType || mimeType || 'audio/webm';
          const blob = new Blob(chunksRef.current, { type: finalType });
          chunksRef.current = [];
          cleanup();

          const pending = stopResolverRef.current;
          stopResolverRef.current = null;

          if (durationMs < 500 || blob.size === 0) {
            const shortMsg = '조금 더 길게 눌러 주세요';
            setError(shortMsg);
            if (pending) pending.reject(new Error(shortMsg));
            return;
          }

          if (pending) {
            pending.resolve(blob);
          }
        };

        recorder.onerror = () => {
          chunksRef.current = [];
          cleanup();
          const errMsg = '녹음 중 오류가 발생했어요. 다시 시도해 주세요.';
          setError(errMsg);
          if (stopResolverRef.current) {
            stopResolverRef.current.reject(new Error(errMsg));
            stopResolverRef.current = null;
          }
        };

        startTimeRef.current = Date.now();
        recorder.start(250);
        setRecording(true);

        maxTimerRef.current = window.setTimeout(() => {
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }, 60_000);
      })
      .catch((err) => {
        isStartingRef.current = false;
        cleanup();
        setError(mapMediaErrorToKorean(err));
      });
  }, [supported, recording, cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
      chunksRef.current = [];
    };
  }, [cleanup]);

  return { start, stop, recording, error, supported };
}
