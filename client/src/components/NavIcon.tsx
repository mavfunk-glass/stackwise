import type { SVGProps } from 'react';

export type NavIconKind = 'home' | 'stack' | 'hub' | 'daily' | 'rebuild' | 'pricing' | 'chat' | 'profile';

type NavIconProps = {
  kind: NavIconKind;
  /** Pixel size; matches surrounding text when omitted. */
  size?: number;
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, 'children' | 'viewBox'>;

const stroke = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/**
 * Monochrome navigation glyphs (currentColor) for a uniform look with site typography.
 */
export default function NavIcon({ kind, size = 16, className = '', ...rest }: NavIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    className: `shrink-0 inline-block ${className}`.trim(),
    'aria-hidden': true as const,
    ...rest,
  };

  switch (kind) {
    case 'home':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" {...stroke} />
          <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" {...stroke} />
        </svg>
      );
    case 'stack':
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="6" rx="2" {...stroke} />
          <rect x="4" y="13" width="16" height="6" rx="2" {...stroke} />
          <path d="M9 8h6M9 16h6" {...stroke} />
        </svg>
      );
    case 'hub':
      return (
        <svg {...common}>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" {...stroke} />
        </svg>
      );
    case 'daily':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" {...stroke} />
          <path d="M16 2v4M8 2v4M3 10h18" {...stroke} />
        </svg>
      );
    case 'rebuild':
      return (
        <svg {...common}>
          <path d="M1 4v6h6" {...stroke} />
          <path d="M23 20v-6h-6" {...stroke} />
          <path
            d="M20.49 9A9 9 0 0 0 5.64 5.64L3 8M3.51 15a9 9 0 0 0 14.85 3.36L21 16"
            {...stroke}
          />
        </svg>
      );
    case 'pricing':
      return (
        <svg {...common}>
          <path
            d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6-4.6-6 4.6 2.3-7-6-4.6h7.6L12 2z"
            {...stroke}
          />
        </svg>
      );
    case 'chat':
      return (
        <svg {...common}>
          <path
            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
            {...stroke}
          />
        </svg>
      );
    case 'profile':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" {...stroke} />
          <path d="M6 21v-1a6 6 0 0 1 12 0v1" {...stroke} />
        </svg>
      );
    default:
      return null;
  }
}
