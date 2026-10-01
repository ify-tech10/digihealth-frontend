import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ccsApi } from '../../Api/ccsApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { isResolved, isUrgent, sortTickets, ticketStatus } from './ticketFields';

/*
 * The agent's tickets, refreshed every minute, with the sidebar counts kept
 * up to date. After an action succeeds, `patch(id, changes)` shows the change
 * straight away; the patch is dropped once fresh data arrives from the server.
 */
export function useTickets() {
  const { setBadges } = useOutletContext();
  const state = useApi(() => ccsApi.tickets(), 'ccs-tickets');
  const { reload } = state;

  useEffect(() => {
    const t = setInterval(reload, 60000);
    return () => clearInterval(t);
  }, [reload]);

  const [patches, setPatches] = useState({ base: null, byId: {} });
  const byId = patches.base === state.data ? patches.byId : {};

  const patch = useCallback(
    (id, changes) =>
      setPatches((p) => {
        const current = p.base === state.data ? p.byId : {};
        return { base: state.data, byId: { ...current, [id]: { ...current[id], ...changes } } };
      }),
    [state.data]
  );

  const list = sortTickets(asList(state.data).map((t) => (byId[t.id] ? { ...t, ...byId[t.id] } : t)));

  const counts = {
    open: list.filter((t) => !isResolved(t)).length,
    urgent: list.filter((t) => !isResolved(t) && isUrgent(t)).length,
    escalated: list.filter((t) => ticketStatus(t) === 'ESCALATED').length,
  };

  const ready = !state.loading && !state.error;
  useEffect(() => {
    if (ready) setBadges({ tickets: counts.open, urgent: counts.urgent, escalated: counts.escalated });
  }, [ready, counts.open, counts.urgent, counts.escalated, setBadges]);

  return { ...state, list, counts, patch, patchOf: (id) => byId[id] };
}
