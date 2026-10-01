import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../Icon/Icon';
import { pick, timeAgo } from '../../utils/format';
import { isUnread } from '../../utils/notifications';
import styles from './NotificationsPanel.module.css';


/*
 * Dropdown under the bell. Items: { id, title, message, createdAt, read, link }.
 * Closes on outside click or Escape.
 */
export default function NotificationsPanel({ items, loading, error, onClose, onRead, onReadAll }) {
  const ref = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !e.target.closest('[aria-label="Notifications"]')) onClose();
    };
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const unread = items.filter(isUnread).length;

  return (
    <div className={styles.panel} ref={ref} role="dialog" aria-label="Notifications panel">
      <div className={styles.head}>
        <strong>Notifications</strong>
        {unread > 0 && (
          <button type="button" className={styles.markAll} onClick={onReadAll}>Mark all read</button>
        )}
      </div>

      <div className={styles.list}>
        {loading ? (
          <p className={styles.empty}>Loading…</p>
        ) : error && !items.length ? (
          <p className={styles.empty}>Notifications are unavailable right now.</p>
        ) : !items.length ? (
          <p className={styles.empty}>You're all caught up.</p>
        ) : (
          items.map((n) => {
            const link = pick(n, 'link', 'url');
            const body = (
              <>
                <span className={`${styles.dot} ${isUnread(n) ? styles.dotOn : ''}`} />
                <div className={styles.text}>
                  <h4>{pick(n, 'title', 'type') || 'Notification'}</h4>
                  {pick(n, 'message', 'body') && <p>{pick(n, 'message', 'body')}</p>}
                  <span className={styles.time}>{timeAgo(pick(n, 'createdAt', 'timestamp'))}</span>
                </div>
              </>
            );
            const handle = () => { if (isUnread(n)) onRead(n); if (link) onClose(); };
            return link && link.startsWith('/') ? (
              <Link key={n.id} to={link} className={styles.item} onClick={handle}>{body}</Link>
            ) : (
              <button key={n.id} type="button" className={styles.item} onClick={handle}>{body}</button>
            );
          })
        )}
      </div>

      <div className={styles.foot}>
        <Icon name="bell" className={styles.footIcon} />
        New assignments and approvals show up here.
      </div>
    </div>
  );
}
