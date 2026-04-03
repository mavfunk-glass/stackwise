import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import LandingPage from './pages/LandingPage';
import QuizPage from './pages/QuizPage';
import ResultsPage from './pages/ResultsPage';
import PricingPage from './pages/PricingPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import FaqPage from './pages/FaqPage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import ProtocolLibraryPage from './pages/ProtocolLibraryPage';
import IntroPage from './pages/IntroPage';
import MagicVerifyPage from './pages/MagicVerifyPage';
import UnsubscribePage from './pages/UnsubscribePage';
import CookieConsent from './components/CookieConsent';
import AppVersion from './components/AppVersion';
import ThemeToggle from './theme/ThemeToggle';
import AuthCallbackPage from './pages/AuthCallbackPage';
import CoachHubPage from './pages/CoachHubPage';
import { ensureApiSession, fetchBillingStatus } from './api/session';
import { getSubscription, saveSubscription } from './types/storage';
import { trackEvent } from './analytics/track';

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID as string;

export default function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  useEffect(() => {
    trackEvent('page_view', { route: pathname });
  }, [pathname]);

  // One-click check-in redirect from email reminder (server → /dashboard?checkin=done&date=)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkin = params.get('checkin');
    const date = params.get('date');
    if (checkin === 'done' && date) {
      import('./types/storage').then(({ recordCheckIn }) => {
        recordCheckIn(undefined, undefined, date);
      });
      const clean = window.location.pathname;
      window.history.replaceState({}, '', clean);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await ensureApiSession();
      const s = await fetchBillingStatus();
      if (
        s?.serverEntitlements &&
        s.paypalSubscriptionId &&
        (s.tier === 'basic' || s.tier === 'pro')
      ) {
        const prev = getSubscription();
        if (!prev || prev.subscriptionId !== s.paypalSubscriptionId) {
          saveSubscription({
            tier: s.tier,
            subscriptionId: s.paypalSubscriptionId,
            activatedAt: s.activatedAt ?? new Date().toISOString(),
          });
        }
      }
    })();
  }, []);

  return (
    <PayPalScriptProvider
      options={{
        clientId: PAYPAL_CLIENT_ID || 'test',
        vault: true,
        intent: 'subscription',
        components: 'buttons',
      }}
    >
      <Routes>
        <Route path="/" element={<IntroPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/protocols" element={<ProtocolLibraryPage />} />
        <Route path="/coach" element={<CoachHubPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/auth/verify" element={<MagicVerifyPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/unsubscribe" element={<UnsubscribePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CookieConsent />
      <div
        className="fixed z-[51] pointer-events-auto"
        style={{
          bottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
          left: 'max(10px, env(safe-area-inset-left, 10px))',
        }}
      >
        <ThemeToggle variant="compact" />
      </div>
      <AppVersion />
    </PayPalScriptProvider>
  );
}
