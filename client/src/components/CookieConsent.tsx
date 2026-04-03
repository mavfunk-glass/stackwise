import { useState, useEffect } from 'react';

const CONSENT_KEY = 'stackwise_cookie_consent_v1';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      const t = setTimeout(() => {
        setVisible(true);
        setTimeout(() => setAnimateIn(true), 40);
      }, 800);
      return () => clearTimeout(t);
    }
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setAnimateIn(false);
    setTimeout(() => setVisible(false), 320);
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
        left: 0,
        right: 0,
        zIndex: 999,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 16px',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#1C3A2E',
          borderRadius: 18,
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          pointerEvents: 'all',
          boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
          transform: animateIn ? 'translateY(0)' : 'translateY(28px)',
          opacity: animateIn ? 1 : 0,
          transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>🐱</span>
          <div>
            <p style={{ fontSize: 13, color: '#F9F6F1', lineHeight: 1.5, margin: 0 }}>
              <strong>StackWise uses localStorage</strong> - not tracking cookies - to store your session and preferences. We also collect anonymous usage events (no health data, no personal info) to improve the app. PayPal may set cookies at checkout.{` `}
              <a href="/privacy" style={{ color: 'rgba(249,246,241,0.65)', textDecoration: 'underline', fontSize: 12 }}>
                Privacy policy
              </a>
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={accept}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 100,
              background: '#F9F6F1',
              color: '#1C3A2E',
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'Figtree, system-ui, sans-serif',
            }}
          >
            Got it
          </button>
          <button
            type="button"
            onClick={accept}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 100,
              background: 'transparent',
              color: 'rgba(249,246,241,0.55)',
              fontSize: 13,
              fontWeight: 500,
              border: '1px solid rgba(249,246,241,0.2)',
              cursor: 'pointer',
              fontFamily: 'Figtree, system-ui, sans-serif',
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
