import { Suspense, useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../../Sidebar/Sidebar';
import Topbar from '../../Topbar/Topbar';
import NotificationsPanel from '../../Notifications/NotificationsPanel';
import { commonApi } from '../../../Api/commonApi';
import { asList } from '../../../Api/apiFetch';
import { useApi } from '../../../hooks/useApi';
import { isUnread } from '../../../utils/notifications';
import { useAuth } from '../../../context/useAuth';
import { NAVIGATION } from '../../../config/Navigation';
import styles from './DashboardLayout.module.css';

/*
 * Shell shared by every role dashboard: sidebar + sticky topbar + content.
 *
 * Pages set the topbar text and sidebar badge counts through the outlet
 * context:
 *   const { setHeader, setBadges } = useOutletContext();
 *   useEffect(() => setHeader({ title: 'Admin Dashboard' }), [setHeader]);
 */
export default function DashboardLayout({ role }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = NAVIGATION[role] || { sections: [] };

  const [menuOpen, setMenuOpen] = useState(false);
  const [header, setHeaderState] = useState({ title: '', subtitle: '' });
  const [badges, setBadgesState] = useState({});

  const setHeader = useCallback((next) => setHeaderState((h) => ({ ...h, ...next })), []);
  const setBadges = useCallback((next) => setBadgesState((b) => ({ ...b, ...next })), []);

  /* ── in-app notifications (new assignments, approvals…) ── */
  const notes = useApi(() => commonApi.notifications(), 'notifications');
  const reloadNotes = notes.reload;
  useEffect(() => {
    const t = setInterval(reloadNotes, 60000);
    return () => clearInterval(t);
  }, [reloadNotes]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [readIds, setReadIds] = useState(() => new Set());
  const noteItems = asList(notes.data).map((n) => (readIds.has(n.id) ? { ...n, read: true } : n));
  const unreadCount = noteItems.filter(isUnread).length;
  const closePanel = useCallback(() => setPanelOpen(false), [setPanelOpen]);

  function markRead(n) {
    setReadIds((ids) => new Set(ids).add(n.id));
    commonApi.markNotificationRead(n.id).catch(() => {});
  }
  function markAllRead() {
    setReadIds(new Set(noteItems.map((n) => n.id)));
    commonApi.markAllNotificationsRead().catch(() => {});
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const hasAlerts = Object.values(badges).some((n) => n > 0);
  const TopbarExtra = nav.topbarExtra;

  return (
    <div className={styles.shell} style={nav.theme}>
      <Sidebar
        navigation={nav.sections}
        subtitle={nav.subtitleFor?.(user?.role) || nav.subtitle}
        logo={nav.logoFor?.(user?.role) || nav.logo}
        badges={badges}
        open={menuOpen}
        onNavigate={() => setMenuOpen(false)}
        onLogout={handleLogout}
      />

      {menuOpen && (
        <div className={styles.backdrop} onClick={() => setMenuOpen(false)} />
      )}

      <div className={styles.main}>
        <Topbar
          title={header.title}
          subtitle={header.subtitle}
          user={user}
          hasNotifications={hasAlerts || unreadCount > 0}
          avatarColor={nav.avatarColor}
          extra={TopbarExtra ? <TopbarExtra /> : null}
          onNotificationClick={() => setPanelOpen((o) => !o)}
          notificationPanel={panelOpen ? (
            <NotificationsPanel
              items={noteItems}
              loading={notes.loading}
              error={notes.error}
              onClose={closePanel}
              onRead={markRead}
              onReadAll={markAllRead}
            />
          ) : null}
          onMenuClick={() => setMenuOpen(true)}
        />

        <div className={styles.content}>
          <Suspense fallback={<div className={styles.loading}>Loading…</div>}>
            <Outlet context={{ setHeader, setBadges }} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
