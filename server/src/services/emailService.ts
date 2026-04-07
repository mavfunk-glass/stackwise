/**
 * Email sending via Resend (resend.com).
 * Set RESEND_API_KEY and RESEND_FROM_EMAIL in your .env.
 * Without RESEND_API_KEY, all sends are logged to console (dev mode).
 */

/** Human-readable Resend API error for logs (domain verification, invalid from, etc.). */
export function formatResendApiError(body: unknown): string {
  if (body && typeof body === 'object') {
    const o = body as Record<string, unknown>;
    if (typeof o.message === 'string') return o.message;
    if (Array.isArray(o.errors)) {
      try {
        return JSON.stringify(o.errors);
      } catch {
        /* fall through */
      }
    }
  }
  try {
    return JSON.stringify(body);
  } catch {
    return String(body);
  }
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'stacky@stack-wise.org';

  if (!apiKey) {
    // Dev mode: log to console instead of sending
    console.log(`\n[email:DEV] To: ${payload.to}`);
    console.log(`[email:DEV] Subject: ${payload.subject}`);
    console.log(`[email:DEV] (HTML body omitted. Set RESEND_API_KEY to send real emails)\n`);
    return { ok: true };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Stacky at StackWise <${fromEmail}>`,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const detail = formatResendApiError(errBody);
      console.error('[email] Resend HTTP', res.status, detail);
      return { ok: false, error: detail || 'Send failed' };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    console.error('[email] fetch error:', message);
    return { ok: false, error: message };
  }
}

// ── Email templates ────────────────────────────────────────────────────────

interface ReminderEmailData {
  displayName: string | null;
  morningItems: string[];
  afternoonItems: string[];
  eveningItems: string[];
  checkinUrl: string;
  unsubscribeUrl: string;
  appUrl: string;
  streak: number;
}

/** Returns the full HTML for the daily reminder email. */
export function buildReminderEmail(data: ReminderEmailData): string {
  const name = data.displayName?.split(' ')[0] ?? 'there';
  const appUrl = data.appUrl;

  const periodEmoji: Record<string, string> = {
    morning: '🌅',
    afternoon: '☀️',
    evening: '🌙',
  };

  function periodBlock(period: string, items: string[]): string {
    if (!items.length) return '';
    return `
      <div style="margin-bottom:20px;">
        <div style="font-size:13px;font-weight:700;color:#1C3A2E;text-transform:uppercase;
                    letter-spacing:0.08em;margin-bottom:10px;">
          ${periodEmoji[period]} ${period.charAt(0).toUpperCase() + period.slice(1)}
        </div>
        ${items.map((item) => `
          <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;
                      background:#FDFCFA;border:1px solid #E8E0D5;border-radius:12px;
                      margin-bottom:6px;">
            <span style="color:#4A7C59;font-weight:700;flex-shrink:0;margin-top:1px;">•</span>
            <span style="font-size:14px;color:#3D2E22;line-height:1.5;">${item}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  const streakLine = data.streak > 0
    ? `<p style="font-size:13px;color:#4A7C59;font-weight:600;margin:0 0 20px;text-align:center;">
         🔥 Day ${data.streak} streak. Don't break it now!
       </p>`
    : '';

  const hasAnyItems = data.morningItems.length || data.afternoonItems.length || data.eveningItems.length;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Your daily supplements</title>
</head>
<body style="margin:0;padding:0;background:#F0EBE3;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:24px 16px;">

    <div style="background:#F9F6F1;border-radius:24px;overflow:hidden;
                box-shadow:0 4px 24px rgba(28,58,46,0.10);">

      <div style="background:#1C3A2E;padding:28px 28px 20px;text-align:center;">
        <div style="font-size:44px;margin-bottom:8px;">🐱</div>
        <div style="font-family:Georgia,serif;font-size:22px;font-weight:300;
                    color:#F9F6F1;font-style:italic;line-height:1.3;">
          Hey ${name}, it's supplement time!
        </div>
        <div style="font-size:13px;color:rgba(249,246,241,0.6);margin-top:6px;">
          Your personalised daily schedule from Stacky
        </div>
      </div>

      <div style="padding:24px 24px 8px;">
        ${streakLine}

        ${hasAnyItems ? `
          ${periodBlock('morning', data.morningItems)}
          ${periodBlock('afternoon', data.afternoonItems)}
          ${periodBlock('evening', data.eveningItems)}
        ` : `
          <p style="font-size:14px;color:#6B5B4E;text-align:center;padding:16px 0;">
            Your stack is ready. Open the app to see your full plan.
          </p>
        `}
      </div>

      <div style="padding:8px 24px 28px;text-align:center;">
        <a href="${data.checkinUrl}"
           style="display:inline-block;background:#1C3A2E;color:#F9F6F1;
                  font-size:15px;font-weight:600;padding:15px 36px;
                  border-radius:100px;text-decoration:none;margin-bottom:12px;">
          ✓ Mark today as done
        </a>
        <div style="margin-top:10px;">
          <a href="${appUrl}/coach"
             style="font-size:13px;color:#4A7C59;text-decoration:none;font-weight:500;">
            Open Stacky →
          </a>
        </div>
      </div>

      <div style="background:#F0EBE3;padding:16px 24px;text-align:center;
                  border-top:1px solid #E8E0D5;">
        <p style="font-size:12px;color:#9C8E84;margin:0 0 6px;line-height:1.5;">
          You're getting this because you set a daily reminder in StackWise.<br/>
          Reminders are a Basic/Pro feature.
        </p>
        <a href="${appUrl}/dashboard"
           style="font-size:12px;color:#C4B9AC;text-decoration:underline;">
          Change or turn off reminders
        </a>
        &nbsp;&nbsp;·&nbsp;&nbsp;
        <a href="${data.unsubscribeUrl}"
           style="font-size:12px;color:#C4B9AC;text-decoration:underline;">
          Unsubscribe
        </a>
      </div>
    </div>

    <p style="text-align:center;font-size:11px;color:#C4B9AC;margin-top:16px;line-height:1.6;">
      StackWise · supplement guidance, not medical advice<br/>
      StackWise · 3101 Borgata Way · El Dorado Hills, CA 95762<br/>
      You are receiving this because you set a daily reminder in StackWise.
    </p>
  </div>
</body>
</html>`;
}

// ─── WIN-BACK EMAIL ──────────────────────────────────────────────────────────

interface WinBackEmailData {
  displayName: string | null;
  tier: string;
  appUrl: string;
}

export function buildWinBackEmail(data: WinBackEmailData): string {
  const name = data.displayName?.split(' ')[0] ?? 'there';
  const isProTier = data.tier === 'pro';
  const pricingUrl = `${data.appUrl}/pricing`;

  const valueLines = isProTier
    ? [
        'Unlimited Stacky questions — ask anything about your stack, any time',
        'Personalized plan synced across all your devices',
        'Unlimited stack rebuilds as your goals change',
        'Peptide and advanced protocol guidance',
        'Full dosing, timing, and form detail for every supplement',
        'Evaluates new products before you waste money on them',
      ]
    : [
        '20 Stacky questions per month',
        'Personalized plan synced across all your devices',
        'Unlimited stack rebuilds as your goals change',
        'Full dosing, timing, and form detail for every supplement',
        'Daily check-ins, streak tracking, and email reminders',
        'LooksMaxxing goal — skin, hair, face definition',
      ];

  const tierLabel = isProTier ? 'Pro' : 'Basic';
  const price = isProTier ? '$19/month' : '$9/month';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Your StackWise plan was cancelled</title>
</head>
<body style="margin:0;padding:0;background:#F0EBE3;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:24px 16px;">
    <div style="background:#F9F6F1;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(28,58,46,0.10);">
      <div style="background:#1C3A2E;padding:28px 28px 24px;text-align:center;">
        <div style="font-size:52px;margin-bottom:8px;">🐱</div>
        <div style="font-family:Georgia,serif;font-size:22px;font-weight:300;color:#F9F6F1;font-style:italic;line-height:1.3;margin-bottom:6px;">
          Hey ${name}, Stacky misses you already.
        </div>
        <p style="font-size:13px;color:rgba(249,246,241,0.55);margin:0;">
          Your ${tierLabel} plan was cancelled. Your stack is still here whenever you want it.
        </p>
      </div>
      <div style="padding:24px 28px;">
        <p style="font-size:14px;color:#3D2E22;line-height:1.6;margin:0 0 18px;">
          Here's what was included in your ${tierLabel} plan at ${price}:
        </p>
        <div style="margin-bottom:22px;">
          ${valueLines.map((item) => `
          <div style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid #F0EBE3;">
            <span style="color:#4A7C59;font-weight:700;flex-shrink:0;font-size:13px;margin-top:1px;">&#10003;</span>
            <span style="font-size:13px;color:#3D2E22;line-height:1.5;">${item}</span>
          </div>`).join('')}
        </div>
        <div style="background:#F0F5F2;border:1px solid #D4E8DA;border-radius:12px;padding:14px 16px;margin-bottom:22px;">
          <p style="font-size:13px;color:#1C3A2E;margin:0;line-height:1.6;">
            If you cancelled because something wasn't working — the plan didn't make sense, the guidance missed something, or you just weren't sure it was worth it — reply to this email and I'll sort it out personally.
          </p>
        </div>
        <div style="text-align:center;margin-bottom:20px;">
          <a href="${pricingUrl}"
            style="display:inline-block;background:#1C3A2E;color:#F9F6F1;font-size:15px;font-weight:600;padding:14px 36px;border-radius:100px;text-decoration:none;">
            Come back to StackWise &#8594;
          </a>
        </div>
        <p style="font-size:12px;color:#9C8E84;text-align:center;margin:0 0 8px;">
          Your stack is saved. Everything picks up exactly where you left it.
        </p>
      </div>
      <div style="background:#F0EBE3;padding:14px 28px;text-align:center;border-top:1px solid #E8E0D5;">
        <p style="font-size:12px;color:#9C8E84;margin:0 0 4px;line-height:1.5;">
          You received this because your StackWise ${tierLabel} subscription was cancelled.<br/>
          Questions? Reply to this email or contact
          <a href="mailto:stacky@stack-wise.org" style="color:#4A7C59;text-decoration:none;">stacky@stack-wise.org</a>
        </p>
        <p style="font-size:11px;color:#C4B9AC;margin:6px 0 0;">
          StackWise · 3101 Borgata Way · CA 95762
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
