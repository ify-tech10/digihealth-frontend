import { humanize } from '../../../utils/format';
import { ticketStatus, typeLabel } from '../ticketFields';
import c from '../Ccs.module.css';

const TONE = {
  OPEN: c.tbOpen,
  URGENT: c.tbUrgent,
  PENDING: c.tbPending,
  ESCALATED: c.tbEscalated,
  RESOLVED: c.tbResolved,
  CLOSED: c.tbResolved,
};

export function StatusTag({ ticket }) {
  const st = ticketStatus(ticket);
  return <span className={`${c.tb} ${TONE[st] || c.tbOpen}`}>{humanize(st)}</span>;
}

export function TypeTag({ ticket }) {
  return <span className={`${c.tb} ${c.tbType}`}>{typeLabel(ticket)}</span>;
}
