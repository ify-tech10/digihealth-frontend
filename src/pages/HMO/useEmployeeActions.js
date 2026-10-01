import { useState } from 'react';
import { hmoApi } from '../../Api/hmoApi';
import { employeeName } from './hmoFields';

/* Re-send invite / remove from plan, shared by the dashboard and the Employees page. */
export function useEmployeeActions({ showToast, onChanged }) {
  const [inviting, setInviting] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);

  async function invite(e) {
    setInviting(e.id);
    try {
      await hmoApi.resendInvite(e.id);
      showToast('success', `Invite re-sent to ${e.email || employeeName(e)}.`);
    } catch (err) {
      showToast('error', `Invite not sent: ${err.message}`);
    } finally {
      setInviting(null);
    }
  }

  async function remove(e, reason) {
    setBusy(true);
    try {
      await hmoApi.deactivateEmployee(e.id, reason);
      showToast('success', `${employeeName(e)} removed from the plan.`);
      setRemoving(null);
      onChanged?.();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy(false);
    }
  }

  return { inviting, invite, removing, setRemoving, remove, busy };
}
