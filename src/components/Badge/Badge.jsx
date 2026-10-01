import styles from './Badge.module.css';

export default function Badge({
  children,
  variant = 'default',
}) {
  return (
    <span
      className={`${styles.badge} ${
        styles[variant] || styles.default
      }`}
    >
      {children}
    </span>
  );
}