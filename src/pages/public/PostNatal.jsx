
import { Link } from 'react-router-dom';
import styles from './PostNatal.module.css';
import PostNurse from '../../icons/post-natal.webp'

const PHONE_NUMBER = '+2340974562456';
const WHATSAPP_NUMBER = '2340974562456';

const phoneLink = `tel:${PHONE_NUMBER}`;
const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}`;

function PhoneIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.64 3.42 2 2 0 0 1 3.62 1.24h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16.92z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function SmileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function PulseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function BookingButtons({ large = false }) {
  return (
    <div className={large ? styles.bannerBtns : styles.planBtns}>
      <a
        href={phoneLink}
        className={large ? styles.btnOutlineWhite : styles.btnOutlineNavy}
      >
        <PhoneIcon />
        Call Now
      </a>

      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className={large ? styles.btnGreen : styles.btnGreenSm}
      >
        <WhatsAppIcon />
        WhatsApp Us
      </a>
    </div>
  );
}

export default function PostnatalCare() {
  const includedItems = [
    {
      icon: <PulseIcon />,
      title: 'Mother recovery monitoring',
      text: 'Vital signs, wound care, pain management, and early escalation when needed.',
    },
    {
      icon: <HeartIcon />,
      title: 'Baby health checks',
      text: 'Weight tracking, feeding assessment, and jaundice screening at home.',
    },
    {
      icon: <ShieldIcon />,
      title: 'Breastfeeding support',
      text: 'Latching guidance, positioning help, and reassurance when feeding feels uncertain.',
    },
    {
      icon: <SmileIcon />,
      title: 'Emotional wellbeing',
      text: 'Postnatal depression awareness, early support, and a human check-in for the mother.',
    },
    {
      icon: <UsersIcon />,
      title: 'Family education',
      text: 'Practical newborn care, safety guidance, and feeding routines the family can actually use.',
      full: true,
    },
  ];

  const plans = [
    {
      title: '2-Week Starter Plan',
      text: 'Professional support during the most critical postnatal period with regular visits for mother and baby monitoring.',
    },
    {
      title: '6-Week Full Recovery Plan',
      text: 'Comprehensive care through the full postnatal recovery window with ongoing support as routines settle.',
    },
    {
      title: 'Premium Postnatal Care',
      text: 'Priority scheduling, increased visits, direct doctor access, and a 24-hour DiGi Health support line.',
      premium: true,
    },
  ];

  return (
    <main className={styles.page}>
      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div className={styles.heroContent}>
            <span className={styles.heroBadge}>Postnatal Care</span>

            <h1>
              Trusted postnatal care at home in Nigeria for the weeks that feel
              most overwhelming.
            </h1>

            <p className={styles.heroDesc}>
              Your baby is home. Now what? DiGi Health brings qualified nurses
              to your home to monitor your recovery, check your baby's health,
              and give your family the confidence you need from day one.
            </p>

            <div className={styles.heroCta}>
              <a href={phoneLink} className={styles.btnOutlineWhite}>
                <PhoneIcon />
                Call Now
              </a>

              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.btnGreen}
              >
                <WhatsAppIcon />
                WhatsApp Us
              </a>

              <Link to="/contact" className={styles.btnOutlineWhite}>
                <CalendarIcon />
                Book Postnatal Care
              </Link>
            </div>

            <p className={styles.heroTagline}>
              Bookings filling fast — reserve your care plan today.
            </p>
          </div>

          <div className={styles.heroRight}>
            <div className={styles.heroImgPlaceholder}>
              <img
                src= {PostNurse}
                alt="Mother and baby receiving postnatal care"
              />
            </div>

            <div className={styles.bestFitBox}>
              <h4>Best Fit For</h4>

              <ul>
                <li>
                  First-time mothers who want guidance at home.
                </li>
                <li>
                  Families leaving hospital within 24 to 48 hours of delivery.
                </li>
                <li>
                  Anyone who wants mother-and-baby checks without repeated
                  clinic stress.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* INSIGHT ROW */}
      <section className={styles.insightRow}>
        <div className={styles.insightCard}>
          <h3>Most complications happen after you leave hospital</h3>
          <p>
            You may be discharged quickly, but recovery continues for weeks.
            DiGi Health helps warning signs get noticed early instead of
            becoming emergencies.
          </p>
        </div>

        <div className={styles.insightCard}>
          <h3>Your baby changes every day — is everything normal?</h3>
          <p>
            Feeding, jaundice, weight, breathing, and sleep can become sources
            of constant anxiety. Professional checks bring confidence and
            faster action.
          </p>
        </div>
      </section>

      {/* WHAT'S INCLUDED */}
      <section className={styles.includedSection}>
        <p className={styles.includedLabel}>What's Included</p>

        <h2>
          Professional support for the mother, the baby, and the family around
          them.
        </h2>

        <div className={styles.includedGrid}>
          {includedItems.map((item) => (
            <div
              key={item.title}
              className={`${styles.includedCard} ${
                item.full ? styles.full : ''
              }`}
            >
              <div className={styles.incIcon}>{item.icon}</div>

              <div className={styles.incText}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CARE PLANS */}
      <section className={styles.plansSection}>
        <div className={styles.plansGrid}>
          {plans.map((plan) => (
            <div
              key={plan.title}
              className={`${styles.planCard} ${
                plan.premium ? styles.premium : ''
              }`}
            >
              <h3>{plan.title}</h3>

              <p>{plan.text}</p>

              <BookingButtons />

              <Link to="/contact" className={styles.planCoord}>
                <CalendarIcon />
                Speak to a Care Coordinator
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FIRST TIME MOTHERS */}
      <section className={styles.ftmSection}>
        <p className={styles.ftmLabel}>For First-Time Mothers</p>

        <h2>Your first baby? We've got you.</h2>

        <p>
          Everything feels new. Everything feels uncertain. That is normal. We
          help mothers learn what to watch, how to care for the baby, and how
          to recover with a professional beside them.
        </p>
      </section>

      {/* TESTIMONIAL */}
      <section className={styles.testimonialSection}>
        <div className={styles.testimonialCard}>
          <p className={styles.testimonialQuote}>
            I was so worried about bringing my baby home. DiGi Health's
            postnatal team gave us confidence and support from day one.
          </p>

          <div className={styles.testimonialAuthor}>
            <strong>Abena M.</strong>
            <span>First-time mother</span>
          </div>
        </div>
      </section>

      {/* BOOK BANNER */}
      <section className={styles.bookBanner}>
        <p className={styles.bannerLabel}>Give Your Family the Best Start</p>

        <h2>Book postnatal care today.</h2>

        <p>
          We can begin care within 24 hours of discharge. Same-day booking is
          available when slots remain.
        </p>

        <BookingButtons large />

        <Link to="/contact" className={styles.btnOutlineWhite}>
          <CalendarIcon />
          Book Postnatal Care
        </Link>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <p className={styles.ctaLabel}>Still Unsure?</p>

        <h2>That's OK. Talk to Us — We'll Guide You.</h2>

        <p>
          No pressure. No commitment. Just a conversation with someone who
          understands healthcare and can help you decide what care makes sense
          next.
        </p>

        <div className={styles.ctaBtns}>
          <a href={phoneLink} className={styles.btnOutlineNavyLg}>
            <PhoneIcon />
            Call Now
          </a>

          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnGreenLg}
          >
            <WhatsAppIcon />
            WhatsApp Us
          </a>

          <Link to="/contact" className={styles.btnOutlineNavyLg}>
            <CalendarIcon />
            Book a Visit
          </Link>
        </div>
      </section>
    </main>
  );
}

