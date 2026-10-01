import { useState } from 'react';
import { ccsApi } from '../../../Api/ccsApi';
import { useApi } from '../../../hooks/useApi';
import styles from './AgentStatus.module.css';

/*
 * Online / Away chip in the Customer Care topbar.
 * Online agents get new tickets routed to them; Away agents don't.
 */
export default function AgentStatus() {
  const saved = useApi(() => ccsApi.myStatus(), 'ccs-status');
  const [choice, setChoice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const fromServer = String(saved.data?.status || 'ONLINE').toUpperCase();
  const status = choice || fromServer;
  const online = status !== 'AWAY';

  async function toggle() {
    const next = online ? 'AWAY' : 'ONLINE';
    const prev = choice;
    setChoice(next);
    setBusy(true);
    setFailed(false);
    try {
      await ccsApi.setStatus(next);
    } catch {
      setChoice(prev);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const title = failed
    ? 'Couldn’t update your status — try again'
    : online
      ? 'You’re receiving new tickets. Click to set Away.'
      : 'New tickets aren’t routed to you. Click to go Online.';

  return (
    <button
      type="button"
      className={`${styles.chip} ${online ? styles.online : styles.away} ${failed ? styles.failed : ''}`}
      onClick={toggle}
      disabled={busy}
      title={title}
      aria-label={`Status: ${online ? 'Online' : 'Away'}. ${title}`}
    >
      <span className={styles.dot} />
      <span className={styles.label}>{online ? 'Online' : 'Away'}</span>
    </button>
  );
}
