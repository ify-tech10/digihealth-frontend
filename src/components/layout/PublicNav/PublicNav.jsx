import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './PublicNav.module.css';

export default function PublicNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { to: '/',            label: 'Home' },
    { to: '/services',    label: 'Services' },
    { to: '/programs',    label: 'Programs' },
    { to: '/how-it-works',label: 'How It Works' },
    { to: '/why',         label: 'Why DiGi Health' },
    { to: '/contact',     label: 'Contact' },
    { to: '/apply',       label: 'Join as Service Provider' },
    { to: '/hmo',         label: 'Join our HMO' },
    { to: '/login',       label: 'Login' },
  ];

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        {/* Brand */}
        <NavLink to="/" className={styles.navBrand}>
          <div className={styles.navLogo}>DH</div>
          <div className={styles.navBrandText}>
            <strong>DiGi Health</strong>
            <span>Healthcare at home — done right.</span>
          </div>
        </NavLink>

        {/* Desktop links */}
        <ul className={styles.navLinks}>
          {links.map(l => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                }
              >
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Book care CTA */}
        <NavLink to="/contact" className={styles.btnBook}>Book Care</NavLink>

        {/* Hamburger */}
        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
        >
          <span className={menuOpen ? styles.open : ''}></span>
          <span className={menuOpen ? styles.open : ''}></span>
          <span className={menuOpen ? styles.open : ''}></span>
        </button>
      </nav>

      {/* Mobile nav */}
      <div className={`${styles.mobileNav} ${menuOpen ? styles.mobileOpen : ''}`}>
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              isActive ? `${styles.mobileLink} ${styles.active}` : styles.mobileLink
            }
            onClick={() => setMenuOpen(false)}
          >
            {l.label}
          </NavLink>
        ))}
        <NavLink to="/contact" className={styles.mobileBtnBook} onClick={() => setMenuOpen(false)}>
          Book Care
        </NavLink>
      </div>
    </header>
  );
}