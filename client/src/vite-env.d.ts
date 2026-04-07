/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Optional. Set when the built SPA is served from a different origin than the Express API (e.g. static host + API on Railway). No trailing slash. */
  readonly VITE_API_BASE_URL?: string;
  /** Supabase project URL (Auth). Optional; legacy magic link is used if unset. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon public key. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** When "true", sign-in email uses Supabase OTP instead of Resend (configure Supabase Site URL for production). */
  readonly VITE_SUPABASE_OTP_SIGNIN?: string;
  /** Public site origin for Supabase emailRedirectTo when using OTP (no trailing slash). Defaults to window.location.origin. */
  readonly VITE_PUBLIC_APP_URL?: string;
  readonly VITE_AMAZON_ASSOCIATE_TAG?: string;
  /** When "true", pricing shows Stripe Checkout buttons (server must have STRIPE_SECRET_KEY + STRIPE_PRICE_*). */
  readonly VITE_STRIPE_CHECKOUT?: string;
  /** Dev server only: set to "true" to unlock Pro features without PayPal. Ignored in production builds. */
  readonly VITE_DEV_PRO?: string;
  /** Optional shared secret; must match server ANALYZE_SECRET so /api/analyze requests are accepted. */
  readonly VITE_ANALYZE_SECRET?: string;
  /** Optional; must match server ANALYTICS_INGEST_KEY when that is set (protects POST /api/analytics/event). */
  readonly VITE_ANALYTICS_INGEST_KEY?: string;
  /** Injected at build from client/package.json or STACKWISE_APP_VERSION_OVERRIDE (see vite.config.ts). */
  readonly VITE_APP_VERSION: string;
}

