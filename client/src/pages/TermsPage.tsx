import { useNavigate } from 'react-router-dom';

export default function TermsPage() {
  const navigate = useNavigate();

  const sections = [
    {
      title: 'Acceptance of Terms',
      body: 'By using StackWise, you agree to these Terms of Service. If you do not agree, please do not use the service.',
    },
    {
      title: 'Educational Use Only',
      body: 'StackWise provides AI-generated supplement recommendations for educational and informational use only. This is not medical advice.',
    },
    {
      title: 'Subscriptions and Payments',
      body: 'Subscriptions are billed monthly via PayPal. You may cancel any time from your PayPal account. Pricing may be updated with notice.',
    },
    {
      title: 'Limitation of Liability',
      body: 'StackWise is not responsible for health outcomes resulting from AI-generated recommendations. Consult healthcare professionals before changes.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button type="button" onClick={() => navigate('/landing')} className="font-display font-bold text-xl text-navy">Stack<span className="text-lime">Wise</span></button>
          <button onClick={() => navigate('/landing')} className="text-sm text-slate-500 hover:text-navy">Home</button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-4xl font-display font-extrabold text-navy">Terms of Service</h1>
        <p className="text-sm text-slate-500 mt-2 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-4">
          {sections.map((section, idx) => (
            <section key={section.title} className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-display font-bold text-xl text-navy">{idx + 1}. {section.title}</h2>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
