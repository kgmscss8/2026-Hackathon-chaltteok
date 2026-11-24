import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { useT } from '../i18n/useT.js';
import { BigButton } from './BigButton.js';
import { SpeakButton } from './SpeakButton.js';

/** 화면 제목 + 설명 + 읽어 주기 */
export function ScreenTitle({
  title,
  subtitle,
  step,
  speakText,
  children,
}: {
  title: string;
  subtitle?: string;
  step?: string;
  speakText?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-5">
      {step && (
        <p className="mb-1 inline-block rounded-full bg-blue-100 px-3 py-0.5 text-base font-bold text-blue-900">
          {step}
        </p>
      )}
      <h1 className="text-[28px] font-black leading-tight text-gray-950">{title}</h1>
      {subtitle && <p className="mt-2 text-lg text-gray-700">{subtitle}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <SpeakButton text={speakText ?? [title, subtitle].filter(Boolean).join('. ')} />
        {children}
      </div>
    </div>
  );
}

/** "AI는 틀릴 수 있습니다" 상시 표시(F12) */
export function AiNotice({ className = '' }: { className?: string }) {
  const tr = useT();
  return (
    <p
      className={`rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3 text-base font-bold text-amber-950 ${className}`}
    >
      <span aria-hidden="true">⚠️ </span>
      {tr('common.aiMayBeWrong')}
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
  const fieldClass =
    'w-full rounded-xl border-2 border-gray-400 p-3 text-xl focus:border-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200';
  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-2xl border-2 border-gray-300 bg-gray-50 p-4"
    >
      <label htmlFor={id} className="block text-lg font-bold text-gray-900">
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
          className={fieldClass}
          autoFocus
        />
      ) : (
        <input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          maxLength={2000}
          className={fieldClass}
          autoFocus
        />
      )}
      <div className="flex gap-2">
        <BigButton type="submit" variant="confirm" disabled={disabled || !text.trim()}>
          {submitLabel ?? tr('common.send')}
        </BigButton>
        {onCancel && (
          <BigButton variant="secondary" onClick={onCancel} className="!w-auto">
            {tr('common.cancel')}
          </BigButton>
        )}
      </div>
    </form>
  );
}
