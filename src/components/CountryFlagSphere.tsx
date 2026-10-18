'use client';

import React, { useId } from 'react';

export interface CountryFlagSphereProps {
  countryCode: string;
  size?: number;
  className?: string;
}

export default function CountryFlagSphere({
  countryCode,
  size = 70,
  className = '',
}: CountryFlagSphereProps) {
  const code = (countryCode || '').trim().toUpperCase();
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9-_]/g, '');

  const sphereLightId = `sphereLight-${uid}`;
  const sphereLowerId = `sphereLower-${uid}`;
  const ballDropId = `ballDrop-${uid}`;
  const ballMaskId = `ballMask-${uid}`;

  const renderFlagArt = () => {
    switch (code) {
      case 'JP':
        return (
          <>
            <rect x="-36" y="-36" width="72" height="72" fill="#FFFFFF" />
            <circle r="14" fill="#BC002D" />
          </>
        );

      case 'US':
        return (
          <>
            <rect x="-36" y="-36" width="72" height="72" fill="#FFFFFF" />
            <rect x="-36" y="-36" width="72" height="5.5" fill="#B22234" />
            <rect x="-36" y="-25" width="72" height="5.5" fill="#B22234" />
            <rect x="-36" y="-14" width="72" height="5.5" fill="#B22234" />
            <rect x="-36" y="-3" width="72" height="5.5" fill="#B22234" />
            <rect x="-36" y="8" width="72" height="5.5" fill="#B22234" />
            <rect x="-36" y="19" width="72" height="5.5" fill="#B22234" />
            <rect x="-36" y="30" width="72" height="5.5" fill="#B22234" />
            <rect x="-36" y="-36" width="38" height="39" fill="#3C3B6E" />
            {[-32, -25, -18, -11, -4].map((cx) =>
              [-31, -23, -15, -7].map((cy) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.25" fill="#FFFFFF" />
              ))
            )}
          </>
        );

      case 'FR':
        return (
          <>
            <rect x="-36" y="-36" width="24" height="72" fill="#0055A4" />
            <rect x="-12" y="-36" width="24" height="72" fill="#FFFFFF" />
            <rect x="12" y="-36" width="24" height="72" fill="#EF4135" />
          </>
        );

      case 'TW':
        return (
          <>
            <rect x="-36" y="-36" width="72" height="72" fill="#FE0000" />
            <rect x="-36" y="-36" width="39" height="39" fill="#000095" />
            <circle cx="-16.5" cy="-16.5" r="9" fill="#FFFFFF" />
            {/* 12 rays */}
            <path d="M-5.5 -16.5 -0.5 -16.5" stroke="#FFFFFF" strokeWidth="2.3" />
            <path d="M-6.97 -11 -2.64 -8.5" stroke="#FFFFFF" strokeWidth="2.3" />
            <path d="M-11 -6.97 -8.5 -2.64" stroke="#FFFFFF" strokeWidth="2.3" />
            <path d="M-16.5 -5.5 -16.5 -0.5" stroke="#FFFFFF" strokeWidth="2.3" />
            <path d="M-22 -6.97 -24.5 -2.64" stroke="#FFFFFF" strokeWidth="2.3" />
            <path d="M-26.03 -11 -30.36 -8.5" stroke="#FFFFFF" strokeWidth="2.3" />
            <path d="M-27.5 -16.5 -32.5 -16.5" stroke="#FFFFFF" strokeWidth="2.3" />
            <path d="M-26.03 -22 -30.36 -24.5" stroke="#FFFFFF" strokeWidth="2.3" />
            <path d="M-22 -26.03 -24.5 -30.36" stroke="#FFFFFF" strokeWidth="2.3" />
            <path d="M-16.5 -27.5 -16.5 -32.5" stroke="#FFFFFF" strokeWidth="2.3" />
            <path d="M-11 -26.03 -8.5 -30.36" stroke="#FFFFFF" strokeWidth="2.3" />
            <path d="M-6.97 -22 -2.64 -24.5" stroke="#FFFFFF" strokeWidth="2.3" />
          </>
        );

      case 'TH':
        return (
          <>
            <rect x="-36" y="-36" width="72" height="72" fill="#A51931" />
            <rect x="-36" y="-24" width="72" height="13" fill="#FFFFFF" />
            <rect x="-36" y="-11" width="72" height="22" fill="#2D2A4A" />
            <rect x="-36" y="11" width="72" height="13" fill="#FFFFFF" />
          </>
        );

      case 'VN':
        return (
          <>
            <rect x="-36" y="-36" width="72" height="72" fill="#DA251D" />
            <polygon
              points="0,-23 5.29,-7.28 21.87,-7.11 8.56,2.78 13.52,18.61 0,9 -13.52,18.61 -8.56,2.78 -21.87,-7.11 -5.29,-7.28"
              fill="#FFFF00"
            />
          </>
        );

      case 'GB':
        return (
          <>
            <rect x="-36" y="-36" width="72" height="72" fill="#012169" />
            <path d="M-36-36 36 36 M36-36 -36 36" stroke="#FFFFFF" strokeWidth="17" />
            <path d="M-36-36 36 36 M36-36 -36 36" stroke="#C8102E" strokeWidth="6" />
            <path d="M0-36V36M-36 0H36" stroke="#FFFFFF" strokeWidth="22" />
            <path d="M0-36V36M-36 0H36" stroke="#C8102E" strokeWidth="11" />
          </>
        );

      case 'IT':
        return (
          <>
            <rect x="-36" y="-36" width="24" height="72" fill="#009246" />
            <rect x="-12" y="-36" width="24" height="72" fill="#FFFFFF" />
            <rect x="12" y="-36" width="24" height="72" fill="#CE2B37" />
          </>
        );

      case 'KR':
        return (
          <>
            <rect x="-36" y="-36" width="72" height="72" fill="#FFFFFF" />
            <path d="M-15,0 A15,15 0 0,1 15,0 A7.5,7.5 0 0,1 0,0 A7.5,7.5 0 0,0 -15,0 Z" fill="#C60C30" />
            <path d="M-15,0 A15,15 0 0,0 15,0 A7.5,7.5 0 0,1 0,0 A7.5,7.5 0 0,0 -15,0 Z" fill="#003478" />
            {/* Trigrams in black */}
            <rect x="-26" y="-26" width="8" height="2.5" fill="#000000" transform="rotate(45 -22 -24.75)" />
            <rect x="18" y="-26" width="8" height="2.5" fill="#000000" transform="rotate(-45 22 -24.75)" />
            <rect x="-26" y="24" width="8" height="2.5" fill="#000000" transform="rotate(-45 -22 25.25)" />
            <rect x="18" y="24" width="8" height="2.5" fill="#000000" transform="rotate(45 22 25.25)" />
          </>
        );

      default:
        // Neutral globe fallback
        return (
          <>
            <rect x="-36" y="-36" width="72" height="72" fill="#1B64DA" />
            <circle cx="0" cy="0" r="24" fill="none" stroke="#FFFFFF" strokeWidth="3" opacity="0.6" />
            <ellipse cx="0" cy="0" rx="14" ry="24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" opacity="0.6" />
            <line x1="-24" y1="0" x2="24" y2="0" stroke="#FFFFFF" strokeWidth="2.5" opacity="0.6" />
          </>
        );
    }
  };

  // Height proportional to width 84:92
  const height = Math.round((size * 92) / 84);

  return (
    <svg
      width={size}
      height={height}
      viewBox="-42 -40 84 92"
      className={`shrink-0 overflow-visible select-none ${className}`}
      role="img"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={sphereLightId} cx="24%" cy="18%" r="96%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity=".72" />
          <stop offset="32%" stopColor="#FFFFFF" stopOpacity=".08" />
          <stop offset="65%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="100%" stopColor="#101828" stopOpacity=".38" />
        </radialGradient>
        <linearGradient id={sphereLowerId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity=".12" />
        </linearGradient>
        <filter id={ballDropId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <clipPath id={ballMaskId}>
          <circle cx="0" cy="0" r="35" />
        </clipPath>
      </defs>

      {/* Shadow underneath ball */}
      <ellipse cx="3" cy="38" rx="30" ry="8" fill="#191F28" opacity=".18" filter={`url(#${ballDropId})`} />

      {/* Clipped ball content */}
      <g clipPath={`url(#${ballMaskId})`}>
        {renderFlagArt()}
        <circle r="35" fill={`url(#${sphereLowerId})`} />
        <circle r="35" fill={`url(#${sphereLightId})`} />
        <ellipse
          cx="-10"
          cy="-19"
          rx="19"
          ry="9"
          fill="#FFFFFF"
          opacity=".18"
          transform="rotate(-25 -10 -19)"
        />
      </g>

      {/* Outer 3D edge rim */}
      <circle r="34.5" fill="none" stroke="#FFFFFF" strokeOpacity=".48" strokeWidth="1.5" />
    </svg>
  );
}
