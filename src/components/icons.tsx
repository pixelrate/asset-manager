// Minimal inline icon set (24x24 stroke icons, geometric so they render predictably).
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function I({ size = 20, children, ...props }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconDashboard = (p: P) => (
  <I {...p}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
  </I>
);

export const IconBox = (p: P) => (
  <I {...p}>
    <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
    <path d="M3 8l9 5 9-5" />
    <path d="M12 13v8" />
  </I>
);

export const IconPin = (p: P) => (
  <I {...p}>
    <path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 1 1 13 0C18.5 15.4 12 21 12 21z" />
    <circle cx="12" cy="10.5" r="2.5" />
  </I>
);

export const IconMap = (p: P) => (
  <I {...p}>
    <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
    <path d="M9 4v14" />
    <path d="M15 6v14" />
  </I>
);

export const IconScan = (p: P) => (
  <I {...p}>
    <path d="M4 8V5a1 1 0 0 1 1-1h3" />
    <path d="M16 4h3a1 1 0 0 1 1 1v3" />
    <path d="M20 16v3a1 1 0 0 1-1 1h-3" />
    <path d="M8 20H5a1 1 0 0 1-1-1v-3" />
    <path d="M4 12h16" />
  </I>
);

export const IconTag = (p: P) => (
  <I {...p}>
    <path d="M3 3h8l10 10-8 8L3 11V3z" />
    <circle cx="8" cy="8" r="1.5" />
  </I>
);

export const IconChart = (p: P) => (
  <I {...p}>
    <path d="M3 3v18h18" />
    <rect x="7" y="12" width="3" height="6" />
    <rect x="12" y="8" width="3" height="10" />
    <rect x="17" y="5" width="3" height="13" />
  </I>
);

export const IconTrash = (p: P) => (
  <I {...p}>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
    <path d="M10 11v5M14 11v5" />
  </I>
);

export const IconSettings = (p: P) => (
  <I {...p}>
    <path d="M4 8h10M18 8h2" />
    <circle cx="16" cy="8" r="2" />
    <path d="M4 16h2M10 16h10" />
    <circle cx="8" cy="16" r="2" />
  </I>
);

export const IconShield = (p: P) => (
  <I {...p}>
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
    <path d="M9 12l2 2 4-4" />
  </I>
);

export const IconPlus = (p: P) => (
  <I {...p}>
    <path d="M12 5v14M5 12h14" />
  </I>
);

export const IconSearch = (p: P) => (
  <I {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l5 5" />
  </I>
);

export const IconMic = (p: P) => (
  <I {...p}>
    <rect x="9.5" y="3" width="5" height="10" rx="2.5" />
    <path d="M6 11a6 6 0 0 0 12 0" />
    <path d="M12 17v4" />
  </I>
);

export const IconX = (p: P) => (
  <I {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </I>
);

export const IconStar = (p: P) => (
  <I {...p}>
    <path d="M12 3l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.9 6.4 20l1.3-6.2L3 9.5l6.3-.7L12 3z" />
  </I>
);

export const IconQr = (p: P) => (
  <I {...p}>
    <rect x="4" y="4" width="6" height="6" />
    <rect x="14" y="4" width="6" height="6" />
    <rect x="4" y="14" width="6" height="6" />
    <path d="M14 14h3v3h-3zM20 14v6h-6M20 20h.01" />
  </I>
);

export const IconPrint = (p: P) => (
  <I {...p}>
    <path d="M7 8V3h10v5" />
    <rect x="4" y="8" width="16" height="8" rx="1" />
    <rect x="7" y="14" width="10" height="7" />
  </I>
);

export const IconDownload = (p: P) => (
  <I {...p}>
    <path d="M12 3v12M7 10l5 5 5-5" />
    <path d="M4 19h16" />
  </I>
);

export const IconEdit = (p: P) => (
  <I {...p}>
    <path d="M4 20h4L20 8l-4-4L4 16v4z" />
    <path d="M13 7l4 4" />
  </I>
);

export const IconCheck = (p: P) => (
  <I {...p}>
    <path d="M4 12l6 6L20 6" />
  </I>
);

export const IconChevronRight = (p: P) => (
  <I {...p}>
    <path d="M9 5l7 7-7 7" />
  </I>
);

export const IconCamera = (p: P) => (
  <I {...p}>
    <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </I>
);

export const IconClock = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7v5l3.5 2" />
  </I>
);

export const IconWrench = (p: P) => (
  <I {...p}>
    <path d="M14 7a4 4 0 0 1 5-3.9L16 6l2 2 2.9-3A4 4 0 0 1 17 10c-.5 0-1-.1-1.4-.2L7 18.4A2 2 0 1 1 4.2 15.6L12.6 7.2A4 4 0 0 1 14 7z" />
  </I>
);

export const IconUsers = (p: P) => (
  <I {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M21 19c0-2.2-1.5-4-3.5-4.5" />
  </I>
);

export const IconMenu = (p: P) => (
  <I {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </I>
);

export const IconLogout = (p: P) => (
  <I {...p}>
    <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" />
    <path d="M14 8l4 4-4 4M18 12H9" />
  </I>
);

export const IconFile = (p: P) => (
  <I {...p}>
    <path d="M6 3h8l4 4v14H6V3z" />
    <path d="M14 3v4h4" />
  </I>
);

export const IconUpload = (p: P) => (
  <I {...p}>
    <path d="M12 15V3M7 8l5-5 5 5" />
    <path d="M4 19h16" />
  </I>
);
