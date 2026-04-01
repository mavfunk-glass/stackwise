import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import StackyCat from '../components/StackyCat';
import { verifyMagicToken, restoreStackFromServer } from '../api/session';
import { saveQuiz, saveResult } from '../types/storage';
import type { IntakePayload, GeminiResult } from '../types/stackwise';

export default function MagicVerifyPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'restoring' | 'done' | 'error'>('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setError('No token found in the link. Please request a new one.');
      setStatus('error');
      return;
    }

    async function verify() {
      const result = await verifyMagicToken(token!);
      if (!result.ok) {
        setError(result.error ?? 'This link has expired. Please request a new one.');
        setStatus('error');
        return;
      }

      setStatus('restoring');
      const restored = await restoreStackFromServer();
      if (restored.stack?.result) {
        if (restored.stack.quiz) saveQuiz(restored.stack.quiz as IntakePayload);
        saveResult(restored.stack.result as GeminiResult);
        setStatus('done');
        setTimeout(() => navigate('/coach', { replace: true }), 1200);
      } else {
        setStatus('done');
        setTimeout(() => navigate('/', { replace: true }), 1200);
      }
    }

    void verify();
  }, [params, navigate]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#F9F6F1' }}
    >
      <div style={{ textAlign: 'center', maxWidth: 340 }}>
        <StackyCat
          mood={status === 'error' ? 'sad' : status === 'done' ? 'celebrate' : 'think'}
          outfit={status === 'done' ? 'party' : 'labCoat'}
          size={110}
          animate={status !== 'error'}
        />

        <div
          className="font-serif font-light mt-6 mb-2"
          style={{ fontSize: 26, color: '#1C3A2E', letterSpacing: '-0.01em', fontStyle: 'italic' }}
        >
          {status === 'verifying' && 'Verifying your link…'}
          {status === 'restoring' && 'Restoring your stack…'}
          {status === 'done' && "You're in! Taking you there now."}
          {status === 'error' && 'Link expired or already used.'}
        </div>

        {status === 'error' && (
          <>
            <p className="text-sm mb-6" style={{ color: '#9C8E84', lineHeight: 1.6 }}>
              {error}
            </p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-primary"
              style={{ maxWidth: 240, margin: '0 auto', height: 48 }}
            >
              Back to StackWise
            </button>
          </>
        )}

        {(status === 'verifying' || status === 'restoring') && (
          <p className="text-sm mt-2" style={{ color: '#9C8E84' }}>
            {status === 'verifying' ? 'One moment…' : 'Getting your plan…'}
          </p>
        )}
      </div>
    </div>
  );
}
