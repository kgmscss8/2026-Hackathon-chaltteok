import { type ButtonHTMLAttributes, type FC, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'accent' | 'subtle';

export interface BigButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
  subtitle?: string;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus-visible:ring-4 focus-visible:ring-blue-300 shadow-md',
  secondary:
    'bg-gray-100 text-gray-900 border-2 border-gray-300 hover:bg-gray-200 active:bg-gray-300 focus-visible:ring-4 focus-visible:ring-gray-300',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-4 focus-visible:ring-red-300 shadow-lg',
  accent:
    'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-4 focus-visible:ring-emerald-300 shadow-md',
  subtle:
    'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-4 focus-visible:ring-gray-200',
};

export const BigButton: FC<BigButtonProps> = ({
  children,
  variant = 'primary',
  icon,
  subtitle,
  fullWidth = true,
  disabled = false,
  className = '',
  ...props
}) => {
  const baseClasses =
    'min-h-[64px] px-6 py-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all duration-150 select-none font-bold text-lg md:text-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  const widthClass = fullWidth ? 'w-full' : 'w-auto inline-flex';
  const variantClass = VARIANT_CLASSES[variant];

  return (
    <button
      type="button"
      disabled={disabled}
      className={`${baseClasses} ${widthClass} ${variantClass} ${className}`}
      {...props}
    >
      <div className="flex items-center justify-center gap-3">
        {icon && <span className="text-2xl flex-shrink-0" aria-hidden="true">{icon}</span>}
        <span className="leading-tight">{children}</span>
      </div>
      {subtitle && (
        <span className="text-sm font-normal mt-1 opacity-90 leading-tight">
          {subtitle}
        </span>
      )}
    </button>
  );
};
