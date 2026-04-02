import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StackyCat from '../components/StackyCat';
import { isPro } from '../types/storage';
import { NavIcon } from '../copy/navWayfinding';

type Protocol = {
  id: string;
  category: 'peptide' | 'cycle' | 'stack';
  name: string;
  tagline: string;
  goal: string;
  overview: string;
  protocol: string;
  caution: string;
  proOnly: boolean;
};

const PROTOCOLS: Protocol[] = [
  {
    id: 'bpc157',
    category: 'peptide',
    name: 'BPC-157',
    tagline: 'The healing peptide. Tissue repair, gut health, tendon recovery.',
    goal: 'Recovery & Injury',
    overview: 'Body Protection Compound 157 is a synthetic peptide derived from a protein in gastric juice. It has remarkable regenerative properties, accelerating healing of tendons, ligaments, muscles, and gut lining. Widely used by athletes for injury recovery and by biohackers for gut repair.',
    protocol: 'Dose: 250-500mcg per day\nForm: Subcutaneous injection or nasal spray\nTiming: Once daily, morning or post-workout\nCycle: 4-12 weeks on, 4 weeks off\nStorage: Refrigerate reconstituted peptide',
    caution: 'Research is primarily animal-based. Not FDA-approved. Source from reputable research peptide suppliers only. Consult a physician if you have a history of cancer, BPC-157 promotes growth factors.',
    proOnly: true,
  },
  {
    id: 'tb500',
    category: 'peptide',
    name: 'TB-500 (Thymosin Beta-4)',
    tagline: 'Systemic healing and flexibility. A full-body recovery approach.',
    goal: 'Recovery & Flexibility',
    overview: 'TB-500 is a synthetic version of Thymosin Beta-4, a naturally occurring peptide found in nearly all human cells. Unlike BPC-157 which is more localised, TB-500 promotes systemic healing, reducing inflammation throughout the body, improving flexibility, and accelerating recovery from chronic injuries.',
    protocol: 'Dose: 2-2.5mg twice per week (loading), 2mg once per week (maintenance)\nForm: Subcutaneous or intramuscular injection\nCycle: 4-6 weeks loading, then maintenance as needed\nStack: Commonly stacked with BPC-157 for enhanced recovery',
    caution: 'Not FDA-approved. Use research-grade only. Not recommended if you have a history of cancer due to angiogenic properties. Discontinue 2 weeks before any surgery.',
    proOnly: true,
  },
  {
    id: 'ipamorelin',
    category: 'peptide',
    name: 'Ipamorelin + CJC-1295',
    tagline: 'Growth hormone optimisation. Sleep, body composition, anti-aging.',
    goal: 'Anti-aging & Body Composition',
    overview: 'Ipamorelin is a selective GH secretagogue, it triggers pulsatile growth hormone release without the cortisol and prolactin spikes of older peptides. Combined with CJC-1295 (a GHRH analogue), it creates a sustained GH pulse that improves sleep quality, body composition, recovery, and skin health.',
    protocol: 'Ipamorelin: 200-300mcg\nCJC-1295 (no DAC): 100-200mcg\nTiming: Before bed on an empty stomach (2h after last meal)\nCycle: 3 months on, 1 month off\nFrequency: 5 days on, 2 days off',
    caution: 'Avoid if you have active cancer or tumours. Can cause transient water retention. Blood glucose monitoring recommended for diabetics. Not suitable during pregnancy.',
    proOnly: true,
  },
  {
    id: 'nad',
    category: 'peptide',
    name: 'NAD+ IV / NMN Stack',
    tagline: 'Cellular energy and longevity. The anti-aging foundation.',
    goal: 'Longevity & Energy',
    overview: 'NAD+ (Nicotinamide Adenine Dinucleotide) declines ~50% by age 40 and is central to DNA repair, mitochondrial function, and sirtuin activation. IV NAD+ provides the most direct repletion; oral NMN/NR is a practical daily alternative. This is the most evidence-backed longevity intervention currently available outside of caloric restriction.',
    protocol: 'Oral plan: NMN 500mg AM + Trans-Resveratrol 500mg with fat\nIV plan: 500mg-1000mg NAD+ IV over 2-4 hours, monthly\nCycle: No cycling required for oral. IV as needed or quarterly.\nSynergy: Add Apigenin 50mg nightly to inhibit CD38 (NAD consumer)',
    caution: 'IV NAD+ can cause significant discomfort during infusion (nausea, tightening). Start low. Oral is safer and still effective for most people.',
    proOnly: true,
  },
  {
    id: 'ashwagandha-cycle',
    category: 'cycle',
    name: 'Ashwagandha Cycling Plan',
    tagline: 'Maximum cortisol benefits without receptor downregulation.',
    goal: 'Stress & Hormones',
    overview: 'Ashwagandha (KSM-66) is highly effective for cortisol reduction and testosterone support, but continuous daily use leads to diminishing returns as the HPA axis adapts. Cycling maintains sensitivity and effectiveness long-term.',
    protocol: '8 weeks on: 600mg KSM-66 daily with food\n4 weeks off: Replace with Rhodiola Rosea 400mg (different mechanism)\nRepeat indefinitely\nNote: Effects are most pronounced in weeks 3-6. Many users report the best results in the second and third cycle.',
    caution: 'Do not combine with thyroid medication without physician supervision. Discontinue 2 weeks before surgery.',
    proOnly: false,
  },
  {
    id: 'creatine-load',
    category: 'cycle',
    name: 'Creatine Loading Plan',
    tagline: 'Saturate faster for immediate strength and cognitive gains.',
    goal: 'Muscle & Brain',
    overview: 'The standard 3-5g/day plan takes 4 weeks to saturate muscle creatine stores. The loading plan saturates stores in 5-7 days, delivering strength, power, and cognitive benefits weeks earlier.',
    protocol: 'Loading phase (5-7 days): 20g/day in 4 x 5g doses with meals\nMaintenance: 3-5g/day indefinitely\nNo cycling required, creatine is safe for continuous use\nStack with: Magnesium and electrolytes to minimise cramping during loading',
    caution: 'Expect 1-3kg weight gain from water retention during loading. Increase water intake significantly. Not required for cognitive benefits, 3g/day works equally well for the brain.',
    proOnly: false,
  },
  {
    id: 'berberine-cycle',
    category: 'cycle',
    name: 'Berberine Cycling Plan',
    tagline: 'Preserve gut microbiome diversity while maximising metabolic benefits.',
    goal: 'Metabolic Health',
    overview: 'Berberine is one of the most effective natural metabolic interventions, comparable to metformin for blood sugar regulation. However, continuous use disrupts gut microbiome diversity. Cycling maintains effectiveness while protecting the microbiome.',
    protocol: '8 weeks on: 500mg 3x/day with meals\n4 weeks off: Replace with Inositol 2g/day + Chromium Picolinate 400mcg\nRepeat. Monitor blood glucose if diabetic, berberine is genuinely strong.\nStack: Combine with Alpha-Lipoic Acid for enhanced insulin sensitivity',
    caution: 'Can cause significant GI distress initially, start with 1x/day and titrate up. Never combine with diabetes medications without physician oversight. Strong drug interactions with CYP3A4 substrates.',
    proOnly: false,
  },
  {
    id: 'whats-next-90',
    category: 'stack',
    name: '"What\'s Next", 90-Day Plan Evolution',
    tagline: 'You\'ve completed your first 90 days. Here\'s how to advance.',
    goal: 'Protocol Evolution',
    overview: 'The first 90 days establishes your foundation. Most supplements take 4-12 weeks to show full effects. After 90 days, you\'re ready to assess, optimise, and layer in more advanced interventions. This guide walks you through the evaluation and next-phase planning process.',
    protocol: 'Week 13-14: Assessment\n,  Which symptoms have improved?\n,  Which haven\'t moved?\n,  Are there new goals?\n\nWeek 14-15: Refinement\n,  Remove supplements that showed no benefit\n,  Increase dose on clear responders\n,  Add 1-2 new targeted interventions\n\nWeek 16+: Advanced layer\n,  Consider cycling plans for adapted supplements\n,  Explore peptide options if recovery/composition is a goal\n,  Reassess with Stacky',
    caution: 'Use Stacky to walk through this process personalized to your specific results and current stack. General timelines may vary based on individual response.',
    proOnly: false,
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  peptide: 'Peptide Guidance',
  cycle: 'Cycling Guides',
  stack: 'Advanced Stacks',
};

export default function ProtocolLibraryPage() {
  const navigate = useNavigate();
  const pro = isPro();
  const [selected, setSelected] = useState<Protocol | null>(null);
  const [filter, setFilter] = useState<'all' | 'peptide' | 'cycle' | 'stack'>('all');

  const filtered = PROTOCOLS.filter((p) => filter === 'all' || p.category === filter);

  return (
    <div className="min-h-screen" style={{ background: '#F9F6F1' }}>

      {/* Nav */}
      <div
        className="sticky top-0 z-40 px-5"
        style={{
          background: 'rgba(249,246,241,0.95)',
          backdropFilter: 'blur(12px)',
          paddingTop: 'max(14px, env(safe-area-inset-top, 14px))',
          paddingBottom: 14,
          borderBottom: '1px solid #E8E0D5',
        }}
      >
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          <button
            onClick={() => navigate('/landing')}
            className="inline-flex items-center gap-1.5 font-serif font-light tracking-widest text-sm"
            style={{ color: '#1C3A2E', letterSpacing: '0.15em' }}
          >
            <NavIcon kind="home" size={17} className="text-forest opacity-90" />
            <span>STACKWISE</span>
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1 text-xs font-medium"
            style={{ color: '#9C8E84' }}
          >
            <NavIcon kind="daily" size={15} className="text-warm-mid opacity-90" />
            <span>Daily</span>
          </button>
        </div>
      </div>

      {/* Protocol detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4" style={{ background: 'rgba(28,58,46,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden" style={{ background: '#F9F6F1', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="sticky top-0 flex items-center justify-between px-5 py-4" style={{ background: 'rgba(249,246,241,0.95)', borderBottom: '1px solid #E8E0D5' }}>
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9C8E84' }}>{CATEGORY_LABELS[selected.category]}</div>
                <div className="font-serif font-light text-xl mt-0.5" style={{ color: '#1C3A2E' }}>{selected.name}</div>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#F0EBE3', color: '#6B5B4E', fontSize: 18 }}>✕</button>
            </div>
            <div className="px-5 py-5 space-y-5">
              <p className="text-sm leading-relaxed" style={{ color: '#6B5B4E' }}>{selected.overview}</p>
              <div className="rounded-2xl p-4" style={{ background: '#1C3A2E' }}>
                <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(249,246,241,0.8)' }}>Plan</div>
                <pre className="text-sm font-sans leading-relaxed whitespace-pre-wrap" style={{ color: '#F9F6F1', fontFamily: 'Figtree, system-ui, sans-serif' }}>{selected.protocol}</pre>
              </div>
              <div className="rounded-2xl p-4" style={{ background: '#FDF6EE', border: '1px solid #F0D9BE' }}>
                <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#8A5C2E' }}>⚠ Important cautions</div>
                <p className="text-xs leading-relaxed" style={{ color: '#8A5C2E' }}>{selected.caution}</p>
              </div>
              <button
                onClick={() => { setSelected(null); navigate('/results'); }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full font-semibold text-sm"
                style={{ background: '#1C3A2E', color: '#F9F6F1', height: 50 }}
              >
                <NavIcon kind="stack" size={17} className="text-cream opacity-95" />
                <span>Ask Stacky about this plan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-5 pt-6 pb-12">
        <div className="mb-6">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 8 }}>
            <StackyCat
              mood="think"
              outfit="wizard"
              size={72}
              bubble="Advanced territory. Stacky's got the map. 🐾"
              bubblePosition="right"
            />
            <div>
              <h1 className="font-serif font-light" style={{ fontSize: 30, color: '#1C3A2E', letterSpacing: '-0.01em' }}>Guidance Library</h1>
              <p className="text-sm mt-1" style={{ color: '#9C8E84' }}>Advanced supplement education for serious users.</p>
              <div className="mt-3 rounded-xl px-4 py-3" style={{ background: '#FDF6EE', border: '1px solid #F0D9BE' }}>
                <p className="text-xs leading-relaxed" style={{ color: '#8A5C2E', lineHeight: 1.6 }}>
                  <strong>Educational content only.</strong> Peptides and advanced compounds described here are research chemicals not approved by the FDA for the uses discussed. Nothing on this page constitutes medical advice, diagnosis, or treatment. Always consult a licensed physician before starting any peptide or advanced supplement protocol. StackWise is not liable for health outcomes resulting from use of this information.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {(['all', 'peptide', 'cycle', 'stack'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="flex-shrink-0 px-4 rounded-full text-xs font-semibold transition-all"
              style={{
                height: 34,
                background: filter === f ? '#1C3A2E' : '#F0EBE3',
                color: filter === f ? '#F9F6F1' : '#6B5B4E',
                border: 'none',
              }}
            >
              {f === 'all' ? 'All' : CATEGORY_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Protocol cards */}
        <div className="space-y-3">
          {filtered.map((p) => {
            const locked = p.proOnly && !pro;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => locked ? navigate('/pricing') : setSelected(p)}
                className="w-full text-left rounded-2xl p-4 transition-all active:scale-[0.99]"
                style={{ background: '#FFFFFF', border: '1px solid #E8E0D5' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: p.category === 'peptide' ? '#F0F5F2' : p.category === 'cycle' ? '#FDF6EE' : '#F0EBE3', color: p.category === 'peptide' ? '#1C3A2E' : p.category === 'cycle' ? '#8A5C2E' : '#6B5B4E' }}>
                        {CATEGORY_LABELS[p.category]}
                      </span>
                      {locked && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#1C3A2E', color: '#F9F6F1' }}>Pro</span>
                      )}
                    </div>
                    <div className="font-semibold text-sm mb-0.5" style={{ color: '#1C3A2E' }}>{p.name}</div>
                    <div className="text-xs leading-snug" style={{ color: '#9C8E84' }}>{p.tagline}</div>
                    <div className="mt-2 text-xs font-medium" style={{ color: '#4A7C59' }}>Goal: {p.goal}</div>
                  </div>
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: locked ? '#F0EBE3' : '#F0F5F2' }}>
                    <span style={{ color: locked ? '#C4B9AC' : '#1C3A2E', fontSize: 14 }}>{locked ? '🔒' : '→'}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Pro upsell */}
        {!pro && (
          <div className="mt-6 rounded-2xl p-5" style={{ background: '#1C3A2E' }}>
            <div className="font-serif font-light text-xl mb-2" style={{ color: '#F9F6F1' }}>Unlock peptide guidance</div>
            <p className="text-sm mb-4 leading-relaxed" style={{ color: 'rgba(249,246,241,0.82)' }}>Peptide education, cycling approaches, and advanced supplement guidance, for users who want to go beyond the basics.</p>
            <button onClick={() => navigate('/pricing')} className="w-full rounded-full font-semibold text-sm" style={{ background: '#F9F6F1', color: '#1C3A2E', height: 48 }}>
              Upgrade to Pro, $19/mo →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
