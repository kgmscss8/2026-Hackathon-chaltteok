import { useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import type { SummaryCard } from '@lib/schema';
import { summaryCardLines } from '@lib/summary';
import {
  BigButton,
  CloseIcon,
  ExpandIcon,
  LockIcon,
  Mascot,
  PhoneIcon,
  QrIcon,
  SpeakerIcon,
} from '../components/index.js';
import { useT } from '../i18n/useT.js';
import { useAppState, useFlow } from '../state/context.js';
import { speak } from '../voice/speak.js';

const QR_MAX_CHARS = 600;

/** QR에 담을 요약 글(서버 주소가 아니라 글 자체, F7) */
function qrText(card: SummaryCard): string {
  const text = ['[찰떡 민원 요약 · AI가 정리, 틀릴 수 있음]', ...summaryCardLines(card)].join('\n');
  const chars = [...text];
  return chars.length <= QR_MAX_CHARS ? text : chars.slice(0, QR_MAX_CHARS - 1).join('') + '…';
}

/**
 * 화면 5(디자인 6번 "창구에서 보여주기", F6·F7·F2).
 * 담당자 카드는 항상 한국어(굵은 고딕 22px 이상, 5줄). 크게 보기(전체 화면·가로), QR(요약 글 자체),
 * 확인된 데이터의 참고 연락처. 준비물·자격은 안내하지 않는다(PRD 원칙 1).
 */
export function ShowingScreen() {
  const state = useAppState();
  const flow = useFlow();
  const tr = useT();
  const [qr, setQr] = useState(false);
  const [full, setFull] = useState(false);
  const [time] = useState(() =>
    new Date().toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' }),
  );
  const cardRef = useRef<HTMLDivElement>(null);
  const card = state.card;

  useEffect(() => {
    const onChange = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  if (!card) return null;

  const toggleFull = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await cardRef.current?.requestFullscreen();
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (o: string) => Promise<void>;
      };
      await orientation.lock?.('landscape').catch(() => undefined);
    } catch {
      /* 전체 화면을 지원하지 않는 브라우저(iOS 사파리 등): 그대로 */
    }
  };

  // 방금 저장한(또는 다시 연) 요약을 지운다. 체험 모드는 저장하지 않으므로 처음으로만
  const deleteNow = () => {
    const target =
      state.saved.find((s) => s.id === state.viewingSavedId) ??
      state.saved.find((s) => s.card.who === card.who && s.card.request === card.request);
    if (target) void flow.deleteSaved(target.id);
    flow.goHome();
  };

  const rows: { label: string; value: string; tone?: 'warn' }[] = [
    { label: '현재 상황', value: card.situation },
    { label: '요청', value: card.request },
    ...(card.unknowns.length
      ? [{ label: '미확인', value: card.unknowns.join(', '), tone: 'warn' as const }]
      : []),
    ...(card.to_ask.length ? [{ label: '물어볼 것', value: card.to_ask.join(' / ') }] : []),
  ];
  const big = full ? 'text-[34px]' : 'text-[19px]';

  return (
    <div className="flex flex-1 flex-col gap-3 pt-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[17px] font-bold text-ink-3">{tr('show.header')}</div>
        <button
          type="button"
          aria-label={tr('common.close')}
          onClick={() => flow.goHome()}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
        >
          <CloseIcon size={26} width={2.2} />
        </button>
      </div>

      <div
        ref={cardRef}
        lang="ko"
        className={`flex flex-col gap-3.5 rounded-[22px] border-[3px] border-accent bg-white p-5 ${full ? 'justify-center overflow-auto p-10' : ''}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[16px] font-bold text-accent">
            민원 상담 요약 · 주민센터 담당자님께
          </span>
          <span className="text-[14px] text-ink-3">{time}</span>
        </div>
        {qr ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <QRCode value={qrText(card)} size={full ? 360 : 232} level="L" />
            <p className="m-0 text-center text-[15px] text-ink-2">{tr('show.qrHint')}</p>
          </div>
        ) : (
          <>
            <div className={`font-black leading-[1.35] ${full ? 'text-[44px]' : 'text-[26px]'}`}>
              {card.who}
            </div>
            <div className={`flex flex-col gap-2 leading-[1.4] ${big}`}>
              {rows.map((r) => (
                <div key={r.label} className="flex gap-2.5">
                  <span
                    className={`shrink-0 font-bold text-ink-3 ${full ? 'w-[200px]' : 'w-[92px]'}`}
                  >
                    {r.label}
                  </span>
                  <span className={`font-bold ${r.tone === 'warn' ? 'text-warn' : ''}`}>
                    {r.value}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
        <p className="m-0 text-[15px] font-bold text-warn">AI는 틀릴 수 있습니다</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <BigButton
          variant="outline"
          icon={<ExpandIcon size={24} />}
          className="!rounded-[16px] !text-[18px]"
          onClick={() => void toggleFull()}
        >
          {full ? tr('show.exitFullscreen') : tr('show.fullscreen')}
        </BigButton>
        <BigButton
          variant="outline"
          icon={<QrIcon size={24} />}
          className="!rounded-[16px] !text-[18px]"
          onClick={() => setQr((v) => !v)}
        >
          {qr ? tr('show.card') : tr('show.qrShow')}
        </BigButton>
      </div>
      <button
        type="button"
        onClick={() => void speak(summaryCardLines(card).join('. '), 'ko')}
        className="inline-flex h-12 items-center gap-2 self-start rounded-full border-2 border-line-strong bg-white px-4 text-[16px] font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
      >
        <SpeakerIcon size={20} />
        {tr('summary.readAloud')}
      </button>

      <section
        aria-labelledby="contacts-title"
        className="rounded-[18px] border-2 border-line bg-white p-4"
      >
        <h2 id="contacts-title" className="m-0 mb-2 text-[18px] font-black">
          {tr('show.contacts')}
        </h2>
        {state.contacts.length === 0 ? (
          <p className="m-0 text-[17px]">{tr('show.noContacts')}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {state.contacts.map((c) => (
              <li
                key={c.name}
                className="flex items-center gap-3 rounded-[14px] bg-paper px-3 py-2.5"
              >
                <div className="flex flex-1 flex-col" lang="ko">
                  <span className="text-[17px] font-bold">{c.name}</span>
                  <span className="text-[14px] text-ink-3">
                    {c.scope} · {tr('show.checked', { date: c.checked_at })}
                    {c.source && (
                      <>
                        {' · '}
                        <a
                          href={c.source}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent underline"
                        >
                          {tr('show.source')}
                        </a>
                      </>
                    )}
                  </span>
                </div>
                {c.phone ? (
                  <a
                    href={`tel:${c.phone}`}
                    className="flex h-12 shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 text-[17px] font-black text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
                  >
                    <PhoneIcon size={18} color="#fff" />
                    {c.phone}
                  </a>
                ) : (
                  <span className="shrink-0 text-[15px] font-bold text-ink-3">
                    {tr('show.visit')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="m-0 mt-2 text-[15px] text-ink-3">{tr('show.contactsNote')}</p>
      </section>

      <div className="flex items-center gap-2.5 rounded-[14px] bg-safe-bg px-3.5 py-3 text-safe">
        <LockIcon size={24} />
        <span className="text-[15px] font-medium leading-snug">{tr('show.privacy')}</span>
        <Mascot mood="done" size={56} className="ml-auto shrink-0" />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <BigButton
          variant="soft"
          className="!min-h-[60px] !rounded-[16px] !text-[18px]"
          onClick={deleteNow}
        >
          {tr('show.deleteNow')}
        </BigButton>
        {state.viewingSavedId ? (
          <BigButton
            className="!min-h-[60px] !rounded-[16px] !text-[18px]"
            onClick={() => flow.goHome()}
          >
            {tr('show.done')}
          </BigButton>
        ) : (
          <BigButton
            variant="outline"
            className="!min-h-[60px] !rounded-[16px] !text-[18px]"
            onClick={() => flow.backToSummary()}
          >
            {tr('show.edit')}
          </BigButton>
        )}
      </div>
      {!state.viewingSavedId && (
        <BigButton
          className="!min-h-[60px] !rounded-[16px] !text-[18px]"
          onClick={() => flow.goHome()}
        >
          {tr('show.done')}
        </BigButton>
      )}
    </div>
  );
}
