
import { Link } from 'react-router-dom';
import styles from './HowItWorks.module.css';
import Nurse from '../../icons/Nurse.webp'

export default function HowItWorks() {

  const steps = [
    {
      number: '01',
      title: 'You reach out',
      description:
        'Call, WhatsApp, or book online. We listen first and help you decide what care makes sense.',
    },
    {
      number: '02',
      title: 'We assess your needs',
      description:
        'A care coordinator understands the situation and recommends the right service or program.',
    },
    {
      number: '03',
      title: 'A nurse is matched to you',
      description:
        'We assign a qualified professional based on your location and care needs before the visit starts.',
    },
    {
      number: '04',
      title: 'Care begins at home',
      description:
        'Visits are professional, documented, and designed to keep recovery on track.',
    },
    {
      number: '05',
      title: 'We monitor your progress',
      description:
        'Your plan can be adjusted as needed so recovery stays coordinated from start to finish.',
    },
  ];

  return (
    <main className={styles.page}>

      {/* HERO */}
      <section className={styles.hiwHero}>
        <div className={styles.hiwHeroGrid}>

          {/* Left */}
          <div>
            <span className={styles.heroBadge}>
              How It Works
            </span>

            <h1>
              A simple five-step path from first contact to care at home.
            </h1>

            <p className={styles.heroDescription}>
              No confusing process. No technical jargon. Just a clear route
              to getting the right nurse, the right care, and the right
              follow-through.
            </p>

            <div className={styles.heroCta}>

              <a
                href="tel:+2340974562456"
                className={styles.btnOutlineWhite}
              >
                <svg
                  className={styles.icon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.64 3.42 2 2 0 0 1 3.62 1.24h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16.92z" />
                </svg>
                Call Now
              </a>

              <a
                href="https://wa.me/2340974562456"
                className={styles.btnGreen}
                target="_blank"
                rel="noreferrer"
              >
                <svg
                  className={styles.icon}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c0 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                </svg>
                WhatsApp Us
              </a>

              <Link
                to="/contact"
                className={styles.btnOutlineWhite}
              >
                <svg
                  className={styles.icon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Book Now
              </Link>

            </div>
          </div>

          {/* Right */}
          <div className={styles.hiwHeroRight}>

            <div className={styles.heroImgPlaceholder}>
              <img
                src={Nurse}
                alt="DiGi Health nurse"
              />
            </div>

            <div className={styles.whatToExpect}>
              <h4>What to Expect</h4>

              <ul>
                <li>
                  A care coordinator responds within the hour.
                </li>
                <li>
                  A qualified nurse is matched to your needs.
                </li>
                <li>
                  Care starts at home — often the same day.
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* STEPS */}
      <section className={styles.stepsSection}>

        {steps.map((step) => (
          <div
            className={styles.stepRow}
            key={step.number}
          >
            <div className={styles.stepNumber}>
              {step.number}
            </div>

            <div className={styles.stepContent}>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          </div>
        ))}

      </section>

      {/* READY TO START */}
      <section className={styles.readySection}>
        <p className={styles.readyLabel}>
          Ready to Start?
        </p>

        <h2>
          Call, WhatsApp, or book online. We'll guide you from there.
        </h2>

        <div className={styles.readyBtns}>

          <a
            href="tel:+2340974562456"
            className={styles.btnOutlineNavy}
          >
            <svg
              className={styles.icon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.64 3.42 2 2 0 0 1 3.62 1.24h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16.92z" />
            </svg>
            Call Now
          </a>

          <a
            href="https://wa.me/2340974562456"
            className={styles.btnGreenDark}
            target="_blank"
            rel="noreferrer"
          >
            <svg
              className={styles.icon}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458-.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
            </svg>
            WhatsApp Us
          </a>

          <Link
            to="/contact"
            className={styles.btnOutlineNavy}
          >
            <svg
              className={styles.icon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Book Now
          </Link>

        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <p className={styles.ctaLabel}>
          Still Unsure?
        </p>

        <h2>
          That's OK. Talk to Us — We'll Guide You.
        </h2>

        <p>
          No pressure. No commitment. Just a conversation with someone who
          understands healthcare and can help you decide what care makes
          sense next.
        </p>

        <div className={styles.ctaBtns}>

          <a
            href="tel:+2340974562456"
            className={styles.btnOutlineNavy}
          >
            <svg
              className={styles.icon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.64 3.42 2 2 0 0 1 3.62 1.24h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 1 2.81.7A2 2 0 0 1 21.73 16.92z" />
            </svg>
            Call Now
          </a>

          <a
            href="https://wa.me/2340974562456"
            className={styles.btnGreenDark}
            target="_blank"
            rel="noreferrer"
          >
            <svg
              className={styles.icon}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.198.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
            </svg>
            WhatsApp Us
          </a>

          <Link
            to="/contact"
            className={styles.btnOutlineNavy}
          >
            <svg
              className={styles.icon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Book a Visit
          </Link>

        </div>
      </section>

    </main>
  );
}

