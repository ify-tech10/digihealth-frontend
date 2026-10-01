import { Link, NavLink } from 'react-router-dom';
import Icon from '../Icon/Icon';
import styles from './Sidebar.module.css';

/*
 * navigation: [{ section, items: [{ path, label, icon, badgeKey, end }] }]
 * badges:     { [badgeKey]: number }  — live counts from the current page
 * badgeTone:  'teal' for an informational count instead of the red alert
 */
export default function Sidebar({
  navigation = [],
  badges = {},
  title = 'DiGi Health',
  subtitle = '',
  logo = 'DH',
  open = false,
  onNavigate,
  onLogout,
}) {
  return (
    <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
      <Link to="/" className={styles.brand}>
        <div className={styles.logo}>{logo}</div>
        <div className={styles.brandText}>
          <strong>{title}</strong>
          {subtitle && <span>{subtitle}</span>}
        </div>
      </Link>

      <nav className={styles.navigation}>
        {navigation.map((section) => (
          <div key={section.section}>
            {section.section && (
              <p className={styles.sectionTitle}>{section.section}</p>
            )}

            {section.items?.map((item) => {
              const count = item.badgeKey ? badges[item.badgeKey] : undefined;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end ?? false}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.active : ''}`
                  }
                >
                  <Icon name={item.icon} className={styles.icon} />
                  <span>{item.label}</span>
                  {count > 0 && <span className={`${styles.badge} ${item.badgeTone === 'teal' ? styles.badgeTeal : ''}`}>{count}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {onLogout && (
        <div className={styles.footer}>
          <button type="button" className={styles.logoutButton} onClick={onLogout}>
            <Icon name="logout" className={styles.icon} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </aside>
  );
}
