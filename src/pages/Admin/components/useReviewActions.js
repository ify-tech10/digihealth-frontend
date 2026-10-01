import { useState } from 'react';

/*
 * Approve / reject flow shared by provider and HMO applications.
 *
 * const review = useReviewActions({
 *   approveFn: adminApi.approveProvider,
 *   rejectFn: adminApi.rejectProvider,
 *   nameOf: (a) => a.fullName,
 *   onChanged: reload,
 *   showToast,
 * });
 */
export function useReviewActions({ approveFn, rejectFn, nameOf, onChanged, showToast }) {
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  async function approve(item) {
    setBusyId(item.id);
    try {
      await approveFn(item.id);
      showToast('success', `${nameOf(item)} approved.`);
      onChanged?.();
      return true;
    } catch (err) {
      showToast('error', `Approval failed: ${err.message}`);
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function reject(item, reason) {
    setBusyId(item.id);
    try {
      await rejectFn(item.id, reason);
      showToast('success', `${nameOf(item)} rejected.`);
      setRejecting(null);
      onChanged?.();
      return true;
    } catch (err) {
      showToast('error', `Rejection failed: ${err.message}`);
      return false;
    } finally {
      setBusyId(null);
    }
  }

  return { busyId, approve, reject, rejecting, setRejecting };
}
