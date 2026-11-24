/** 디자인 캔버스의 선 아이콘(24×24, stroke). 장식이므로 aria-hidden */
import type { ReactNode } from 'react';

function Icon({
  size = 24,
  color = 'currentColor',
  width = 2,
  children,
}: {
  size?: number;
  color?: string;
  width?: number;
  children: ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

type P = { size?: number; color?: string; width?: number };

export const MicIcon = (p: P) => (
  <Icon {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v3" />
  </Icon>
);
export const SpeakerIcon = (p: P) => (
  <Icon {...p}>
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </Icon>
);
export const ChevronLeft = (p: P) => (
  <Icon {...p}>
    <path d="M15 18l-6-6 6-6" />
  </Icon>
);
export const ChevronRight = (p: P) => (
  <Icon {...p}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
);
export const CheckIcon = (p: P) => (
  <Icon {...p}>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </Icon>
);
export const RedoIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </Icon>
);
export const CloseIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  </Icon>
);
export const LockIcon = (p: P) => (
  <Icon {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Icon>
);
export const ExpandIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 9V5a1 1 0 0 1 1-1h4" />
    <path d="M15 4h4a1 1 0 0 1 1 1v4" />
    <path d="M20 15v4a1 1 0 0 1-1 1h-4" />
    <path d="M9 20H5a1 1 0 0 1-1-1v-4" />
  </Icon>
);
export const QrIcon = (p: P) => (
  <Icon {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3z" />
    <path d="M20 14v7h-6" />
  </Icon>
);
export const PhoneIcon = (p: P) => (
  <Icon {...p}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </Icon>
);
export const HomeIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v10h14V10" />
    <path d="M10 20v-6h4v6" />
  </Icon>
);
export const HeartIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </Icon>
);
export const DocIcon = (p: P) => (
  <Icon {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6" />
    <path d="M9 17h6" />
  </Icon>
);
export const ChatIcon = (p: P) => (
  <Icon {...p}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
  </Icon>
);
export const PencilIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
    <path d="M13.5 6.5l4 4" />
  </Icon>
);
export const QuestionIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.5" />
    <path d="M12 17h.01" />
  </Icon>
);
export const AlertIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 3 2 20h20z" />
    <path d="M12 10v4" />
    <path d="M12 17h.01" />
  </Icon>
);
export const TrashIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
  </Icon>
);
