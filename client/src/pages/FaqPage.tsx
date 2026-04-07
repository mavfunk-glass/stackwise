import { useNavigate } from 'react-router-dom';
import StackyCat from '../components/StackyCat';
import { NavIcon } from '../copy/navWayfinding';

export default function FaqPage() {
  const navigate = useNavigate();

  const faqs: { q: string; a: string }[] = [
    {
      q: 'Is this actual medical advice?',
      a: 'No. StackWise provides AI-generated educational recommendations only. Always consult a qualified healthcare provider before starting or changing a supplement routine. If you are considering peptides, discuss that with a licensed clinician first.',
    },
    {
      q: 'How is Stacky trained?',
      a: "Think of Stacky as your guide through supplement questions, focused on clarity and your situation, not generic hype. It stays in evidence-based guidance on dosing, timing, and safety, and it reads your intake, goals, symptoms, health history, medications, and budget, before answering. It does not free-roam the internet or guess outside that domain. Peptide education can be discussed when relevant, but it is not the center of the platform.",
    },
    {
      q: 'Can I cancel anytime?',
      a: 'Yes. If you subscribed with PayPal: Settings → Payments → Manage pre-approved payments → StackWise → Cancel. If you subscribed with Stripe, use the manage/cancel link in your Stripe receipt email or the Stripe Customer Portal from that email. You keep access until the end of your current billing period. No fees, no penalties.',
    },
    {
      q: 'What is the 7-day fit guarantee?',
      a: "If StackWise isn't the right fit within your first 7 days (the plan doesn't make sense, the guidance isn't useful), email stacky@stack-wise.org for a full refund. This covers fit and clarity, not supplement outcomes (those depend on the supplements and take weeks).",
    },
    {
      q: 'What makes Stacky different from ChatGPT?',
      a: "Stacky knows your specific plan: what you were recommended, why, and how it fits your goals. Generic AI gives generic answers. Stacky gives guidance built around your actual stack and what you told us about your life.",
    },
    {
      q: 'Are peptide protocols legal?',
      a: 'Some peptides, such as BPC-157 and TB-500, are often sold as research chemicals in many countries and are not FDA-approved for these uses. StackWise only provides educational guidance. Always talk to a qualified physician before starting any peptide plan.',
    },
  ];

  return (
    <div className="min-h-screen bg-sw-bg text-warm">
      <div
        className="sticky top-0 z-40 px-5 border-b border-stone sw-sticky-nav"
        style={{
          paddingTop: `max(14px, env(safe-area-inset-top, 14px))`,
          paddingBottom: '14px',
        }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/landing')}
            className="inline-flex items-center gap-1.5 font-serif font-light tracking-widest text-sm text-ink"
            style={{ letterSpacing: '0.15em' }}
          >
            <NavIcon kind="home" size={17} className="text-ink opacity-90" />
            <span>STACKWISE</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/pricing')}
            className="inline-flex items-center gap-1.5 rounded-full text-xs font-semibold px-4 py-1.5 bg-forest text-on-dark-primary hover:bg-forest-light"
          >
            <NavIcon kind="pricing" size={15} className="text-on-dark-primary opacity-95" />
            <span>Pricing</span>
          </button>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-5 pb-nav">
        <section className="pt-8 pb-6">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 16 }}>
            <StackyCat
              mood="think"
              outfit="graduation"
              size={72}
              bubble="Great questions. Let me explain. 🐾"
              bubblePosition="top"
              topBubbleReservePx={96}
            />
            <div className="min-w-0 flex-1">
              <div className="quiz-label mb-3 text-warm-light">
                Common questions
              </div>
              <h1 className="quiz-headline mb-2">How StackWise and Stacky work.</h1>
              <p className="quiz-sub">
                A quick reference on safety, training, and what to expect from Stacky, your guide through supplement confusion, with answers grounded in your goals and your plan.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3 mb-10">
          {faqs.map((item) => (
            <article key={item.q} className="rounded-2xl p-4 bg-white border border-stone">
              <h2 className="font-semibold text-sm mb-1.5 text-ink">{item.q}</h2>
              <p className="text-xs leading-relaxed text-warm-mid">{item.a}</p>
            </article>
          ))}
        </section>
        <section className="rounded-2xl p-5 mb-10 bg-forest">
          <div className="font-serif font-light text-lg mb-1 text-on-dark-primary italic">
            Still have a question?
          </div>
          <p className="text-sm mb-4 text-on-dark-muted">
            Billing, refund requests, data deletion, or anything else - email us directly.
          </p>
          <a
            href="mailto:stacky@stack-wise.org"
            className="inline-block rounded-full font-semibold text-sm px-5 py-2.5 transition-opacity hover:opacity-90 bg-[#F9F6F1] text-[#1C3A2E] dark:bg-surface-elevated dark:text-warm dark:border dark:border-stone/90"
          >
            stacky@stack-wise.org
          </a>
        </section>
      </main>
    </div>
  );
}

