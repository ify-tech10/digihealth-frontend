import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import StatCard from '../../components/Statcard/Statcard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Toast from '../../components/Toast/Toast';
import Icon from '../../components/Icon/Icon';
import { rmApi } from '../../Api/rmApi';
import { asList } from '../../Api/apiFetch';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { formatDay, todayLabel } from '../../utils/format';
import { FacilityModal, FacilityOnboarding, OrgHmoModal, OrgOnboarding } from './components/RmModals';
import { useConfirmHmo } from './useConfirmHmo';
import { TYPE_LABEL, facilityStatus, flattenFacilities, hmoStatus, isConfirmed, orgEmail, orgName } from './rmFields';
import s from '../Admin/admin.module.css';
import r from './Rm.module.css';

const PREVIEW_ROWS = 6;

export default function RmDashboard() {
  const { setHeader, setBadges } = useOutletContext();
  const { toast, showToast, clearToast } = useToast();

  const facilities = useApi(() => rmApi.facilities(), 'rm-facilities');
  const orgs = useApi(() => rmApi.organisations(), 'rm-orgs');

  const [onboardingFacility, setOnboardingFacility] = useState(false);
  const [onboardingOrg, setOnboardingOrg] = useState(false);
  const [viewFacility, setViewFacility] = useState(null);
  const [viewOrg, setViewOrg] = useState(null);
  const hmo = useConfirmHmo({ showToast, onChanged: () => { orgs.reload(); setViewOrg(null); } });

  const facList = flattenFacilities(facilities.data);
  const orgList = asList(orgs.data).slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const pending = orgList.filter((o) => hmoStatus(o) === 'PENDING').length;

  useEffect(() => {
    setHeader({ title: 'RM Dashboard', subtitle: todayLabel() });
  }, [setHeader]);
  useEffect(() => {
    if (!orgs.loading && !orgs.error) setBadges({ pendingHmo: pending });
  }, [orgs.loading, orgs.error, pending, setBadges]);

  const v = (state, x) => (state.loading ? '…' : state.error ? '—' : x);
  const count = (k) => facList.filter((f) => f.kind === k).length;

  return (
    <>
      {toast && <Toast {...toast} onClose={clearToast} />}

      <div className={s.stats4}>
        <StatCard color="blue" icon="home" label="Total facilities" value={v(facilities, facList.length)} sub={facilities.loading || facilities.error ? 'Hospitals, pharmacies & labs' : `${count('HOSPITAL')} hospitals · ${count('PHARMACY')} pharmacies · ${count('LAB')} labs`} />
        <StatCard color="green" icon="briefcase" label="Organisations" value={v(orgs, orgList.length)} sub="Onboarded to HMO" />
        <StatCard color="orange" icon="shield" label="HMO confirmed" value={v(orgs, orgList.filter(isConfirmed).length)} sub="Active subscriptions" />
        <StatCard color="red" icon="alert" label="Pending reviews" value={v(orgs, pending)} sub="Awaiting confirmation" />
      </div>

      <div className={r.quick}>
        <button type="button" className={r.qa} onClick={() => setOnboardingFacility(true)}>
          <span className={r.pickIcon}><Icon name="plusHouse" /></span>
          <span><strong>Onboard a facility</strong><small>Hospital, pharmacy or laboratory</small></span>
        </button>
        <button type="button" className={r.qa} onClick={() => setOnboardingOrg(true)}>
          <span className={r.pickIcon}><Icon name="briefcase" /></span>
          <span><strong>Onboard an organisation</strong><small>Enrol a company into the HMO</small></span>
        </button>
      </div>

      <div className={s.grid2}>
        <div className={s.card}>
          <div className={s.cardHeader}><h3>Recent facilities</h3><Link to="/relationship/facilities">View all</Link></div>
          <div style={{ overflowX: 'auto' }}>
            <table className={s.previewTable}>
              <thead><tr><th>Name</th><th>Type</th><th>Status</th><th /></tr></thead>
              <tbody>
                {facilities.loading || !facList.length ? (
                  <tr><td colSpan={4} className={s.previewEmpty}>{facilities.loading ? 'Loading…' : facilities.error || 'No facilities onboarded yet.'}</td></tr>
                ) : facList.slice(0, PREVIEW_ROWS).map((f) => (
                  <tr key={f.key}>
                    <td className={s.tdName}>{f.displayName}<small>{f.area || ''}</small></td>
                    <td>{TYPE_LABEL[f.kind]}</td>
                    <td><StatusBadge status={facilityStatus(f)} /></td>
                    <td><button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewFacility(f)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={s.card}>
          <div className={s.cardHeader}><h3>Recent organisations</h3><Link to="/relationship/organisations">View all</Link></div>
          <div style={{ overflowX: 'auto' }}>
            <table className={s.previewTable}>
              <thead><tr><th>Name</th><th>Onboarded</th><th>HMO status</th><th /></tr></thead>
              <tbody>
                {orgs.loading || !orgList.length ? (
                  <tr><td colSpan={4} className={s.previewEmpty}>{orgs.loading ? 'Loading…' : orgs.error || 'No organisations onboarded yet.'}</td></tr>
                ) : orgList.slice(0, PREVIEW_ROWS).map((o) => (
                  <tr key={o.id}>
                    <td className={s.tdName}>{orgName(o)}<small>{orgEmail(o) || ''}</small></td>
                    <td className={s.muted}>{formatDay(o.createdAt)}</td>
                    <td><StatusBadge status={hmoStatus(o)} /></td>
                    <td><button type="button" className={`${s.btn} ${s.btnView}`} onClick={() => setViewOrg(o)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <FacilityOnboarding
        open={onboardingFacility}
        onClose={() => setOnboardingFacility(false)}
        onCreated={(name) => { setOnboardingFacility(false); showToast('success', `${name} onboarded.`); facilities.reload(); }}
      />
      <OrgOnboarding
        open={onboardingOrg}
        onClose={() => setOnboardingOrg(false)}
        onCreated={(name) => { setOnboardingOrg(false); showToast('success', `${name} onboarded — waiting for admin approval.`); orgs.reload(); }}
      />
      <FacilityModal facility={viewFacility} onClose={() => setViewFacility(null)} />
      <OrgHmoModal org={viewOrg} busy={hmo.busyId === viewOrg?.id} onClose={() => setViewOrg(null)} onConfirm={hmo.confirm} />
    </>
  );
}
