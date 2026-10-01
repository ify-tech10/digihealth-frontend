import { useState } from 'react';
import { rmApi } from '../../Api/rmApi';
import { orgName } from './rmFields';

/* Confirm an organisation's HMO — shared by the dashboard, Organisations and HMO Status pages. */
export function useConfirmHmo({ showToast, onChanged }) {
  const [asking, setAsking] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function confirm(org) {
    setBusyId(org.id);
    try {
      await rmApi.confirmHmo(org.id);
      showToast('success', `HMO confirmed for ${orgName(org)}.`);
      setAsking(null);
      onChanged?.();
      return true;
    } catch (err) {
      showToast('error', `Couldn’t confirm: ${err.message}`);
      return false;
    } finally {
      setBusyId(null);
    }
  }

  return { asking, setAsking, busyId, confirm };
}
