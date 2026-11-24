import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { useT } from '../i18n/useT.js';
import { useAppState } from '../state/context.js';
import { speak, stopSpeaking, unlockAudio } from '../voice/speak.js';
import { BigButton } from './BigButton.js';
import { AlertIcon, SpeakerIcon } from './Icons.js';

/** 큰 제목 + 설명(디자인: 32~36px 900, 설명 18~19px) */
export function ScreenTitle({
  title,
  subtitle,
  center = false,
  children,
}: {
  title: string;
  subtitle?: string;
  center?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-2 ${center ? 'items-center text-center' : ''}`}>
      <h1 className="m-0 whitespace-pre-line text-[32px] font-black leading-[1.25] tracking-[-0.5px] text-ink">
        {title}
      </h1>
      {subtitle && (
        <p className="m-0 whitespace-pre-line text-[18px] leading-[1.55] text-ink-2">{subtitle}</p>
      )}
      {children}
    </div>
  );
}

/** 흰 카드(테두리 #D9D5CC, 모서리 22px) */
export function Card({
  children,
  accent = false,
  className = '',
}: {
  children: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[22px] border-2 bg-white ${accent ? 'border-accent' : 'border-line'} ${className}`}
    >
      {children}
    </div>
  );
}

/** 작은 알약 배지: "듣고 있어요", "소리로 읽어 드리는 중" */
export function Pill({
  children,
  tone = 'accent',
}: {
  children: ReactNode;
  tone?: 'accent' | 'warn' | 'safe';
}) {
  const tones = {
    accent: 'bg-accent-soft text-accent-dark',
    warn: 'bg-warn-bg text-warn',
    safe: 'bg-safe-bg text-safe',
  };
  return (
    <span
      className={`inline-flex min-h-[36px] items-center gap-2 rounded-full px-3.5 text-[16px] font-bold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** "소리로 읽어 주기" 알약 버튼: 누르면 읽고, 다시 누르면 멈춘다 */
export function SpeakPill({
  text,
  label,
  auto = false,
}: {
  text: string;
  label?: string;
  /** 화면에 들어오면 바로 읽기(사용자가 이미 화면을 눌러 소리 잠금이 풀린 뒤에만 쓴다) */
  auto?: boolean;
}) {
  const tr = useT();
  const { language, uiLanguage } = useAppState();
  const lang = auto ? language : uiLanguage;
  const [on, setOn] = useState(false);

  const play = async () => {
    setOn(true);
    await speak(text, lang);
    setOn(false);
  };
  useEffect(() => {
    if (!auto || !text) return;
    let alive = true;
    // 화면이 그려진 뒤에 읽기 시작(상태 변경을 효과 안에서 바로 하지 않음)
    const id = window.setTimeout(() => {
      if (alive) void play();
    }, 0);
    return () => {
      alive = false;
      window.clearTimeout(id);
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, text, lang]);

  const toggle = () => {
    if (on) {
      stopSpeaking();
      setOn(false);
      return;
    }
    unlockAudio();
    void play();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className={`inline-flex min-h-[48px] items-center gap-2 self-start rounded-full border-2 px-4 text-[17px] font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 ${
        on
          ? 'border-accent-soft bg-accent-soft text-accent-dark'
          : 'border-line-strong bg-paper text-ink'
      }`}
    >
      <SpeakerIcon size={22} />
      <span>{on ? tr('summary.reading') : (label ?? tr('summary.readAloud'))}</span>
    </button>
  );
}

/** "AI는 틀릴 수 있습니다" 상시 표시(F12) */
export function AiNotice({ className = '' }: { className?: string }) {
  const tr = useT();
  return (
    <p
      className={`m-0 flex items-start gap-2 rounded-[14px] bg-warn-bg px-3.5 py-2.5 text-[15px] font-bold leading-snug text-warn ${className}`}
    >
      <span className="mt-0.5 shrink-0">
        <AlertIcon size={18} />
      </span>
      <span>{tr('common.aiMayBeWrong')}</span>
    </p>
  );
}

/** 글로 쓰기·글로 답하기 입력 */
export function TextComposer({
  label,
  placeholder,
  submitLabel,
  onSubmit,
  onCancel,
  disabled,
  multiline = true,
  initial = '',
}: {
  label: string;
  placeholder?: string;
  submitLabel?: string;
  onSubmit: (text: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
  multiline?: boolean;
  initial?: string;
}) {
  const tr = useT();
  const id = useId();
  const [text, setText] = useState(initial);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSubmit(text);
    setText('');
  };
  const field =
    'w-full rounded-[14px] border-2 border-line-strong bg-white p-3 text-[19px] text-ink focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20';
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label htmlFor={id} className="text-[17px] font-bold text-ink-2">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          maxLength={2000}
          className={field}
          autoFocus
        />
      ) : (
        <input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          maxLength={2000}
          className={field}
          autoFocus
        />
      )}
      <div className="grid grid-cols-[1fr_auto] gap-2.5">
        <BigButton type="submit" disabled={disabled || !text.trim()}>
          {submitLabel ?? tr('common.send')}
        </BigButton>
        {onCancel && (
          <BigButton variant="soft" onClick={onCancel} className="!w-auto px-5">
            {tr('common.cancel')}
          </BigButton>
        )}
      </div>
    </form>
  );
}
