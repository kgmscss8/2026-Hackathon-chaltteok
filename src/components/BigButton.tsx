import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'confirm' | 'danger' | 'ghost';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-blue-700 text-white hover:bg-blue-800 active:bg-blue-900 focus-visible:ring-blue-300',
  secondary:
    'bg-white text-gray-900 border-2 border-gray-400 hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-gray-300',
  confirm:
    'bg-emerald-700 text-white hover:bg-emerald-800 active:bg-emerald-900 focus-visible:ring-emerald-300',
  danger: 'bg-red-700 text-white hover:bg-red-800 active:bg-red-900 focus-visible:ring-red-300',
  ghost:
    'bg-transparent text-gray-800 underline-offset-4 hover:underline focus-visible:ring-gray-300',
};

export interface BigButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
  subtitle?: string;
}

/** 주요 버튼: 높이 64px 이상, 굵은 글씨, 색만이 아니라 글자·아이콘으로 구분 */
export function BigButton({
  variant = 'primary',
  icon,
  subtitle,
  className = '',
  children,
  type = 'button',
  ...props
}: BigButtonProps) {
  return (
    <button
      type={type}
      className={`w-full min-h-[64px] px-5 py-3 rounded-2xl flex flex-col items-center justify-center text-center font-bold text-xl leading-snug transition focus:outline-none focus-visible:ring-4 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      <span className="flex items-center justify-center gap-3">
        {icon && (
          <span className="text-2xl shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
        <span>{children}</span>
      </span>
      {subtitle && <span className="mt-1 text-base font-normal opacity-90">{subtitle}</span>}
    </button>
  );
}
