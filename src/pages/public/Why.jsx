import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './Why.module.css';
import whyNurse from '../../icons/pre-natal.webp'

/* ── ICONS ── */
const PhoneIcon = () => (
  <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.64 3.42 2 2 0 0 1 3.62 1.24h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16.92z"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

const CalendarIcon = () => (
  <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const ChevronIcon = () => (
  <svg className={styles.faqChevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

/* ── DATA ── */
const PILLARS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    title: 'Every visit is documented and tracked',
    body: 'After every visit, you receive a clear report of what was done, what was observed, and what to watch for next.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
        <polyline points="16 11 17 13 22 13"/>
      </svg>
    ),
    title: 'Your nurse is verified before entering your home',
    body: 'Every DiGi Health nurse passes background verification, clinical certification, and internal training before deployment.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    title: 'We respond in hours, not days',
    body: 'Same-day visits are available because the first response window matters when someone vulnerable is at home.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    title: 'Hospital-connected, not just home-based',
    body: "DiGi Health keeps care continuous between hospitals, families, and home visits so nothing starts from zero.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
    title: 'Your information is protected',
    body: 'Records are digital, secure, and handled with the same seriousness as the care itself.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: 'We manage your entire recovery',
    body: 'DiGi Health stays involved from the first assessment through ongoing visits and any required escalation.',
  },
];

const FAQS = [
  { q: 'How quickly can a nurse come?',       a: 'In most cases, we can have a nurse at your home within hours of your request. Scheduled care is coordinated in advance around your care plan.' },
  { q: 'How much does it cost?',              a: 'Pricing varies depending on the service, frequency of visits, and duration of care. Speak to a care coordinator for a personalised quote — there\'s no obligation.' },
  { q: 'Are your nurses qualified?',          a: 'Yes. All DiGi Health nurses are clinically certified, background-checked, and trained internally before being matched to any family. You\'ll know who is coming before they arrive.' },
  { q: 'What if there is an emergency?',      a: 'Our nurses are trained to identify and respond to urgent situations. If escalation is needed, we coordinate directly with hospitals and family members to ensure the right support is mobilised quickly.' },
  { q: 'Do you work with hospitals?',         a: 'Yes. We maintain continuity with hospital teams where needed so that post-discharge care is coordinated and nothing gets missed in the transition from facility to home.' },
  { q: 'What areas do you cover?',            a: 'We currently cover Greater Nigeria including major regions like Anambra, Delta, Abuja, and Lagos. Contact us to confirm availability in your specific area.' },
  { q: 'Can I choose my nurse?',              a: "We match nurses based on your specific care needs and location to ensure the best fit. You'll always be informed of who will be visiting before they arrive." },
  { q: 'How do I pay?',                       a: 'Payment options are discussed during your consultation. We accept mobile money and bank transfers. A care coordinator will walk you through everything before care begins.' },
];

/* ── COMPONENT ── */
export default function Why() {
  const [openIndex, setOpenIndex] = useState(0);

  const toggleFaq = (i) => setOpenIndex(openIndex === i ? null : i);

  return (
    <>
      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div>
            <span className={styles.heroBadge}>Why DiGi Health</span>
            <h1>Families trust DiGi Health because care feels professional before the visit even starts.</h1>
            <p className={styles.heroDesc}>
              Clear reporting, verified staff, faster response times, hospital continuity, and data
              protection aren't extras. They're the foundation of everything we do.
            </p>
            <div className={styles.heroCta}>
              <a href="tel:+2340974562456" className={styles.btnOutlineWhite}>
                <PhoneIcon /> Call Now
              </a>
              <a href="https://wa.me/2340974562456" target="_blank" rel="noreferrer" className={styles.btnGreen}>
                <WhatsAppIcon /> WhatsApp Us
              </a>
              <Link to="/contact" className={styles.btnOutlineWhite}>
                <CalendarIcon /> Request Care
              </Link>
            </div>
          </div>

          <div className={styles.heroRight}>
            <div className={styles.heroImgPlaceholder}>
              <img src={whyNurse} />
            </div>
            <div className={styles.promiseBox}>
              <h4>Our Promise</h4>
              <p>Every visit documented. Every nurse verified. We don't just visit — we manage your entire recovery.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST PILLARS ── */}
      <section className={styles.pillarsSection}>
        <div className={styles.pillarsGrid}>
          {PILLARS.map((p) => (
            <div key={p.title} className={styles.pillarCard}>
              <div className={styles.pillarIcon}>{p.icon}</div>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── QUOTE BANNER ── */}
      <div className={styles.quoteBanner}>
        <p>When care is done wrong, people end up back in hospital. We make sure that doesn't happen.</p>
      </div>

      {/* ── FAQ ── */}
      <section className={styles.faqSection}>
        <p className={styles.faqLabel}>Frequently Asked Questions</p>
        <h2>Common questions from families considering DiGi Healthcare.</h2>

        <div className={styles.faqList}>
          {FAQS.map((faq, i) => (
            <div
              key={faq.q}
              className={`${styles.faqItem} ${openIndex === i ? styles.open : ''}`}
            >
              <button className={styles.faqQuestion} onClick={() => toggleFaq(i)}>
                {faq.q}
                <ChevronIcon />
              </button>
              <div className={styles.faqAnswer}>
                <p>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className={styles.ctaSection}>
        <p className={styles.ctaLabel}>Still Unsure?</p>
        <h2>That's OK. Talk to Us — We'll Guide You.</h2>
        <p>No pressure. No commitment. Just a conversation with someone who understands healthcare and can help you decide what care makes sense next.</p>
        <div className={styles.ctaBtns}>
          <a href="tel:+2340974562456" className={styles.btnOutlineNavy}>
            <PhoneIcon /> Call Now
          </a>
          <a href="https://wa.me/2340974562456" target="_blank" rel="noreferrer" className={styles.btnGreenDark}>
            <WhatsAppIcon /> WhatsApp Us
          </a>
          <Link to="/contact" className={styles.btnOutlineNavy}>
            <CalendarIcon /> Book a Visit
          </Link>
        </div>
      </section>
    </>
  );
}