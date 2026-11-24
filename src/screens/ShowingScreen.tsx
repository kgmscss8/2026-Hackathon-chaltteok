import { useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import type { SummaryCard } from '@lib/schema';
import { summaryCardLines } from '@lib/summary';
import { AiNotice, BigButton, SpeakButton } from '../components/index.js';
import { useT } from '../i18n/useT.js';
import { useAppState, useFlow } from '../state/context.js';

const QR_MAX_CHARS = 600;

/** QR에 담을 요약 글(서버 주소가 아니라 글 자체, F7) */
export function qrText(card: SummaryCard): string {
  const text = ['[찰떡 민원 요약 · AI가 정리, 틀릴 수 있음]', ...summaryCardLines(card)].join('\n');
  return [...text].length <= QR_MAX_CHARS
    ? text
    : [...text].slice(0, QR_MAX_CHARS - 1).join('') + '…';
}

/**
 * 화면 5: 창구 보여주기(F6·F7·F2). 담당자 카드는 항상 한국어 5줄, 굵은 고딕 22px 이상.
 * 전체 화면·가로 전환, QR(요약 글 자체), 확인된 데이터의 참고 연락처.
 */
export function ShowingScreen() {
  const state = useAppState();
  const flow = useFlow();
  const tr = useT();
  const [qr, setQr] = useState(false);
  const [full, setFull] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const card = state.card;

  useEffect(() => {
    const onChange = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  if (!card) return null;
  const lines = summaryCardLines(card);

  const toggleFull = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await cardRef.current?.requestFullscreen();
      // 가능하면 가로로(안드로이드 크롬 전체 화면에서 지원)
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (o: string) => Promise<void>;
      };
      await orientation.lock?.('landscape').catch(() => undefined);
    } catch {
      /* 전체 화면을 지원하지 않는 브라우저(iOS 사파리 등): 그대로 */
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-black">{tr('show.title')}</h1>
        <SpeakButton text={lines.join('. ')} />
      </div>
      <p className="text-base text-gray-700">📱 {tr('show.rotate')}</p>

      <div
        ref={cardRef}
        className={`rounded-3xl border-4 border-gray-900 bg-white p-5 ${full ? 'flex flex-col justify-center overflow-auto p-8' : ''}`}
      >
        <p className="mb-3 rounded-xl bg-gray-900 px-4 py-2 text-center text-lg font-bold text-white">
          {tr('show.forStaff')}
        </p>
        {qr ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="rounded-xl bg-white p-3">
              <QRCode value={qrText(card)} size={full ? 320 : 240} level="L" />
            </div>
            <p className="text-center text-base text-gray-700">{tr('show.qrHint')}</p>
          </div>
        ) : (
          <ol className="space-y-3 font-sans" lang="ko">
            {lines.map((line, i) => (
              <li
                key={i}
                className={`border-b border-gray-200 pb-3 font-black leading-snug text-gray-950 last:border-0 ${full ? 'text-[34px]' : 'text-[23px]'}`}
              >
                {line}
              </li>
            ))}
          </ol>
        )}
        <p className="mt-3 text-base font-bold text-amber-900" lang="ko">
          ⚠️ AI는 틀릴 수 있습니다
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <BigButton variant="secondary" onClick={() => void toggleFull()}>
          {full ? tr('show.exitFullscreen') : `⛶ ${tr('show.fullscreen')}`}
        </BigButton>
        <BigButton variant="secondary" onClick={() => setQr((v) => !v)}>
          {qr ? tr('show.card') : `▦ ${tr('show.qr')}`}
        </BigButton>
      </div>

      <section
        aria-labelledby="contacts-title"
        className="space-y-3 rounded-2xl border-2 border-gray-300 p-4"
      >
        <h2 id="contacts-title" className="text-xl font-black">
          📞 {tr('show.contacts')}
        </h2>
        {state.contacts.length === 0 ? (
          <p className="text-lg">{tr('show.noContacts')}</p>
        ) : (
          <ul className="space-y-3">
            {state.contacts.map((c) => (
              <li key={c.name} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-lg font-bold" lang="ko">
                  {c.name}
                </p>
                <p className="text-base text-gray-700" lang="ko">
                  {c.scope}
                </p>
                {c.phone ? (
                  <a
                    href={`tel:${c.phone}`}
                    className="mt-2 flex min-h-[64px] items-center justify-center rounded-xl bg-blue-700 text-xl font-black text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
                  >
                    📞 {tr('show.call', { phone: c.phone })}
                  </a>
                ) : (
                  <p className="mt-2 rounded-xl bg-white px-3 py-3 text-center text-lg font-bold">
                    🏢 {tr('show.visit')}
                  </p>
                )}
                <p className="mt-2 text-sm text-gray-600">
                  {c.source && (
                    <>
                      {tr('show.source')}:{' '}
                      <a href={c.source} target="_blank" rel="noreferrer" className="underline">
                        {new URL(c.source).host}
                      </a>{' '}
                      ·{' '}
                    </>
                  )}
                  {tr('show.checked', { date: c.checked_at })}
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="text-base text-gray-700">{tr('show.contactsNote')}</p>
      </section>

      <AiNotice />

      <div className="mt-auto space-y-3 pt-2">
        {!state.viewingSavedId && (
          <BigButton variant="secondary" icon="✎" onClick={() => flow.backToSummary()}>
            {tr('show.edit')}
          </BigButton>
        )}
        <BigButton variant="ghost" onClick={() => flow.goHome()}>
          {tr('common.home')}
        </BigButton>
      </div>
    </div>
  );
}
