/**
 * 읽어 주기. /api/tts로 받은 mp3를 재생하고, 실패하거나 오프라인이면 브라우저 음성(speechSynthesis)으로,
 * 그것도 없으면 조용히 넘어간다(화면 글자는 그대로 보이므로).
 * - 새 speak()나 stopSpeaking()이 오면 이전 읽기는 즉시 멈추고, 받아 오던 소리도 재생하지 않는다.
 * - 같은 문장은 세션 동안 메모리에 담아 다시 받지 않는다.
 * - iOS: 첫 터치에서 unlockAudio()를 불러 재생 잠금을 푼다.
 */
import type { Language } from '@lib/schema';
import { fetchTtsAudio } from '../api/tts.js';

export const SPEECH_LANG: Record<Language, string> = { ko: 'ko-KR', en: 'en-US', vi: 'vi-VN' };
const CACHE_LIMIT = 30;
// 0.1초 무음 wav (재생 잠금 해제용)
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

const cache = new Map<string, string>(); // `${lang}:${text}` → object URL
let player: HTMLAudioElement | null = null;
let token = 0;
let unlocked = false;
let finishCurrent: (() => void) | null = null; // 멈출 때 기다리던 speak()를 끝내 준다

function getPlayer(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  player ??= new Audio();
  return player;
}

function remember(key: string, url: string) {
  cache.set(key, url);
  if (cache.size > CACHE_LIMIT) {
    const [oldKey, oldUrl] = cache.entries().next().value as [string, string];
    cache.delete(oldKey);
    URL.revokeObjectURL(oldUrl);
  }
}

/** 첫 사용자 터치 때 호출: iOS·사파리의 자동 재생 제한을 푼다 */
export function unlockAudio(): void {
  if (unlocked || typeof window === 'undefined') return;
  unlocked = true;
  try {
    const p = getPlayer();
    if (p) {
      p.src = SILENT_WAV;
      void p.play().then(
        () => p.pause(),
        () => undefined,
      );
    }
    if ('speechSynthesis' in window) {
      // 일부 브라우저는 첫 발화를 사용자 동작 안에서 해야 이후 발화가 된다
      const warm = new SpeechSynthesisUtterance('');
      warm.volume = 0;
      window.speechSynthesis.speak(warm);
    }
  } catch {
    /* 잠금 해제 실패는 무시: 화면 글자는 그대로 */
  }
}

export function stopSpeaking(): void {
  token += 1;
  if (player) {
    player.pause();
    player.onended = null;
    player.onerror = null;
  }
  const finish = finishCurrent;
  finishCurrent = null;
  finish?.();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function speakWithBrowser(text: string, language: Language, my: number): Promise<void> {
  return new Promise((resolve) => {
    if (my !== token || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = SPEECH_LANG[language];
      u.rate = 0.85;
      const done = () => {
        if (finishCurrent === done) finishCurrent = null;
        resolve();
      };
      finishCurrent = done;
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.speak(u);
    } catch {
      resolve();
    }
  });
}

function play(url: string, my: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = getPlayer();
    if (!p || my !== token) {
      resolve();
      return;
    }
    const done = () => {
      if (finishCurrent === done) finishCurrent = null;
      resolve();
    };
    finishCurrent = done;
    p.onended = done;
    p.onerror = () => {
      if (finishCurrent === done) finishCurrent = null;
      reject(new Error('AUDIO_PLAY_FAILED'));
    };
    p.src = url;
    p.play().catch((err: unknown) => {
      if (finishCurrent === done) finishCurrent = null;
      reject(err);
    });
  });
}

/** 문장을 읽는다. 읽기가 끝나거나 멈추면 resolve(실패해도 reject하지 않음) */
export async function speak(text: string, language: Language): Promise<void> {
  const trimmed = text.trim();
  stopSpeaking();
  if (!trimmed) return;
  const my = token;
  const key = `${language}:${trimmed}`;

  try {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('OFFLINE');
    let url = cache.get(key);
    if (!url) {
      const audio = await fetchTtsAudio(trimmed, language);
      url = URL.createObjectURL(audio);
      remember(key, url);
    }
    if (my !== token) return; // 받는 사이에 멈추거나 다른 문장을 읽기 시작함
    await play(url, my);
  } catch {
    await speakWithBrowser(trimmed, language, my);
  }
}

/** 테스트용: 모듈 상태 초기화 */
export function resetSpeechForTest(): void {
  stopSpeaking();
  cache.clear();
  player = null;
  unlocked = false;
}
