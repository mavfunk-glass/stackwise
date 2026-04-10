# Email sign-in links — simple checklist

StackWise can email users a **one-click link** to save their stack and sign in. That email is sent by your **server** using a service called **Resend** (like “send email for apps”).

If people see errors about a **missing API key** or **email not sending**, almost always the server is missing the Resend key or the key is wrong.

---

## Part A — What you need (one time)

1. A **Resend** account: [https://resend.com](https://resend.com) (free tier is fine to start).
2. A **domain** you control (e.g. `stack-wise.org`) added in Resend → **Domains**, with the DNS records they show you, until Resend says the domain is **verified**.
3. An email address **on that domain** for “from” (e.g. `stacky@yourdomain.com`). Resend will reject random Gmail addresses as the sender for production.

---

## Part B — What to paste in your hosting (Railway, etc.)

On the **server** side (same place you set `GEMINI_API_KEY` and `PORT`), add:

| Name | What it is |
|------|------------|
| `RESEND_API_KEY` | From Resend → **API Keys**. Starts with `re_`. |
| `RESEND_FROM_EMAIL` | The “from” address, must use your **verified** domain in Resend. |
| `APP_URL` | Your live site URL, e.g. `https://www.yourdomain.com` (no trailing slash). Used inside the link in the email. |
| `CLIENT_URL` | Usually the **same** as `APP_URL` if the site and API are one deployment. If the website and API are different URLs, set `CLIENT_URL` to where users **open the app in the browser**. |

Then **save** and **redeploy** the server so the new variables load.

---

## Part C — Check that it worked

After deploy, open this in your browser (use **your real site URL**):

**`https://YOUR-SITE/health/email`**

Example: `https://your-app.up.railway.app/health/email`

You should see JSON like:

```json
{ "resendConfigured": true, "message": "..." }
```

- If `resendConfigured` is **false**, the server still does not see `RESEND_API_KEY` — fix the env var name, value, and redeploy.
- If it is **true**, try “Send link” again on the site with your own email.

---

## Part D — If you use both Supabase and Resend

If the **website build** includes `VITE_SUPABASE_*` **and** your **server** has `RESEND_API_KEY`, the app now **prefers Resend** for sign-in emails whenever `/health/email` reports Resend is configured (so you usually do not need to remove Supabase vars).

To **force** one path only: set **`VITE_MAGIC_LINK_VIA=resend`** or **`supabase`** in `client/.env` and rebuild.

---

## Works on localhost but not on the live site

Local dev uses Vite’s **proxy**: the browser calls `/api` on port 5173 and Vite forwards to the API. **Production does not do that automatically.**

1. **Same host for app + API (one Railway service, or one domain)**  
   Leave **`VITE_API_BASE_URL` unset** in the client build. The browser should load the app from the same origin that serves `/api`.

2. **Website on Host A, API on Host B (split deploy)**  
   When you run `npm run build` for the client, set **`VITE_API_BASE_URL=https://YOUR-API-ORIGIN`** (no trailing slash). Example: `https://stackwise-production.up.railway.app`.  
   Rebuild the client and redeploy the static files. If this is missing, the live site tries to call `/api` on the **wrong** host and nothing works.

3. **CORS / wrong domain**  
   **`CLIENT_URL`** on the server must match the URL people type in the browser (scheme + host), or use **both** apex and www:  
   `CLIENT_URL=https://yoursite.com,https://www.yoursite.com`

4. **Check the API directly**  
   Open **`https://YOUR-API-ORIGIN/health/live`** — you should see JSON with `nodeEnv`, `resendConfigured`, `publicAppOrigin`, etc. Use that to confirm env vars on the server.

---

## Still stuck?

- **Spam folder** — have the user check spam for the first email.
- **Wrong “from” domain** — Resend shows an error if `RESEND_FROM_EMAIL` is not on a verified domain.
- **Local testing without Resend** — if `RESEND_API_KEY` is not set, the **server console** prints the magic link instead of emailing (dev mode).

For more detail, see comments in the repo root **`.env.example`** and **`client/.env.example`**.
