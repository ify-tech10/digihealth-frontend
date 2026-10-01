import Modal from '../Modal/Modal';
import styles from './ConfirmDialog.module.css';

/*
 * Yes/no confirmation for destructive or irreversible actions.
 * Pass `children` for extra inputs (e.g. a rejection reason).
 */
export default function ConfirmDialog({
  isOpen,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  danger = false,
  busy = false,
  onConfirm,
  onClose,
  children,
}) {
  return (
    <Modal isOpen={isOpen} onClose={() => !busy && onClose()} title={title} size="small">
      {message && <p className={styles.message}>{message}</p>}
      {children}
      <div className={styles.actions}>
        <button type="button" className={styles.cancel} onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className={danger ? styles.danger : styles.confirm}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? 'Please wait…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
