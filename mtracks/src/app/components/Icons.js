import React from 'react';

// Common SVG props
const iconProps = (size = 18, color = 'currentColor') => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: color,
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  style: { display: 'inline-block', verticalAlign: 'middle' }
});

export const IconRadar = ({ size, color }) => (
  <svg {...iconProps(size, color)}>
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
    <path d="M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z" />
    <path d="M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
    <path d="M19.07 4.93L12 12" />
  </svg>
);

export const IconPhone = ({ size, color }) => (
  <svg {...iconProps(size, color)}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

export const IconTarget = ({ size, color }) => (
  <svg {...iconProps(size, color)}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

export const IconFingerprint = ({ size, color }) => (
  <svg {...iconProps(size, color)}>
    <path d="M12 2a15.3 15.3 0 0 1 4 7v1" />
    <path d="M19 17h-1a4 4 0 0 1-4-4V9a6 6 0 0 0-12 0v4H2" />
    <path d="M14 22h-4a8 8 0 0 1-8-8v-1h2a4 4 0 0 0 4 4v1" />
    <path d="M18 11.5a6.5 6.5 0 0 0-13 0v4" />
    <path d="M8 22v-3a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3" />
  </svg>
);

export const IconPackage = ({ size, color }) => (
  <svg {...iconProps(size, color)}>
    <polyline points="16.5 9.4 7.5 4.21 12 1.62 16.5 4.21 16.5 9.4" />
    <polyline points="7.5 14.6 7.5 9.4 12 12.01 16.5 9.4 16.5 14.6 12 17.19 7.5 14.6" />
    <polyline points="12 22.38 12 17.19" />
    <polyline points="7.5 9.4 2.5 6.5 2.5 11.75 7.5 14.6" />
    <polyline points="2.5 6.5 7.5 3.62 7.5 9.4" />
    <polyline points="16.5 9.4 21.5 6.5 21.5 11.75 16.5 14.6" />
    <polyline points="21.5 6.5 16.5 3.62 16.5 9.4" />
  </svg>
);

export const IconShieldAlert = ({ size, color }) => (
  <svg {...iconProps(size, color)}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export const IconAward = ({ size, color }) => (
  <svg {...iconProps(size, color)}>
    <circle cx="12" cy="8" r="7" />
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
  </svg>
);

export const IconBriefcase = ({ size, color }) => (
  <svg {...iconProps(size, color)}>
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

export const IconGovernment = ({ size, color }) => (
  <svg {...iconProps(size, color)}>
    <path d="M4 22V4c0-.5.2-1 .6-1.4C5 2.2 5.5 2 6 2h12c.5 0 1 .2 1.4.6.4.4.6.9.6 1.4v18" />
    <path d="M10 6h4" />
    <path d="M10 10h4" />
    <path d="M10 14h4" />
    <path d="M10 18h4" />
  </svg>
);

export const IconPlane = ({ size, color }) => (
  <svg {...iconProps(size, color)}>
    <path d="M17.8 19.2L16 11l3.5-3.5A2.1 2.1 0 1 0 16.5 4L13 7.5l-8.2-1.8L3 7.8l7.3 3.5-3.5 3.5-2.5-.7-1.3 1.3 3 1.5 1.5 3 1.3-1.3-.7-2.5 3.5-3.5 3.5 7.3 2.1-1.8z" />
  </svg>
);

export const IconPizza = ({ size, color }) => (
  <svg {...iconProps(size, color)}>
    <path d="M15 11h.01M11 15h.01M16 16h.01M12 11h.01" />
    <path d="M2 12C2 6.5 6.5 2 12 2c5.5 0 10 4.5 10 10H2z" />
    <path d="M12 2v10" />
    <path d="M21.07 16A10 10 0 0 1 12 22" />
    <path d="M2.93 16A10 10 0 0 0 12 22" />
  </svg>
);

export const IconEdit = ({ size, color }) => (
  <svg {...iconProps(size, color)}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

export const IconGlobe = ({ size, color }) => (
  <svg {...iconProps(size, color)}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export const IconCpu = ({ size, color }) => (
  <svg {...iconProps(size, color)}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
  </svg>
);

export const IconMap = ({ size, color }) => (
  <svg {...iconProps(size, color)}>
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
    <line x1="9" y1="3" x2="9" y2="18" />
    <line x1="15" y1="6" x2="15" y2="21" />
  </svg>
);

export const IconSearch = ({ size, color }) => (
  <svg {...iconProps(size, color)}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const IconCopy = ({ size, color }) => (
  <svg {...iconProps(size, color)}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const IconTrash = ({ size, color }) => (
  <svg {...iconProps(size, color)}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

export const IconPlus = ({ size, color }) => (
  <svg {...iconProps(size, color)}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const IconExternalLink = ({ size, color }) => (
  <svg {...iconProps(size, color)}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);
