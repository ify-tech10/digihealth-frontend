import Icon from '../Icon/Icon';
import styles from './Statcard.module.css';

/*
 * <StatCard label="New Requests" value={7} icon="file" color="blue"
 *           delta="+3 today" deltaType="up" />
 * color:     blue | green | purple | orange | red | teal
 * sub:       optional small line under the label
 * accent:    true draws a coloured bar along the bottom
 * deltaType: up | down
 */
export default function StatCard({
  label,
  value,
  icon,
  color = 'blue',
  delta,
  deltaType = 'up',
  sub,
  accent = false,
  onClick,
}) {
  const content = (
    <>
      <div className={styles.top}>
        <div className={styles.icon}>
          <Icon name={icon} />
        </div>
        {delta && (
          <span className={`${styles.delta} ${deltaType === 'down' ? styles.down : styles.up}`}>
            {delta}
          </span>
        )}
      </div>
      <div className={styles.value}>{value}</div>
      <div className={styles.label}>{label}</div>
      {sub && <div className={styles.sub}>{sub}</div>}
    </>
  );

  const className = `${styles.card} ${styles[color] || styles.blue} ${accent ? styles.accent : ''}`;

  if (onClick) {
    return (
      <button type="button" className={`${className} ${styles.clickable}`} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
