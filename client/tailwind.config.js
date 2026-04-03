/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: {
        /** Narrow phones / large phones — use for compact UI toggles */
        xs: '480px',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Figtree"', 'system-ui', 'sans-serif'],
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['"Figtree"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Hims-inspired palette — theme surfaces use CSS vars (see src/styles/index.css :root / html.dark)
        /** Full-page canvas — always use for `min-h-screen` shells (light cream / dark near-black) */
        'sw-bg': 'var(--sw-bg)',
        forest: '#1C3A2E',         // deep green — primary (buttons, dark panels)
        'forest-light': '#2D5242', // lighter green
        ink: 'rgb(var(--tw-ink) / <alpha-value>)', // primary text on cream (light) / on dark bg (dark)
        cream: 'rgb(var(--tw-cream) / <alpha-value>)',
        'cream-dark': 'rgb(var(--tw-cream-dark) / <alpha-value>)',
        /** Cards / panels — use instead of hardcoded #fff / #FDFCFA */
        surface: 'rgb(var(--tw-surface) / <alpha-value>)',
        'surface-elevated': 'rgb(var(--tw-surface-elevated) / <alpha-value>)',
        stone: 'rgb(var(--tw-stone) / <alpha-value>)',
        'stone-dark': 'rgb(var(--tw-stone-dark) / <alpha-value>)',
        sage: 'rgb(var(--tw-sage) / <alpha-value>)',
        warm: 'rgb(var(--tw-warm) / <alpha-value>)',
        'warm-mid': 'rgb(var(--tw-warm-mid) / <alpha-value>)',
        'warm-light': 'rgb(var(--tw-warm-light) / <alpha-value>)',
        moss: 'rgb(var(--tw-moss) / <alpha-value>)',
        'moss-light': 'rgb(var(--tw-moss-light) / <alpha-value>)',
        navy: '#0A1628',           // keep for compatibility
        lime: {
          DEFAULT: '#4A7C59',
          400: '#5E9970',
          500: '#4A7C59',
          600: '#3A6347',
          dark: '#2D5242',
        },
        'light-gray': '#F0EBE3',
        amazonOrange: '#FF9900',
        iHerbGreen: '#2D7A3A',
        // Stacky accent — ties the mascot into the brand palette
        stacky: '#F5924A',        // Stacky's body orange
        'stacky-light': '#FEF0D8',  // Stacky's cream belly — for very subtle tints
      },
      letterSpacing: {
        'display': '-0.02em',
        'caption': '0.08em',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'ticker': 'ticker 30s linear infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
