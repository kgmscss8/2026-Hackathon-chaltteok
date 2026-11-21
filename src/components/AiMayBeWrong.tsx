import type { FC } from 'react';

export interface AiMayBeWrongProps {
  className?: string;
  variant?: 'subtle' | 'prominent';
}

export const AiMayBeWrong: FC<AiMayBeWrongProps> = ({
  className = '',
  variant = 'prominent',
}) => {
  const isProminent = variant === 'prominent';

  return (
    <aside
      role="note"
      aria-label="주의 사항"
      className={`rounded-xl px-4 py-3 flex items-center justify-center gap-2 border select-none ${
        isProminent
          ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold shadow-sm'
          : 'bg-gray-50 border-gray-200 text-gray-700 text-sm'
      } ${className}`}
    >
      <span className="text-amber-600 text-xl flex-shrink-0" aria-hidden="true">
        ⚠️
      </span>
      <span className="text-[15px] md:text-base leading-snug">
        AI는 틀릴 수 있습니다. 최종 제출 전 내용을 꼭 확인해 주세요.
      </span>
    </aside>
  );
};
