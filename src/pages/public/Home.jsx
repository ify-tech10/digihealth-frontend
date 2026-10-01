import { Link } from 'react-router-dom';
import styles from './Home.module.css';
import nurse1 from '../../icons/nurse1.webp'
//import PublicNav from '../../components/layout/PublicNav/PublicNav';
//import PublicFooter from '../../components/layout/PublicFooter/PublicFooter'

/* ── SVG ICONS ── */
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

export default function Home() {
  return (
    <>
      {/* <PublicNav /> */}

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className={styles.heroGrid}>

          {/* Left */}
          <div className={styles.heroLeft}>
            <span className={styles.heroBadge}>Post-discharge recovery is our launch focus.</span>

            <h1>Just Got Home from Hospital? Don't Risk Complications.</h1>

            <p>
              When care is done wrong, people end up back in hospital. DiGi Health manages
              your recovery from day one so you heal safely at home. We understand how
              stressful this can be. You're not alone.
            </p>

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

            <p className={styles.heroTagline}>No guesswork. Just care.</p>
          </div>

          {/* Right */}
          <div className={styles.heroRight}>
            <div className={styles.heroImgPlaceholder}>
              <img src={nurse1} />
            </div>

            <div className={styles.infoCard}>
              <h4>What Families Need Right Now</h4>
              <ul>
                <li>Post-discharge recovery is our launch focus and fastest path to care.</li>
                <li>Same-day nurse visits available across Greater Nigeria.</li>
                <li>You receive a clear care summary after every visit.</li>
              </ul>
            </div>

            <div className={styles.coverageCard}>
              <h4>Greater Nigerian Coverage</h4>
              <div className={styles.tags}>
                {['Abuja', 'Lagos', 'Delta', 'Port-Harcourt'].map(city => (
                  <span key={city} className={styles.tag}>{city}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Service cards */}
        <div className={styles.serviceRow}>
          {[
            {
              title: 'Worried about your parent being home alone?',
              body: 'Professional elderly support that keeps them safe, monitored, and cared for at home.',
            },
            {
              title: 'New baby at home? Get professional support from day one.',
              body: 'Warm postnatal support for mother and baby during the most overwhelming first weeks.',
            },
            {
              title: 'Struggling with diabetes or blood pressure?',
              body: 'Regular home monitoring and medication support that helps long-term conditions stay stable.',
            },
          ].map(card => (
            <div key={card.title} className={styles.serviceCard}>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section className={styles.ctaSection}>
        <p className={styles.ctaLabel}>Still Unsure?</p>
        <h2>That's OK. Talk to Us — We'll Guide You.</h2>
        <p>
          No pressure. No commitment. Just a conversation with someone who understands
          healthcare and can help you decide what care makes sense next.
        </p>
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
      {/* <PublicFooter /> */}
    </>
  );
}