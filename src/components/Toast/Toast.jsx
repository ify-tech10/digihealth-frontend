import styles from './Toast.module.css';

export default function Toast({
  message,
  type = 'info',
  onClose,
}) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={`${styles.toast} ${
        styles[type] || styles.info
      }`}
      role="alert"
    >
      <div className={styles.content}>
        <span className={styles.icon}>
          {getIcon(type)}
        </span>

        <span className={styles.message}>
          {message}
        </span>
      </div>

      {onClose && (
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Close notification"
        >
          ×
        </button>
      )}
    </div>
  );
}

function getIcon(type) {
  switch (type) {
    case 'success':
      return '✓';

    case 'error':
      return '✕';

    case 'warning':
      return '!';

    default:
      return 'i';
  }
}