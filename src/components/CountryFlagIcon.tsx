'use client';

import React from 'react';

export interface CountryFlagIconProps {
  countryCode?: string;
  lang?: string;
  currency?: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export function resolveFlagKey({
  countryCode,
  lang,
  currency,
}: {
  countryCode?: string;
  lang?: string;
  currency?: string;
}): 'KR' | 'TH' | 'JP' | 'US' | 'VN' | 'FR' | 'GB' | 'EU' | 'TW' | 'IT' | 'ES' | 'SG' | 'GLOBE' {
  const cc = countryCode ? countryCode.trim().toUpperCase() : '';
  const cur = currency ? currency.trim().toUpperCase() : '';
  const l = lang ? lang.trim().toLowerCase() : '';

  // 1. Direct country code check
  if (cc === 'KR') return 'KR';
  if (cc === 'TH') return 'TH';
  if (cc === 'JP') return 'JP';
  if (cc === 'US') return 'US';
  if (cc === 'VN') return 'VN';
  if (cc === 'FR') return 'FR';
  if (cc === 'GB' || cc === 'UK') return 'GB';
  if (cc === 'EU') return 'EU';
  if (cc === 'TW') return 'TW';
  if (cc === 'IT') return 'IT';
  if (cc === 'ES') return 'ES';
  if (cc === 'SG') return 'SG';

  // 2. Currency check
  if (cur === 'KRW') return 'KR';
  if (cur === 'THB') return 'TH';
  if (cur === 'JPY') return 'JP';
  if (cur === 'USD') return 'US';
  if (cur === 'VND') return 'VN';
  if (cur === 'EUR') return 'EU';
  if (cur === 'GBP') return 'GB';
  if (cur === 'TWD') return 'TW';
  if (cur === 'SGD') return 'SG';

  // 3. Language check
  if (l === 'ko') return 'KR';
  if (l === 'th') return 'TH';
  if (l === 'ja') return 'JP';
  if (l === 'en') return 'US';
  if (l === 'vi') return 'VN';
  if (l === 'fr') return 'FR';
  if (l === 'zh-tw' || l === 'zh') return 'TW';
  if (l === 'it') return 'IT';
  if (l === 'es') return 'ES';

  return 'GLOBE';
}

export default function CountryFlagIcon({
  countryCode,
  lang,
  currency,
  size = 28,
  className = '',
  ariaLabel,
}: CountryFlagIconProps) {
  const flagKey = resolveFlagKey({ countryCode, lang, currency });
  const clipId = `flag-clip-${flagKey}-${Math.random().toString(36).substring(2, 7)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={`rounded-full overflow-hidden shrink-0 border border-[#E5E8EB] shadow-xs select-none ${className}`}
      role="img"
      aria-label={ariaLabel || `${flagKey} 국기`}
      aria-hidden={ariaLabel ? undefined : 'true'}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="16" cy="16" r="16" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {/* Flag Graphic Definitions */}
        {flagKey === 'KR' && (
          <>
            <rect width="32" height="32" fill="#FFFFFF" />
            {/* Taegeuk Red & Blue */}
            <path
              d="M 8 16 A 8 8 0 0 1 24 16 A 4 4 0 0 0 16 16 A 4 4 0 0 1 8 16"
              fill="#C83E4D"
            />
            <path
              d="M 8 16 A 8 8 0 0 0 24 16 A 4 4 0 0 1 16 16 A 4 4 0 0 0 8 16"
              fill="#1753A6"
            />
            {/* 4 Trigrams (괘) */}
            <g stroke="#191F28" strokeWidth="1.2" strokeLinecap="round">
              {/* Geon (건: 상좌) */}
              <line x1="6" y1="8" x2="10" y2="5" />
              <line x1="7.5" y1="10" x2="11.5" y2="7" />
              <line x1="9" y1="12" x2="13" y2="9" />
              {/* Gon (곤: 하우) */}
              <line x1="19" y1="23" x2="23" y2="20" strokeDasharray="1.8 1" />
              <line x1="20.5" y1="25" x2="24.5" y2="22" strokeDasharray="1.8 1" />
              <line x1="22" y1="27" x2="26" y2="24" strokeDasharray="1.8 1" />
              {/* Gam (감: 상우) */}
              <line x1="22" y1="5" x2="26" y2="8" strokeDasharray="1.8 1" />
              <line x1="20.5" y1="7" x2="24.5" y2="10" />
              <line x1="19" y1="9" x2="23" y2="12" strokeDasharray="1.8 1" />
              {/* Ri (리: 하좌) */}
              <line x1="6" y1="24" x2="10" y2="27" />
              <line x1="7.5" y1="22" x2="11.5" y2="25" strokeDasharray="1.8 1" />
              <line x1="9" y1="20" x2="13" y2="23" />
            </g>
          </>
        )}

        {flagKey === 'TH' && (
          <>
            {/* Red top */}
            <rect x="0" y="0" width="32" height="6" fill="#A51931" />
            {/* White top stripe */}
            <rect x="0" y="6" width="32" height="5" fill="#FFFFFF" />
            {/* Blue central stripe */}
            <rect x="0" y="11" width="32" height="10" fill="#2D2A4A" />
            {/* White bottom stripe */}
            <rect x="0" y="21" width="32" height="5" fill="#FFFFFF" />
            {/* Red bottom */}
            <rect x="0" y="26" width="32" height="6" fill="#A51931" />
          </>
        )}

        {flagKey === 'JP' && (
          <>
            <rect width="32" height="32" fill="#FFFFFF" />
            <circle cx="16" cy="16" r="8.5" fill="#BC002D" />
          </>
        )}

        {flagKey === 'US' && (
          <>
            <rect width="32" height="32" fill="#FFFFFF" />
            {/* Red stripes */}
            {[0, 5, 10, 15, 20, 25, 30].map((y, i) => (
              <rect key={i} x="0" y={y} width="32" height="2.5" fill="#B22234" />
            ))}
            {/* Canton */}
            <rect x="0" y="0" width="15" height="17" fill="#3C3B6E" />
            {/* Stars dots */}
            <circle cx="4" cy="4" r="1" fill="#FFFFFF" />
            <circle cx="10" cy="4" r="1" fill="#FFFFFF" />
            <circle cx="7" cy="8.5" r="1" fill="#FFFFFF" />
            <circle cx="4" cy="13" r="1" fill="#FFFFFF" />
            <circle cx="10" cy="13" r="1" fill="#FFFFFF" />
          </>
        )}

        {flagKey === 'VN' && (
          <>
            <rect width="32" height="32" fill="#DA251D" />
            <polygon
              points="16,6 19,13 26,14 21,19 23,26 16,22 9,26 11,19 6,14 13,13"
              fill="#FFFF00"
            />
          </>
        )}

        {flagKey === 'FR' && (
          <>
            <rect x="0" y="0" width="10.6" height="32" fill="#002654" />
            <rect x="10.6" y="0" width="10.8" height="32" fill="#FFFFFF" />
            <rect x="21.4" y="0" width="10.6" height="32" fill="#ED2939" />
          </>
        )}

        {flagKey === 'GB' && (
          <>
            <rect width="32" height="32" fill="#012169" />
            {/* White diagonals */}
            <line x1="0" y1="0" x2="32" y2="32" stroke="#FFFFFF" strokeWidth="5" />
            <line x1="32" y1="0" x2="0" y2="32" stroke="#FFFFFF" strokeWidth="5" />
            {/* Red diagonals */}
            <line x1="0" y1="0" x2="32" y2="32" stroke="#C8102E" strokeWidth="2.5" />
            <line x1="32" y1="0" x2="0" y2="32" stroke="#C8102E" strokeWidth="2.5" />
            {/* White Cross */}
            <rect x="12" y="0" width="8" height="32" fill="#FFFFFF" />
            <rect x="0" y="12" width="32" height="8" fill="#FFFFFF" />
            {/* Red Cross */}
            <rect x="13.5" y="0" width="5" height="32" fill="#C8102E" />
            <rect x="0" y="13.5" width="32" height="5" fill="#C8102E" />
          </>
        )}

        {flagKey === 'EU' && (
          <>
            <rect width="32" height="32" fill="#003399" />
            {/* Circle of stars */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const cx = 16 + 9 * Math.cos(rad);
              const cy = 16 + 9 * Math.sin(rad);
              return <circle key={deg} cx={cx} cy={cy} r="1.1" fill="#FFCC00" />;
            })}
          </>
        )}

        {flagKey === 'TW' && (
          <>
            <rect width="32" height="32" fill="#FE0000" />
            <rect x="0" y="0" width="16" height="16" fill="#000095" />
            <circle cx="8" cy="8" r="4" fill="#FFFFFF" />
            <circle cx="8" cy="8" r="2.5" fill="#000095" />
            <circle cx="8" cy="8" r="1.8" fill="#FFFFFF" />
          </>
        )}

        {flagKey === 'IT' && (
          <>
            <rect x="0" y="0" width="10.6" height="32" fill="#009246" />
            <rect x="10.6" y="0" width="10.8" height="32" fill="#FFFFFF" />
            <rect x="21.4" y="0" width="10.6" height="32" fill="#CE2B37" />
          </>
        )}

        {flagKey === 'ES' && (
          <>
            <rect x="0" y="0" width="32" height="8" fill="#AA151B" />
            <rect x="0" y="8" width="32" height="16" fill="#F1BF00" />
            <rect x="0" y="24" width="32" height="8" fill="#AA151B" />
          </>
        )}

        {flagKey === 'SG' && (
          <>
            <rect x="0" y="0" width="32" height="16" fill="#EE2536" />
            <rect x="0" y="16" width="32" height="16" fill="#FFFFFF" />
            <circle cx="8" cy="8" r="5" fill="#FFFFFF" />
            <circle cx="9.5" cy="8" r="4.5" fill="#EE2536" />
          </>
        )}

        {flagKey === 'GLOBE' && (
          <>
            <rect width="32" height="32" fill="#FFFFFF" />
            <circle cx="16" cy="16" r="14" fill="none" stroke="#8B95A1" strokeWidth="1.5" />
            <ellipse cx="16" cy="16" rx="7" ry="14" fill="none" stroke="#8B95A1" strokeWidth="1.2" />
            <line x1="2" y1="16" x2="30" y2="16" stroke="#8B95A1" strokeWidth="1.2" />
            <line x1="5" y1="9" x2="27" y2="9" stroke="#8B95A1" strokeWidth="1" strokeDasharray="2 1" />
            <line x1="5" y1="23" x2="27" y2="23" stroke="#8B95A1" strokeWidth="1" strokeDasharray="2 1" />
          </>
        )}
      </g>
    </svg>
  );
}
