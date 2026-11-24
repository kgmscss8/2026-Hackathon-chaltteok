import { useEffect, useState, type ReactNode } from 'react';
import { LANGUAGES, t } from '../i18n/index.js';
import { useT } from '../i18n/useT.js';
import { useAppState, useFlow } from '../state/context.js';
import { stopSpeaking } from '../voice/speak.js';
import { ListeningOverlay } from './Voice.js';

const ZOOM_KEY = 'chalddeok.zoom';

function loadZoom(): boolean {
  try {
    return window.localStorage.getItem(ZOOM_KEY) === '1';
  } catch {
    return false;
  }
}

/** 모든 화면 공통 틀: 머리(찰떡·체험 배지·가+·언어·긴급), 본문, 안내 알림, 듣는 중 화면 */
export function AppShell({ children }: { children: ReactNode }) {
  const state = useAppState();
  const flow = useFlow();
  const tr = useT();
  const [big, setBig] = useState(loadZoom);

  useEffect(() => {
    const lang = LANGUAGES.find((l) => l.code === state.uiLanguage);
    document.documentElement.lang = lang?.htmlLang ?? 'ko';
    document.title = t(state.uiLanguage, 'app.name');
  }, [state.uiLanguage]);

  // 화면이 바뀌면 읽던 소리는 멈춘다
  useEffect(() => stopSpeaking, [state.screen]);

  useEffect(() => {
    if (!state.notice) return;
    const id = window.setTimeout(() => flow.clearNotice(), 6000);
    return () => window.clearTimeout(id);
  }, [state.notice, flow]);

  const toggleBig = () => {
    setBig((v) => {
      try {
        window.localStorage.setItem(ZOOM_KEY, v ? '0' : '1');
      } catch {
        /* 기억 못 해도 이번엔 적용 */
      }
      return !v;
    });
  };

  const canGoHome = state.consent || state.mode === 'demo';
  const showHeader = state.screen !== 'showing';

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div
        className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col"
        style={{ zoom: big ? 1.15 : 1 }}
      >
        {showHeader && (
          <header className="sticky top-0 z-30 flex h-16 items-center gap-2 bg-paper/95 px-4 backdrop-blur">
            <button
              type="button"
              onClick={() => canGoHome && flow.goHome()}
              className="rounded-lg px-1 text-[20px] font-black text-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
              aria-label={`${tr('app.name')} — ${tr('common.home')}`}
            >
              {tr('app.name')}
            </button>
            {state.mode === 'demo' && (
              <span className="rounded-full bg-mochi-soft px-2.5 py-0.5 text-[14px] font-bold text-warn">
                {tr('common.demoBadge')}
              </span>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              <label className="sr-only" htmlFor="ui-language">
                {tr('common.language')}
              </label>
              <select
                id="ui-language"
                value={state.uiLanguage}
                onChange={(e) =>
                  flow.setUiLanguage(e.target.value as (typeof LANGUAGES)[number]['code'])
                }
                className="h-12 rounded-full border-2 border-line-strong bg-white px-2 text-[15px] font-bold"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={toggleBig}
                aria-pressed={big}
                aria-label={big ? tr('common.fontNormal') : tr('common.fontBigger')}
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-line-strong bg-white text-[17px] font-black focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
              >
                {big ? '가-' : '가+'}
              </button>
              {state.screen !== 'crisis' && (
                <button
                  type="button"
                  onClick={() => flow.crisis()}
                  className="h-12 rounded-full border-2 border-danger bg-white px-3 text-[15px] font-bold text-danger focus:outline-none focus-visible:ring-4 focus-visible:ring-danger/25"
                >
                  {tr('common.emergency')}
                </button>
              )}
            </div>
          </header>
        )}

        <main className="flex flex-1 flex-col px-5 pb-7 pt-2">{children}</main>

        {state.notice && (
          <div
            role="status"
            aria-live="polite"
            onClick={() => flow.clearNotice()}
            className={`fixed inset-x-0 bottom-5 z-50 mx-auto w-[calc(100%-2.5rem)] max-w-[440px] rounded-[16px] px-4 py-3 text-[17px] font-bold shadow-lg ${
              state.notice.tone === 'warn' ? 'bg-warn-bg text-warn' : 'bg-safe-bg text-safe'
            }`}
          >
            {tr(state.notice.key)}
          </div>
        )}
        <ListeningOverlay />
      </div>
    </div>
  );
}
