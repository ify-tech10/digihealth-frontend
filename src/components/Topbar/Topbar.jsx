import Icon from '../Icon/Icon';
import styles from './Topbar.module.css';

export default function Topbar({
  title = '',
  subtitle = '',
  user = null,
  hasNotifications = false,
  notificationPanel = null,
  avatarColor,
  extra = null,
  onMenuClick,
  onNotificationClick,
}) {
  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        {onMenuClick && (
          <button
            type="button"
            className={styles.menuButton}
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Icon name="menu" />
          </button>
        )}

        <div className={styles.heading}>
          {title && <h1>{title}</h1>}
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>

      <div className={styles.right}>
        {extra}
        <div className={styles.bellWrap}>
          <button
            type="button"
            className={styles.notificationButton}
            onClick={onNotificationClick}
            aria-label="Notifications"
            aria-expanded={!!notificationPanel}
          >
            <Icon name="bell" />
            {hasNotifications && <span className={styles.dot} />}
          </button>
          {notificationPanel}
        </div>

        {user && (
          <div className={styles.userChip}>
            <div className={styles.avatar} style={avatarColor ? { background: avatarColor } : undefined}>{getInitials(user.name)}</div>
            <span>{firstName(user.name) || formatRole(user.role)}</span>
          </div>
        )}
      </div>
    </header>
  );
}

function getInitials(name = '') {
  return String(name)
    .trim()
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function firstName(name = '') {
  const n = String(name).trim();
  if (!n || n.includes('@')) return '';
  return n.split(/\s+/)[0];
}

function formatRole(role = '') {
  return String(role)
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
