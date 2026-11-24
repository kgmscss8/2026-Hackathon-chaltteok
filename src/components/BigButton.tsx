import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'outline' | 'soft' | 'muted' | 'dark' | 'ghost';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-dark focus-visible:ring-accent/30',
  outline: 'bg-white text-ink border-2 border-ink hover:bg-paper focus-visible:ring-ink/20',
  soft: 'bg-white text-ink border-2 border-line-strong hover:border-ink-3 focus-visible:ring-accent/25',
  muted:
    'bg-paper-dim text-ink-2 border-2 border-line font-medium hover:border-ink-3 focus-visible:ring-accent/25',
  dark: 'bg-accent-dark text-white hover:bg-ink focus-visible:ring-accent/30',
  ghost:
    'bg-transparent text-ink-2 hover:text-ink underline-offset-4 hover:underline focus-visible:ring-accent/25',
};

export interface BigButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
  subtitle?: string;
}

/** 디자인 캔버스 버튼: 높이 64px 이상, 굵은 글씨, 둥근 모서리(16~20px) */
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
      className={`flex min-h-[64px] w-full flex-col items-center justify-center rounded-[18px] px-4 py-2 text-center text-[19px] font-bold leading-snug transition focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      <span className="flex items-center justify-center gap-2">
        {icon}
        <span>{children}</span>
      </span>
      {subtitle && <span className="mt-0.5 text-[15px] font-medium opacity-90">{subtitle}</span>}
    </button>
  );
}
