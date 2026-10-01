import { Link } from 'react-router-dom';
import styles from './Programs.module.css';

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
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

/* ── PROGRAM DATA — exact wording from HTML ── */
const PROGRAMS = [
  {
    id: 'post-discharge',
    title: 'Post-Discharge Recovery Program',
    body: 'Designed for patients leaving hospital who need structured support at home. Our recovery program ensures you heal safely with regular professional visits, medication management, and ongoing monitoring.',
    items: [
      'Regular professional home visits',
      'Medication management and adherence support',
      'Recovery monitoring and complication prevention',
      'Direct coordination with your hospital team if needed',
    ],
    callout: 'Get started in minutes. Same-day care available.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    id: 'chronic-care',
    title: 'Chronic Care Program',
    body: 'For patients living with diabetes, hypertension, or other long-term conditions. This program provides consistent professional monitoring and support that helps reduce unnecessary hospital visits.',
    items: [
      'Regular home visits by a dedicated nurse',
      'Ongoing health monitoring and tracking',
      'Medication support and lifestyle guidance',
      'Periodic lab work coordination',
    ],
    callout: null,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        <path d="M5 12H2"/><path d="M22 12h-3"/>
      </svg>
    ),
  },
  {
    id: 'elderly-care',
    title: 'Elderly Care Program',
    body: 'Reliable, compassionate long-term support for elderly family members. This program blends daily professional care, health monitoring, and companionship for peace of mind.',
    items: [
      'Daily professional care visits',
      'Health monitoring and safety checks',
      'Mobility support and fall prevention',
      'Companionship and emotional wellbeing',
    ],
    callout: null,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    id: 'postnatal',
    title: 'Postnatal Mother and Baby Care Program',
    body: 'Support for new mothers and their newborns during the first weeks at home. Professional monitoring, breastfeeding support, and baby care guidance help your family settle into life after delivery.',
    items: [
      'Mother recovery monitoring and care',
      'Baby health checks and growth tracking',
      'Breastfeeding and feeding support',
      'Professional guidance and reassurance',
    ],
    callout: 'Available as 2-week and 6-week plans. Speak to a care coordinator to choose the right fit.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
];

export default function Programs() {
  return (
    <>
      {/* ── HERO ── */}
      <section className={styles.programsHero}>
        <div className={styles.programsHeroGrid}>
          <div>
            <span className={styles.heroBadge}>Programs</span>
            <h1>Structured care programs that give families confidence from day one.</h1>
            <p>DiGi Health packages the highest-need services into coordinated care programs. Each program includes regular visits, professional monitoring, and a clear path from recovery to independence.</p>
            <div className={styles.heroCta}>
              <a href="tel:+2340974562456" className={styles.btnOutlineWhite}>
                <PhoneIcon /> Call Now
              </a>
              <a href="https://wa.me/2340974562456" target="_blank" rel="noreferrer" className={styles.btnGreen}>
                <WhatsAppIcon /> WhatsApp Us
              </a>
              <Link to="/contact" className={styles.btnOutlineWhite}>
                <CalendarIcon /> Book a Visit
              </Link>
            </div>
          </div>

          <div className={styles.programOptionsBox}>
            <h4>Program Options</h4>
            <ul>
              <li>Post-discharge recovery — our most requested program.</li>
              <li>Postnatal care for mother and baby from day one.</li>
              <li>Pricing explained during your free consultation call.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── PROGRAM CARDS ── */}
      <section className={styles.programsSection}>
        <div className={styles.programsGrid}>
          {PROGRAMS.map(prog => (
            <div key={prog.id} className={styles.progCard}>
              <div className={styles.progCardTop}>
                <div className={styles.progIcon}>{prog.icon}</div>
                <h3>{prog.title}</h3>
              </div>
              <p>{prog.body}</p>
              <ul>
                {prog.items.map(item => <li key={item}>{item}</li>)}
              </ul>
              {prog.callout && (
                <div className={styles.progCallout}>{prog.callout}</div>
              )}
              <Link to="/contact" className={styles.btnCoord}>
                Speak to a Care Coordinator
              </Link>
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