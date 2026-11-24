import { useEffect, type ReactNode } from 'react';
import { LANGUAGES, t } from '../i18n/index.js';
import { useT } from '../i18n/useT.js';
import { useAppState, useFlow } from '../state/context.js';
import { stopSpeaking } from '../voice/speak.js';
import { ListeningOverlay } from './Voice.js';

/** 모든 화면 공통 틀: 머리(처음으로·체험 배지·언어·긴급), 본문, 안내 알림, 듣는 중 겹침 */
export function AppShell({ children }: { children: ReactNode }) {
  const state = useAppState();
  const flow = useFlow();
  const tr = useT();

  // 화면 언어에 맞춰 문서 언어(스크린 리더 발음)와 제목을 바꾼다
  useEffect(() => {
    const lang = LANGUAGES.find((l) => l.code === state.uiLanguage);
    document.documentElement.lang = lang?.htmlLang ?? 'ko';
    document.title = t(state.uiLanguage, 'app.name');
  }, [state.uiLanguage]);

  // 화면이 바뀌면 읽던 소리는 멈춘다
  useEffect(() => stopSpeaking, [state.screen]);

  // 안내 알림은 6초 뒤 사라진다
  useEffect(() => {
    if (!state.notice) return;
    const id = window.setTimeout(() => flow.clearNotice(), 6000);
    return () => window.clearTimeout(id);
  }, [state.notice, flow]);

  return (
    <div className="min-h-screen bg-slate-100 text-gray-900 text-[18px] leading-relaxed">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-white shadow-sm">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => (state.consent || state.mode === 'demo' ? flow.goHome() : undefined)}
            className="rounded-lg px-1 text-2xl font-black text-blue-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
            aria-label={`${tr('app.name')} — ${tr('common.home')}`}
          >
            {tr('app.name')}
          </button>
          {state.mode === 'demo' && (
            <span className="rounded-full border border-amber-500 bg-amber-100 px-2 py-0.5 text-sm font-bold text-amber-900">
              {tr('common.demoBadge')}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <label className="sr-only" htmlFor="ui-language">
              {tr('common.language')}
            </label>
            <select
              id="ui-language"
              value={state.uiLanguage}
              onChange={(e) =>
                flow.setUiLanguage(e.target.value as (typeof LANGUAGES)[number]['code'])
              }
              className="min-h-[44px] rounded-lg border-2 border-gray-300 bg-white px-2 text-base font-semibold"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            {state.screen !== 'crisis' && (
              <button
                type="button"
                onClick={() => flow.crisis()}
                className="min-h-[44px] rounded-lg border-2 border-red-600 bg-red-50 px-3 text-base font-bold text-red-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-300"
              >
                🚨 {tr('common.emergency')}
              </button>
            )}
          </div>
        </header>

        <main className="flex flex-1 flex-col px-5 pb-8 pt-5">{children}</main>

        {state.notice && (
          <div
            role="status"
            aria-live="polite"
            className={`fixed inset-x-0 bottom-4 z-50 mx-auto w-[calc(100%-2rem)] max-w-[440px] rounded-2xl border-2 p-4 text-lg font-bold shadow-xl ${
              state.notice.tone === 'warn'
                ? 'border-amber-500 bg-amber-50 text-amber-950'
                : 'border-emerald-600 bg-emerald-50 text-emerald-950'
            }`}
            onClick={() => flow.clearNotice()}
          >
            {state.notice.tone === 'warn' ? '⚠️ ' : '✅ '}
            {tr(state.notice.key)}
          </div>
        )}
        <ListeningOverlay />
      </div>
    </div>
  );
}
