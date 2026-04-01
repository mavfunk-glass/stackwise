/** @type {import('tailwindcss').Config} */
export default {
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
        // Hims-inspired palette
        forest: '#1C3A2E',         // deep green — primary
        'forest-light': '#2D5242', // lighter green
        cream: '#F9F6F1',          // warm off-white background
        'cream-dark': '#F0EBE3',   // slightly darker cream for cards
        stone: '#E8E0D5',          // borders, dividers
        'stone-dark': '#C4B9AC',   // stronger borders
        sage: '#7B9E87',           // muted green accent
        warm: '#3D2E22',           // warm dark brown for text
        'warm-mid': '#6B5B4E',     // mid text
        'warm-light': '#9C8E84',   // placeholder/subtle text
        moss: '#4A7C59',           // action green
        'moss-light': '#D4E8DA',   // light green tint
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
