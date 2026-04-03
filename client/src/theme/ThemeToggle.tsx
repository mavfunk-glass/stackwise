import type { ReactNode } from 'react';
import { useTheme, type ThemePreference } from './ThemeProvider';

function darkModeLabel(compact: boolean): ReactNode {
  return (
    <span className="inline-flex items-center gap-1">
      <span aria-hidden>🌙</span>
      <span>Dark</span>
      <span
        className={
          compact
            ? 'text-[9px] font-bold uppercase tracking-wider opacity-80'
            : 'text-[10px] font-bold uppercase tracking-wider opacity-80'
        }
      >
        beta
      </span>
    </span>
  );
}

const OPTIONS: { value: ThemePreference; label: (compact: boolean) => ReactNode }[] = [
  { value: 'light', label: () => 'Light' },
  { value: 'dark', label: (c) => darkModeLabel(c) },
];

type Props = {
  /** compact = single row of pills; default = labeled section */
  variant?: 'default' | 'compact';
};

export default function ThemeToggle({ variant = 'default' }: Props) {
  const { preference, setPreference } = useTheme();
  const compact = variant === 'compact';

  if (compact) {
    return (
      <div className="inline-flex rounded-full border border-stone dark:border-stone/60 p-0.5 bg-cream-dark/50 dark:bg-cream/10">
        {OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setPreference(value)}
            className={[
              'px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors min-h-0 inline-flex items-center justify-center gap-0.5',
              preference === value
                ? 'bg-forest text-on-dark-primary shadow-sm'
                : 'text-warm-mid dark:text-warm-light hover:text-ink',
            ].join(' ')}
          >
            {label(true)}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone dark:border-stone/50 bg-white dark:bg-cream/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-warm-light mb-3">Appearance</p>
      <p className="text-sm text-warm-mid dark:text-warm-mid mb-3">
        Light is the default. Dark (beta) uses deep greens and cream text so it stays on-brand.
      </p>
      <div className="flex flex-col gap-2">
        {OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setPreference(value)}
            className={[
              'w-full text-left rounded-xl px-4 py-3 text-sm font-medium border transition-colors',
              preference === value
                ? 'border-forest bg-moss-light/50 dark:bg-moss-light/15 text-ink border-forest/80'
                : 'border-stone dark:border-stone/60 bg-cream dark:bg-cream/10 text-warm dark:text-warm-mid hover:border-sage/50',
            ].join(' ')}
          >
            {label(false)}
          </button>
        ))}
      </div>
    </div>
  );
}
