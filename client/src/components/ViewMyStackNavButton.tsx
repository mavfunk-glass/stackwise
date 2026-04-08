import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ensureCurrentStackFromProfile } from '../types/storage';
import { NavIcon } from '../copy/navWayfinding';

type Props = {
  className?: string;
  /** Prominent pill for landing / intro; muted text link for dashboard-style bars */
  variant?: 'emphasized' | 'subtle';
};

/**
 * Navigates to saved stack results when available; otherwise sends the user to the quiz to build one.
 */
export default function ViewMyStackNavButton({ className = '', variant = 'emphasized' }: Props) {
  const navigate = useNavigate();
  const onClick = useCallback(() => {
    if (ensureCurrentStackFromProfile()) navigate('/results');
    else navigate('/quiz');
  }, [navigate]);

  const style =
    variant === 'emphasized'
      ? 'rounded-full border-2 border-forest bg-surface-elevated text-forest px-3 sm:px-4 h-8 sm:h-9 text-xs sm:text-sm font-semibold hover:bg-cream-dark dark:text-moss dark:border-moss dark:hover:bg-surface-elevated/80 shadow-sm'
      : 'text-xs font-medium text-warm-mid hover:text-ink dark:text-warm-mid dark:hover:text-warm gap-1';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1 sm:gap-1.5 transition-colors active:scale-[0.99] ${style} ${className}`.trim()}
      aria-label="View my stack"
    >
      <NavIcon kind="stack" size={15} className="opacity-90 shrink-0" />
      <span className="sm:hidden">View stack</span>
      <span className="hidden sm:inline">View my stack</span>
    </button>
  );
}
