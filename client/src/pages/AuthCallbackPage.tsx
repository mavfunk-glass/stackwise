import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StackyCat from '../components/StackyCat';
import { getSupabase } from '../lib/supabase';

/**
 * Supabase Auth redirects here after email magic link (PKCE). Session is recovered from the URL automatically.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Signing you in…');
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setMessage('Sign-in is not configured.');
      window.setTimeout(() => navigate('/', { replace: true }), 1600);
      return;
    }

    const search = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const oauthErr = search.get('error') ?? hashParams.get('error');
    const oauthDesc = search.get('error_description') ?? hashParams.get('error_description');
    if (oauthErr) {
      const decoded = oauthDesc ? decodeURIComponent(oauthDesc.replace(/\+/g, ' ')) : oauthErr;
      setMessage(`Sign-in did not complete: ${decoded}`);
      setHint(
        'In Supabase: Authentication → URL Configuration, set Site URL to http://localhost:5173 (your app, not the .supabase.co URL). Add http://localhost:5173/auth/callback to Redirect URLs. Then request a new link.',
      );
      window.setTimeout(() => navigate('/', { replace: true }), 12000);
      return;
    }

    void sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setMessage('You are in. Redirecting…');
        window.setTimeout(() => navigate('/coach', { replace: true }), 400);
        return;
      }
      setMessage('Could not complete sign-in. Try the link again or request a new one.');
      setHint(
        'Confirm Redirect URLs in Supabase include http://localhost:5173/auth/callback (and http://127.0.0.1:5173/auth/callback if you use that host).',
      );
      window.setTimeout(() => navigate('/', { replace: true }), 5000);
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-sw-bg">
      <StackyCat mood="think" size={100} />
      <p className="mt-6 text-sm text-warm-mid text-center max-w-sm">{message}</p>
      {hint && (
        <p className="mt-4 text-xs text-warm-light text-center max-w-md leading-relaxed">{hint}</p>
      )}
    </div>
  );
}
