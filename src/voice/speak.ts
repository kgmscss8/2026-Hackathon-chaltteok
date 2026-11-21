import { Language } from '@lib/schema';
import { fetchTtsAudio } from '../api/tts';

const audioCache = new Map<string, string>();
let currentAudio: HTMLAudioElement | null = null;
let audioUnlocked = false;

const LANG_TO_BCP47: Record<Language, string> = {
  ko: 'ko-KR',
  en: 'en-US',
  vi: 'vi-VN',
};

export function unlockAudio(): void {
  if (audioUnlocked || typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    }
    audioUnlocked = true;
  } catch {
    // ignore
  }
}

export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function speakWithBrowserFallback(text: string, language: Language): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LANG_TO_BCP47[language] || 'ko-KR';
      utterance.rate = 0.9;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    } catch {
      resolve();
    }
  });
}

export async function speak(text: string, language: Language): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  stopSpeaking();

  const cacheKey = `${language}:${trimmed}`;
  try {
    let url = audioCache.get(cacheKey);
    if (!url) {
      const blob = await fetchTtsAudio(trimmed, language);
      url = URL.createObjectURL(blob);
      audioCache.set(cacheKey, url);
    }

    await new Promise<void>((resolve, reject) => {
      const audio = new Audio(url);
      currentAudio = audio;
      audio.onended = () => {
        if (currentAudio === audio) currentAudio = null;
        resolve();
      };
      audio.onerror = () => {
        if (currentAudio === audio) currentAudio = null;
        reject(new Error('AUDIO_PLAY_ERROR'));
      };
      audio.play().catch(reject);
    });
  } catch {
    await speakWithBrowserFallback(trimmed, language);
  }
}
