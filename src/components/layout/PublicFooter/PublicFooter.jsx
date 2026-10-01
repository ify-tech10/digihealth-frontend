import { Link } from 'react-router-dom';
import styles from './PublicFooter.module.css';

export default function PublicFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>

        {/* Brand col */}
        <div className={styles.footerCol}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogo}>DH</div>
            <div className={styles.footerBrandText}>
              <strong>DiGi Health</strong>
              <span>Structured healthcare at Home</span>
            </div>
          </div>
          <p>Professional, coordinated home healthcare across Greater Nigeria. From hospital to home, without confusion.</p>
          <p className={styles.hours}>Monday to Sunday, 6:00 AM to 8:00 PM</p>
        </div>

        {/* Quick links */}
        <div className={styles.footerCol}>
          <h4>Quick links</h4>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/services">Services</Link></li>
            <li><Link to="/programs">Programs</Link></li>
            <li><Link to="/how-it-works">How It Works</Link></li>
            <li><Link to="/why">Why DiGi Health</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/postnatal">Postnatal Care</Link></li>
            <li><Link to="/privacy">Privacy Policy</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div className={`${styles.footerCol} ${styles.footerContact}`}>
          <h4>Contact</h4>
          <ul>
            <li>+234 097 456 2456</li>
            <li><a href="#">WhatsApp us</a></li>
            <li><a href="mailto:hello@digihealth.com">hello@digihealth.com</a></li>
            <li>Ikeja, Lagos, Nigeria</li>
          </ul>
        </div>

      </div>

      <div className={styles.footerBottom}>
        <span>© 2026 DiGi Health. All rights reserved.</span>
        <span>Healthcare at home — done right.</span>
      </div>
    </footer>
  );
}