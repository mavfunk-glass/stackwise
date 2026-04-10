import express from 'express';
import cors from 'cors';
import fs from 'fs';
import aiRouter from './routes/ai.js';
import authRoutes from './routes/authRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import { startReminderJob } from './services/reminderJob.js';
import paypalWebhookHandler from './routes/paypalWebhookHandler.js';
import stripeWebhookHandler from './routes/stripeWebhookHandler.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import { getDb } from './db/index.js';
import { warnIfLocalhostOriginInProduction } from './config/appPublicUrl.js';
import { getResendConfig } from './services/emailService.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Root .env (workspace) then server/.env. Dotenv does not override existing keys, so root wins on duplicates; keys only in server/.env still apply.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function validateProductionEnv() {
  if (process.env.NODE_ENV !== 'production') return;

  const missing: string[] = [];
  const invalid: string[] = [];
  const warnings: string[] = [];
  const forceApiAuth = process.env.STACKWISE_REQUIRE_API_AUTH === 'true';

  if (!process.env.GEMINI_API_KEY?.trim()) missing.push('GEMINI_API_KEY');

  const jwt = process.env.JWT_SECRET?.trim() ?? '';
  const supaJwt = process.env.SUPABASE_JWT_SECRET?.trim() ?? '';
  const hasJwt = jwt.length >= 32;
  const hasSupaJwt = supaJwt.length > 0;

  if (forceApiAuth) {
    if (!hasJwt && !hasSupaJwt) {
      invalid.push(
        'STACKWISE_REQUIRE_API_AUTH=true requires JWT_SECRET (>=32 chars) or SUPABASE_JWT_SECRET',
      );
    }
  } else if (!hasJwt && !hasSupaJwt) {
    warnings.push(
      'API auth will run in open mode because JWT_SECRET and SUPABASE_JWT_SECRET are both missing.',
    );
  } else if (jwt.length > 0 && jwt.length < 32) {
    warnings.push('JWT_SECRET is set but shorter than 32 chars, API auth will rely on SUPABASE_JWT_SECRET if present.');
  }

  if (!process.env.APP_URL?.trim() && !process.env.CLIENT_URL?.trim()) {
    warnings.push(
      'Neither APP_URL nor CLIENT_URL is set (email and checkout return links default to localhost).',
    );
  } else if (!process.env.APP_URL?.trim() && process.env.CLIENT_URL?.trim()) {
    warnings.push('APP_URL is not set; using CLIENT_URL for public links in emails (set APP_URL too if they differ).');
  }
  if (!process.env.CLIENT_URL?.trim()) {
    warnings.push('CLIENT_URL is not set (CORS may be broader than intended).');
  }
  if (!process.env.RESEND_API_KEY?.trim()) {
    warnings.push(
      'RESEND_API_KEY is not set; magic links and reminder emails are not sent (dev mode logs links to the console only).',
    );
  }

  if (missing.length || invalid.length) {
    const parts = [
      '[startup] Invalid production environment configuration.',
      missing.length ? `Missing: ${missing.join(', ')}` : '',
      invalid.length ? `Invalid: ${invalid.join('; ')}` : '',
      warnings.length ? `Warnings: ${warnings.join(' ')}` : '',
      'Set required env vars and redeploy.',
    ].filter(Boolean);
    throw new Error(parts.join(' '));
  }

  if (warnings.length) {
    // eslint-disable-next-line no-console
    console.warn(`[startup] ${warnings.join(' ')}`);
  }
}

validateProductionEnv();
warnIfLocalhostOriginInProduction();
getDb();

const app = express();
app.set('trust proxy', 1);

const port = Number(process.env.PORT ?? 3001);
const clientUrl = process.env.CLIENT_URL;

app.use(
  cors({
    origin: clientUrl ?? true,
  }),
);

app.post('/api/webhooks/paypal', express.raw({ type: 'application/json' }), paypalWebhookHandler);
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler);
app.use(express.json({ limit: '1mb' }));

app.use('/api/analytics', analyticsRoutes);

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

/** Quick check for operators: is Resend set so magic-link emails can send? No secrets returned. */
app.get('/health/email', (_req, res) => {
  const resendConfigured = Boolean(getResendConfig().apiKey);
  res.status(200).json({
    resendConfigured,
    message: resendConfigured
      ? 'RESEND_API_KEY is set — the server can send sign-in and reminder emails via Resend.'
      : 'RESEND_API_KEY is not set — sign-in links by email will not send until you add a Resend API key and redeploy (unless you use Supabase Auth in the client build instead).',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/account', accountRoutes);
app.use('/api', aiRouter);

/** Vite production build (e.g. Railway single service). Same origin: leave VITE_API_BASE_URL unset on the client. */
const clientDist = path.resolve(__dirname, '../../client/dist');
const indexHtml = path.join(clientDist, 'index.html');
if (fs.existsSync(indexHtml)) {
  app.use(express.static(clientDist, { index: false }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(indexHtml);
  });
}

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`StackWise server listening on http://localhost:${port}`);
  startReminderJob();
});

