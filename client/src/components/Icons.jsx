// Outline (stroke) icon set — a single monochrome visual language for the whole UI.
// Every icon inherits `currentColor`, so it always matches the surrounding text.

const Svg = ({ size = 18, className, children }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

/* ---------- navigation ---------- */
export const IconReceipt = (p) => (
  <Svg {...p}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
    <path d="M9.5 8.5h5M9.5 12.5h5" />
  </Svg>
);

export const IconList = (p) => (
  <Svg {...p}>
    <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
    <path d="M8 8.5h8M8 12.5h8M8 16.5h5" />
  </Svg>
);

export const IconChart = (p) => (
  <Svg {...p}>
    <path d="M3.5 20.5h17" />
    <path d="M6.5 20.5v-6" />
    <path d="M11.5 20.5V7.5" />
    <path d="M16.5 20.5v-9" />
  </Svg>
);

// Building / organisation — used for the super-admin overview (all businesses
// and the admins that run them).
export const IconBuilding = (p) => (
  <Svg {...p}>
    <rect x="4" y="3.5" width="10" height="17" rx="1.5" />
    <path d="M14 9.5h6v11h-6" />
    <path d="M7 7.5h1.5M7 11h1.5M7 14.5h1.5M17 13h1.5M17 16.5h1.5" />
  </Svg>
);

export const IconWallet = (p) => (
  <Svg {...p}>
    <path d="M3.5 8.5A2.5 2.5 0 0 1 6 6h11.5a2 2 0 0 1 2 2" />
    <rect x="3.5" y="8.5" width="17" height="10.5" rx="2.5" />
    <circle cx="16.5" cy="13.8" r="1.1" />
  </Svg>
);

export const IconBook = (p) => (
  <Svg {...p}>
    <path d="M5 4.5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3Z" />
    <path d="M5 17.5a3 3 0 0 1 3-3h11" />
    <path d="M9 8.5h5" />
  </Svg>
);

export const IconUsers = (p) => (
  <Svg {...p}>
    <circle cx="9.5" cy="8" r="3.2" />
    <path d="M3.5 19.5a6 6 0 0 1 12 0" />
    <path d="M16.5 5.4a3.2 3.2 0 0 1 0 5.4" />
    <path d="M17.8 14.4a5.6 5.6 0 0 1 3 5.1" />
  </Svg>
);

export const IconSliders = (p) => (
  <Svg {...p}>
    <path d="M4 7.5h8M17.5 7.5H20M4 16.5h3.5M13 16.5H20" />
    <circle cx="14.5" cy="7.5" r="2.4" />
    <circle cx="10" cy="16.5" r="2.4" />
  </Svg>
);

/* ---------- actions ---------- */
export const IconPencil = (p) => (
  <Svg {...p}>
    <path d="M4 20h4.2L20 8.2a2.97 2.97 0 0 0-4.2-4.2L4 15.8Z" />
    <path d="m14.8 5 4.2 4.2" />
  </Svg>
);

export const IconTrash = (p) => (
  <Svg {...p}>
    <path d="M4 7h16" />
    <path d="M10 11v6M14 11v6" />
    <path d="M6.2 7l.9 12a2 2 0 0 0 2 1.9h5.8a2 2 0 0 0 2-1.9l.9-12" />
    <path d="M9.2 7V5.2A1.2 1.2 0 0 1 10.4 4h3.2a1.2 1.2 0 0 1 1.2 1.2V7" />
  </Svg>
);

export const IconEye = (p) => (
  <Svg {...p}>
    <path d="M2.5 12S6 6.2 12 6.2 21.5 12 21.5 12 18 17.8 12 17.8 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.6" />
  </Svg>
);

export const IconLock = (p) => (
  <Svg {...p}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" />
    <path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" />
    <path d="M12 14.4v2.4" />
  </Svg>
);

export const IconPower = (p) => (
  <Svg {...p}>
    <path d="M12 3.2v8.6" />
    <path d="M7.4 6.6a7 7 0 1 0 9.2 0" />
  </Svg>
);

export const IconMenu = (p) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);

export const IconX = (p) => (
  <Svg {...p}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </Svg>
);

export const IconChevron = (p) => (
  <Svg {...p}>
    <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />
  </Svg>
);

/* ---------- status ---------- */
export const IconGlobe = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.8" />
    <path d="M3.4 12h17.2" />
    <path d="M12 3.2c2.4 2.6 3.6 5.6 3.6 8.8S14.4 18.2 12 20.8c-2.4-2.6-3.6-5.6-3.6-8.8S9.6 5.8 12 3.2Z" />
  </Svg>
);

export const IconSync = (p) => (
  <Svg {...p}>
    <path d="M20 11.2A8 8 0 0 0 6.2 6.6" />
    <path d="M4 12.8A8 8 0 0 0 17.8 17.4" />
    <path d="M20.4 5.4v4.4H16" />
    <path d="M3.6 18.6v-4.4H8" />
  </Svg>
);

/* ---------- payment methods ---------- */
export const IconCash = (p) => (
  <Svg {...p}>
    <rect x="2.5" y="6" width="19" height="12" rx="2.4" />
    <circle cx="12" cy="12" r="2.6" />
    <path d="M6 12h.01M18 12h.01" />
  </Svg>
);

export const IconQr = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.4" />
    <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.4" />
    <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.4" />
    <path d="M14 14h3v3h-3zM20.5 14v6.5H17" />
  </Svg>
);

export const IconCard = (p) => (
  <Svg {...p}>
    <rect x="2.5" y="5" width="19" height="14" rx="2.6" />
    <path d="M2.5 10h19" />
    <path d="M6 15h4.5" />
  </Svg>
);
