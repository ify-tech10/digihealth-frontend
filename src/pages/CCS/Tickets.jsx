import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../../hooks/useToast';
import { usePageHeader } from '../../hooks/usePageHeader';
import { useTickets } from './useTickets';
import TicketWorkspace from './components/TicketWorkspace';

const VIEWS = {
  ALL: ['All Tickets', 'Every conversation assigned to you', 'Ticket Inbox'],
  URGENT: ['Urgent Tickets', 'Reply to these first', 'Urgent'],
  ESCALATED: ['Escalated Tickets', 'Handed to another team — keep the patient updated', 'Escalated'],
  RESOLVED: ['Resolved Tickets', 'Closed conversations — reopen if the patient comes back', 'Resolved'],
};

/* /ccs/tickets, /ccs/tickets/urgent, …  —  ?ticket=ID opens that ticket. */
export default function Tickets({ scope }) {
  const [title, subtitle, cardTitle] = VIEWS[scope || 'ALL'];
  usePageHeader(title, subtitle);
  const { toast, showToast, clearToast } = useToast();

  const [params] = useSearchParams();
  const [selectedId, setSelectedId] = useState(params.get('ticket'));
  const tickets = useTickets();

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}
      <TicketWorkspace
        wide
        title={cardTitle}
        scope={scope}
        tickets={tickets}
        selectedId={selectedId}
        onSelect={setSelectedId}
        showToast={showToast}
      />
    </>
  );
}
