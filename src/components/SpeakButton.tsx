import { useEffect, useState } from 'react';
import { useT } from '../i18n/useT.js';
import { useAppState } from '../state/context.js';
import { speak, stopSpeaking, unlockAudio } from '../voice/speak.js';

/** 안내를 소리로도: 누르면 읽고, 다시 누르면 멈춘다 */
export function SpeakButton({
  text,
  label,
  className = '',
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const tr = useT();
  const lang = useAppState().uiLanguage;
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => stopSpeaking(), []);

  const toggle = async () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    unlockAudio();
    setSpeaking(true);
    await speak(text, lang);
    setSpeaking(false);
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      aria-pressed={speaking}
      className={`min-h-[48px] px-4 rounded-xl border-2 border-blue-300 bg-white text-blue-900 text-base font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 ${className}`}
    >
      {speaking ? tr('common.stopListen') : (label ?? tr('common.listen'))}
    </button>
  );
}
