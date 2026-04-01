import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StackyCat from '../components/StackyCat';
import { fetchAccountMe, signOut } from '../api/session';
import {
  getSubscription,
  getSubscriptionTier,
  hasEverPurchasedPlan,
  isBasicOrPro,
  isPro,
  loadStackArchive,
} from '../types/storage';
import { NavIcon } from '../copy/navWayfinding';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    void fetchAccountMe().then(({ user }) => setAccountEmail(user?.email ?? null));
  }, []);

  const tier = getSubscriptionTier();
  const pro = isPro();
  const paid = isBasicOrPro();
  const subRecord = getSubscription();
  const stackArchive = loadStackArchive();
  return (
    <div className="min-h-screen bg-cream text-warm max-w-lg mx-auto pb-24">
      <nav
        className="sticky top-0 z-40 px-5 border-b border-stone"
        style={{
          background: 'rgba(249,246,241,0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          paddingTop: 'max(14px, env(safe-area-inset-top, 14px))',
          paddingBottom: 14,
        }}
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/landing')}
            className="inline-flex items-center gap-1.5 font-serif font-light tracking-widest text-sm text-forest"
            style={{ letterSpacing: '0.15em' }}
          >
            <NavIcon kind="home" size={17} className="text-forest opacity-90" />
            <span>STACKWISE</span>
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-sm font-medium text-warm-light hover:text-forest transition-colors"
          >
            <span aria-hidden>←</span>
            <span>Back</span>
          </button>
        </div>
      </nav>

      <div className="p-6 pt-8">
        <h1 className="font-display text-2xl text-forest mb-6">Profile</h1>

        {accountEmail && (
          <div className="rounded-2xl border border-stone bg-white p-4 mb-6">
            <p className="text-sm text-warm-mid">
              Signed in as{' '}
              <span className="font-semibold text-forest">{accountEmail}</span>
            </p>
            <button
              type="button"
              disabled={signingOut}
              onClick={() => {
                setSigningOut(true);
                void (async () => {
                  await signOut();
                  setSigningOut(false);
                  const { user } = await fetchAccountMe();
                  setAccountEmail(user?.email ?? null);
                })();
              }}
              className="mt-3 text-sm font-semibold text-forest underline underline-offset-2 disabled:opacity-50"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        )}

        <div className="text-sm mb-6 text-warm-mid space-y-1">
          <p>
            Plan: <span className="font-semibold capitalize text-warm">{tier}</span>
          </p>
          {subRecord && (
            <p className="text-xs text-warm-light">
              Active since {new Date(subRecord.activatedAt).toLocaleDateString()} · ref{' '}
              <span className="font-mono tabular-nums">{subRecord.subscriptionId.slice(-8)}</span>
            </p>
          )}
          {!subRecord && hasEverPurchasedPlan() && (
            <p className="text-xs text-warm-light">This device had a paid plan before; resubscribe to restore perks.</p>
          )}
        </div>

        {paid && (
          <div className="rounded-2xl border border-stone bg-white p-5 mb-6">
            <div className="text-xs font-semibold uppercase tracking-widest mb-2 text-moss">Saved previous stacks</div>
            <p className="text-xs text-warm-mid leading-relaxed mb-3">
              Each time you generate a new plan (Basic or Pro), your prior stack is kept here on this device, up to the 15 most recent.
            </p>
            {stackArchive.length === 0 ? (
              <p className="text-sm text-warm-light">No archived stacks yet. Rebuild from Results or Stack Hub to save your first one.</p>
            ) : (
              <ul className="space-y-2">
                {stackArchive.map((a) => {
                  const goals = a.quiz?.primaryGoals?.slice(0, 3).join(', ') ?? 'Quiz snapshot';
                  return (
                    <li
                      key={a.id}
                      className="rounded-xl border border-stone/80 bg-cream/40 px-3 py-2 text-xs text-warm-mid"
                    >
                      <div className="font-semibold text-forest">{a.label}</div>
                      <div className="mt-0.5 line-clamp-2">{goals}</div>
                      <div className="text-[10px] text-warm-light mt-1 tabular-nums">{a.savedAt.slice(0, 10)}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {pro ? (
        <div className="rounded-2xl border border-stone bg-white p-5 mb-6">
          <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-moss">
            Pro · Stacky look
          </div>
          <p className="text-sm leading-relaxed mb-4 text-warm-mid">
            Pro now includes Stacky in his signature shiny gold cowboy hat everywhere in the app. It turns on automatically.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex justify-center sm:justify-start flex-shrink-0">
              <StackyCat mood="wave" size={112} />
            </div>
            <p className="text-sm font-medium text-forest">
              Always on in Pro.
            </p>
          </div>
          <p className="text-xs text-warm-light mt-3">
            You will see the gold hat in quiz steps, chat, results, and all other Stacky appearances.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-stone bg-[#FDFCFA] p-5 mb-6">
          <div className="text-xs font-semibold uppercase tracking-widest mb-2 text-warm-light">
            Pro perk
          </div>
          <p className="text-sm leading-relaxed text-warm-mid">
            <span className="font-semibold text-warm">StackWise Pro</span> gives Stacky a shiny gold cowboy hat across the app, on automatically.{' '}
            <button
              type="button"
              onClick={() => navigate('/pricing')}
              className="font-semibold underline underline-offset-2 text-forest hover:text-forest-light"
            >
              View Pro
            </button>
          </p>
        </div>
        )}
      </div>
    </div>
  );
}
