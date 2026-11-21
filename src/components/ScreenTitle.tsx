import type { FC, ReactNode } from 'react';

export interface ScreenTitleProps {
  title: string;
  subtitle?: string | ReactNode;
  step?: string;
  className?: string;
}

export const ScreenTitle: FC<ScreenTitleProps> = ({
  title,
  subtitle,
  step,
  className = '',
}) => {
  return (
    <header className={`mb-6 text-center ${className}`}>
      {step && (
        <div className="inline-block bg-blue-100 text-blue-800 text-sm md:text-base font-bold px-3 py-1 rounded-full mb-3">
          {step}
        </div>
      )}
      <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight">
        {title}
      </h1>
      {subtitle && (
        <div className="mt-2 text-[17px] md:text-lg text-gray-600 leading-relaxed font-medium">
          {subtitle}
        </div>
      )}
    </header>
  );
};
