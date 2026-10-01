import { Link } from 'react-router-dom';
import styles from './Services.module.css';
import Service from '../../icons/service.webp'

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

/* ── SERVICE DATA — exact wording from HTML ── */
const SERVICES = [
  {
    id: 'post-discharge',
    dark: false,
    label: 'Post-Discharge Recovery Home Care Nigeria',
    title: 'Post-Discharge Recovery',
    heading: 'Just Got Home from Hospital? Don\'t Risk Complications.',
    body: 'The first days after discharge are the most critical. DiGi Health provides professional nursing support to monitor your recovery, manage medications, and prevent complications — so you heal safely at home instead of ending up back in hospital.',
    items: [
      'Structured recovery monitoring',
      'Medication management and adherence',
      'Complication prevention',
      'Smooth transition from hospital to home',
    ],
    cta: 'Book This Service',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#1a2550" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
  },
  {
    id: 'chronic-care',
    dark: true,
    label: 'Chronic Disease Management Home',
    title: 'Chronic Care Management',
    heading: 'Struggling to Manage Diabetes or High Blood Pressure at Home?',
    body: 'Living with a chronic condition shouldn\'t mean constant hospital visits. DiGi Health provides regular home visits to monitor your condition, manage your medications, and help you stay healthy so you spend less time in clinics and more time living.',
    items: [
      'Diabetes and blood sugar monitoring',
      'Blood pressure and hypertension monitoring',
      'Medication support and lifestyle guidance',
      'Regular health assessments',
    ],
    cta: 'Book This Service',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#1a2550" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
  {
    id: 'elderly-care',
    dark: false,
    label: 'Elderly Care at Home Nigeria',
    title: 'Elderly Care Support',
    heading: 'Worried About Your Parent Being Home Alone?',
    body: 'Your parents and grandparents deserve dignified, compassionate care. DiGi Health provides professional support for elderly family members from daily assistance to health monitoring, so you have peace of mind knowing your loved one is safe even when you can\'t be there.',
    items: [
      'Daily living support and mobility assistance',
      'Health monitoring and fall prevention',
      'Companionship and emotional support',
      'Medication management',
    ],
    cta: 'Book This Service',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#1a2550" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    id: 'postnatal',
    dark: false,
    label: 'Postnatal Care at Home Nigeria',
    title: 'Postnatal Mother and Baby Care',
    heading: 'New Mother? Need Help Caring for Yourself and Your Baby?',
    body: 'The first weeks after delivery are when most postnatal complications happen and when new mothers need support the most. DiGi Health brings qualified nurses to your home to monitor your recovery, care for your newborn, and give you the confidence to thrive.',
    items: [
      'Mother recovery monitoring and wound care',
      'Newborn health checks and growth monitoring',
      'Breastfeeding support and guidance',
      'Emotional wellbeing and early support',
    ],
    cta: 'Book This Service',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#1a2550" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    id: 'physiotherapy',
    dark: false,
    label: 'Physiotherapy at Home Nigeria',
    title: 'Physiotherapy and Rehabilitation',
    heading: 'Need Physiotherapy but Can\'t Make It to a Clinic?',
    body: 'DiGi Health brings qualified physiotherapists to your home for structured rehabilitation, helping you regain mobility and strength at your own pace in a comfortable environment.',
    items: [
      'Post-surgery rehabilitation',
      'Stroke and neurological recovery',
      'Pain management and mobility improvement',
      'Guided therapeutic exercises',
    ],
    cta: 'Book This Service',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#1a2550" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    id: 'lab',
    dark: true,
    label: 'Lab Test at Home Nigeria',
    title: 'Lab and Diagnostic Services',
    heading: 'Lab and Diagnostic Services',
    body: 'Skip the clinic queue. DiGi Health sends a trained professional to your home to collect lab samples and coordinate results conveniently, safely, and quickly.',
    items: [
      'Blood sample collection at home',
      'Diagnostic specimen collection',
      'Results delivered to you',
    ],
    cta: 'Book This Service',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#1a2550" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0a3 3 0 1 0 6 0M9 14h6"/>
      </svg>
    ),
  },
  {
    id: 'telemedicine',
    dark: false,
    label: 'Home Healthcare Nigeria',
    title: 'Telemedicine',
    heading: 'Telemedicine',
    body: 'Access healthcare professionals from anywhere. DiGi Health connects you with qualified doctors for consultations, follow-ups, and medical advice through a simpler digital pathway.',
    items: [
      'Remote doctor consultations',
      'Follow-up appointments',
      'Prescription management and medical advice',
    ],
    cta: 'Book a Consultation',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#1a2550" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
  },
];

export default function Services() {
  return (
    <>
      {/* ── HERO ── */}
      <section className={styles.servicesHero}>
        <div className={styles.servicesHeroGrid}>
          <div>
            <span className={styles.heroBadge}>Services</span>
            <h1>Professional home healthcare for the moments families need it most.</h1>
            <p>Each service stays focused on outcomes: safer recovery at home, fewer unnecessary readmissions, more confidence for families, and a faster route to professional care.</p>
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

          <div className={styles.whatWeCover}>
            <h4>What We Cover</h4>
            <div className={styles.coverTags}>
              {['Home Nursing','Ambulance Services','Post-Discharge Recovery','Chronic Care','Elderly Support','Postnatal Care','Physiotherapy'].map(tag => (
                <span key={tag} className={styles.coverTag}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICE CARDS ── */}
      <div className={styles.svcGrid}>
        {SERVICES.map(svc => (
          <div
            key={svc.id}
            id={svc.id}
            className={styles.svcCard}
            style={svc.dark ? { backgroundColor: 'rgb(11, 11, 60)' } : {}}
          >
            <div className={styles.svcTop}>
              <div className={styles.svcIcon}>{svc.icon}</div>
              <div className={styles.svcMeta}>
                <div className={styles.svcLabel}>{svc.label}</div>
                <div
                  className={styles.svcTitle}
                  style={svc.dark ? { color: 'white' } : {}}
                >
                  {svc.title}
                </div>
              </div>
            </div>

            <h3 style={svc.dark ? { color: 'white' } : {}}>
              {svc.heading}
            </h3>

            <p style={svc.dark ? { color: 'rgb(186, 190, 192)' } : {}}>
              {svc.body}
            </p>

            <ul style={svc.dark ? { color: 'rgb(186, 190, 192)' } : {}}>
              {svc.items.map(item => <li key={item}>{item}</li>)}
            </ul>

            <Link to="/contact" className={styles.btnSvc}>{svc.cta}</Link>
          </div>
        ))}
      </div>

      {/* ── FEATURE STRIP ── */}
      <div className={styles.featureStrip}>
        <div className={styles.featureText}>
          <p className={styles.featureLabel}>Care at Home</p>
          <h2>The right nurse, the right setting, the right level of support.</h2>
          <p>Home care works best when it feels calm, professional, and personal. DiGi Health brings structured nursing support into the home so families get expert care without the stress of repeated facility visits.</p>
        </div>
        <div className={styles.featureImage}>
          <img src= {Service} alt="DiGi Health nurse at home" />
        </div>
      </div>

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