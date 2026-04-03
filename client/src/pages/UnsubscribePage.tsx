import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import StackyCat from '../components/StackyCat';
import { apiAuthHeaders, ensureApiSession } from '../api/session';

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Invalid unsubscribe link. Please turn off reminders from the Dashboard instead.');
      return;
    }

    async function unsubscribe() {
      try {
        await ensureApiSession();
        const res = await fetch('/api/account/unsubscribe', {
          method: 'POST',
          headers: await apiAuthHeaders(),
          body: JSON.stringify({ token }),
        });
        if (res.ok) {
          setStatus('done');
          setMessage("Done - you've been unsubscribed from daily supplement reminders.");
        } else {
          const data = (await res.json()) as { error?: string };
          setStatus('error');
          setMessage(data.error ?? 'This unsubscribe link has expired. Please turn off reminders from the Dashboard.');
        }
      } catch {
        setStatus('error');
        setMessage('Something went wrong. Please turn off reminders from your Dashboard.');
      }
    }

    void unsubscribe();
  }, [params]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-sw-bg text-warm">
      <div className="text-center max-w-[340px]">
        <StackyCat
          mood={status === 'error' ? 'sad' : status === 'done' ? 'wave' : 'think'}
          size={90}
          animate={status === 'loading'}
        />
        <div
          className="font-serif font-light mt-5 mb-3 text-2xl text-ink italic tracking-tight"
        >
          {status === 'loading' && 'One moment...'}
          {status === 'done' && 'Unsubscribed.'}
          {status === 'error' && 'Link expired.'}
        </div>
        <p className="text-sm leading-relaxed mb-6 text-warm-light">
          {status === 'loading' ? 'Removing your reminder...' : message}
        </p>
        {status !== 'loading' && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-primary"
              style={{ height: 46, maxWidth: 260, margin: '0 auto' }}
            >
              Go to Dashboard
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-xs text-stone dark:text-warm-light"
            >
              Back to home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
