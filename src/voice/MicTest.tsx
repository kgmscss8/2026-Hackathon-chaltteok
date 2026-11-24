/**
 * 실기기 음성 점검 화면(/mic-test). 녹음 → STT, TTS 읽기를 각각 확인하고 걸린 시간·형식을 보여 준다.
 * 시연 전 폰 2종(안드로이드 크롬, iOS 사파리) 확인이 끝나면 지운다.
 */
import { useState, type PointerEvent } from 'react';
import { ApiFailure } from '@lib/errors';
import type { Language } from '@lib/schema';
import { transcribe } from '../api/transcribe.js';
import { speak, stopSpeaking, unlockAudio } from './speak.js';
import { useRecorder } from './useRecorder.js';

const SAMPLES: Record<Language, string> = {
  ko: '언제까지 해결하고 싶으세요? 천천히 말씀해 주세요.',
  en: 'When would you like this to be resolved? Please take your time.',
  vi: 'Bạn muốn việc này được giải quyết khi nào? Cứ nói từ từ nhé.',
};

export function MicTest() {
  const rec = useRecorder();
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<{ text: string; language: Language } | null>(null);
  const [ttsLang, setTtsLang] = useState<Language>('ko');
  const add = (line: string) =>
    setLog((l) => [`${new Date().toLocaleTimeString()} ${line}`, ...l].slice(0, 12));

  const down = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    unlockAudio();
    stopSpeaking();
    setResult(null);
    rec.start();
  };

  const up = async () => {
    try {
      const blob = await rec.stop();
      add(`녹음 ${blob.type || '(형식 없음)'} ${(blob.size / 1024).toFixed(1)}KB`);
      const t0 = performance.now();
      const r = await transcribe(blob);
      add(`STT ${Math.round(performance.now() - t0)}ms · ${r.language}`);
      setResult(r);
    } catch (err) {
      add(
        err instanceof ApiFailure
          ? `오류 ${err.error.code}: ${err.error.message_ko}`
          : String((err as Error).message),
      );
    }
  };

  const tts = async () => {
    unlockAudio();
    const t0 = performance.now();
    await speak(SAMPLES[ttsLang], ttsLang);
    add(`TTS 끝 ${Math.round(performance.now() - t0)}ms (${ttsLang})`);
  };

  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="text-2xl font-black">🎤 음성 점검 (파트 B)</h1>
      <p className="text-base">
        녹음 지원: <b>{rec.supported ? '됨 ✅' : '안 됨 ❌'}</b> · 상태:{' '}
        <b>{rec.recording ? '녹음 중' : '대기'}</b>
      </p>

      <button
        type="button"
        onPointerDown={down}
        onPointerUp={() => void up()}
        onPointerCancel={() => rec.cancel()}
        onContextMenu={(e) => e.preventDefault()}
        className="w-full min-h-[96px] rounded-2xl bg-blue-700 text-white text-2xl font-black select-none touch-none"
      >
        {rec.recording ? '듣는 중… 손을 떼면 끝' : '꾹 누르고 말하기'}
      </button>
      <div className="h-3 w-full rounded bg-gray-200" aria-label="소리 크기">
        <div
          className="h-3 rounded bg-emerald-500"
          style={{ width: `${Math.round(rec.level * 100)}%` }}
        />
      </div>
      {rec.error && (
        <p role="alert" className="font-bold text-amber-800">
          {rec.error}
        </p>
      )}
      {result && (
        <p className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 text-xl font-bold">
          [{result.language}] {result.text || '(아무 말도 들리지 않음)'}
        </p>
      )}

      <div className="space-y-2 rounded-2xl border p-4">
        <div className="flex gap-2">
          {(['ko', 'en', 'vi'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setTtsLang(l)}
              className={`flex-1 rounded-lg border-2 py-2 font-bold ${ttsLang === l ? 'border-blue-700 bg-blue-50' : 'border-gray-300'}`}
            >
              {l}
            </button>
          ))}
        </div>
        <p className="text-base">{SAMPLES[ttsLang]}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void tts()}
            className="flex-1 min-h-[64px] rounded-xl bg-emerald-700 text-white text-lg font-bold"
          >
            🔊 읽어 주기
          </button>
          <button
            type="button"
            onClick={stopSpeaking}
            className="min-h-[64px] rounded-xl border-2 px-4 font-bold"
          >
            멈춤
          </button>
        </div>
      </div>

      <ol className="space-y-1 text-sm text-gray-700">
        {log.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ol>
    </div>
  );
}

export default MicTest;
