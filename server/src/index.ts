import express from 'express';
import cors from 'cors';
import fs from 'fs';
import aiRouter from './routes/ai.js';
import authRoutes from './routes/authRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import { startReminderJob } from './services/reminderJob.js';
import paypalWebhookHandler from './routes/paypalWebhookHandler.js';
import { getDb } from './db/index.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load the root .env (workspace root) even when the server is started from /server.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
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

