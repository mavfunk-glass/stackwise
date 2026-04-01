/**
 * Email sending via Resend (resend.com).
 * Set RESEND_API_KEY and RESEND_FROM_EMAIL in your .env.
 * Without RESEND_API_KEY, all sends are logged to console (dev mode).
 */

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'stacky@stackwise.app';

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
      const err = (await res.json().catch(() => ({}))) as { message?: string };
      console.error('[email] Resend error:', err.message ?? res.status);
      return { ok: false, error: err.message ?? 'Send failed' };
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
      </div>
    </div>

    <p style="text-align:center;font-size:11px;color:#C4B9AC;margin-top:16px;">
      StackWise · supplement guidance, not medical advice
    </p>
  </div>
</body>
</html>`;
}
