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
      a: 'Yes. You can cancel directly from your PayPal account. You keep access until the end of your billing period. No fees and no hoops.',
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
    <div className="min-h-screen" style={{ background: '#F9F6F1' }}>
      <div
        className="sticky top-0 z-40 px-5"
        style={{
          background: 'rgba(249,246,241,0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          paddingTop: `max(14px, env(safe-area-inset-top, 14px))`,
          paddingBottom: '14px',
          borderBottom: '1px solid #E8E0D5',
        }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/landing')}
            className="inline-flex items-center gap-1.5 font-serif font-light tracking-widest text-sm"
            style={{ color: '#1C3A2E', letterSpacing: '0.15em' }}
          >
            <NavIcon kind="home" size={17} className="text-forest opacity-90" />
            <span>STACKWISE</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/pricing')}
            className="inline-flex items-center gap-1.5 rounded-full text-xs font-semibold px-4 py-1.5"
            style={{ background: '#1C3A2E', color: '#F9F6F1' }}
          >
            <NavIcon kind="pricing" size={15} className="text-cream opacity-95" />
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
              <div className="quiz-label mb-3" style={{ color: '#9C8E84' }}>
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
            <article
              key={item.q}
              className="rounded-2xl p-4"
              style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}
            >
              <h2 className="font-semibold text-sm mb-1.5" style={{ color: '#1C3A2E' }}>
                {item.q}
              </h2>
              <p className="text-xs leading-relaxed" style={{ color: '#6B5B4E' }}>
                {item.a}
              </p>
            </article>
          ))}
        </section>
        <section className="rounded-2xl p-5 mb-10" style={{ background: '#1C3A2E' }}>
          <div className="font-serif font-light text-lg mb-1" style={{ color: '#F9F6F1', fontStyle: 'italic' }}>
            Still have a question?
          </div>
          <p className="text-sm mb-4" style={{ color: 'rgba(249,246,241,0.7)' }}>
            Billing, refund requests, data deletion, or anything else - email us directly.
          </p>
          <a
            href="mailto:healthpro@stackdsup.com"
            className="inline-block rounded-full font-semibold text-sm px-5 py-2.5 transition-opacity hover:opacity-90"
            style={{ background: '#F9F6F1', color: '#1C3A2E' }}
          >
            healthpro@stackdsup.com
          </a>
        </section>
      </main>
    </div>
  );
}

