import React from 'react';
import type { ReligionId } from '../game/faithStudyLogic';

interface ReligionIconProps {
  religion: ReligionId;
  className?: string;
}

export const ReligionIcon: React.FC<ReligionIconProps> = ({
  religion,
  className = 'h-5 w-5',
}) => {
  switch (religion) {
    case 'christianity':
      // Open Bible with subtle Cross motif
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <path d="M12 4v14" />
          <path d="M8.5 8h7" />
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H12v15H6.5A2.5 2.5 0 0 0 4 21V6.5Z" />
          <path d="M20 6.5A2.5 2.5 0 0 0 17.5 4H12v15h5.5A2.5 2.5 0 0 1 20 21V6.5Z" />
        </svg>
      );

    case 'islam':
      // Crescent Moon & 5-point Star
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <path d="M15.8 17.7A7.5 7.5 0 0 1 11.2 4.2a8.2 8.2 0 1 0 8.6 13.1 7.4 7.4 0 0 1-4 .4Z" />
          <path d="m17.5 7.2.7 1.5 1.6.2-1.2 1.1.3 1.6-1.4-.8-1.4.8.3-1.6-1.2-1.1 1.6-.2.7-1.5Z" />
        </svg>
      );

    case 'judaism':
      // 6-Point Star of David
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.85}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <polygon points="12 3 19.5 16.5 4.5 16.5" />
          <polygon points="12 21 19.5 7.5 4.5 7.5" />
        </svg>
      );

    case 'hinduism':
      // Sacred Om Vector Emblem
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <path d="M5.5 8.5c1.5-1.5 4.2-1.3 4.8.6.5 1.5-.8 2.8-2.4 2.9 2.1.3 3.4 2.1 2.7 4.2-.8 2.1-3.8 2.6-5.6 1.1" />
          <path d="M10.4 13.1c1.8-.3 2.5-1.6 4.2-1.5 1.9.1 3.3 1.7 3 3.8-.3 1.9-2 3.1-3.8 2.8-1.5-.2-2.4-1.3-2.5-2.5" />
          <path d="M11.5 5.6c1.8 1.2 4.3 1.2 6.1 0" />
          <circle cx="14.6" cy="3.7" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'buddhism':
      // 8-Spoke Dharma Wheel
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.85}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="7.5" />
          <circle cx="12" cy="12" r="2.2" />
          <path d="M12 2.5v7.3M12 14.2v7.3M2.5 12h7.3M14.2 12h7.3" />
          <path d="m5.3 5.3 5.1 5.1M13.6 13.6l5.1 5.1M18.7 5.3l-5.1 5.1M10.4 13.6l-5.1 5.1" />
        </svg>
      );

    case 'spirituality':
    default:
      // Global Dove / Universal Wisdom Globe
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.85}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.8 12h16.4" />
          <path d="M12 3.5a12.5 12.5 0 0 1 0 17" />
          <path d="M12 3.5a12.5 12.5 0 0 0 0 17" />
        </svg>
      );
  }
};
