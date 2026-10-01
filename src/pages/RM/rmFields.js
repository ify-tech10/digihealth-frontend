import { asList } from '../../Api/apiFetch';
import { pick } from '../../utils/format';

export const FACILITY_TYPES = [
  ['HOSPITAL', 'Hospital', 'Hospitals'],
  ['PHARMACY', 'Pharmacy', 'Pharmacies'],
  ['LAB', 'Laboratory', 'Lab Centres'],
];
export const TYPE_LABEL = Object.fromEntries(FACILITY_TYPES.map(([k, l]) => [k, l]));

/* /admin/infrastructures → one flat list with a `kind` on each row. */
export function flattenFacilities(data) {
  const d = data || {};
  const tag = (list, kind, nameKey) => asList(list).map((f) => ({
    ...f,
    kind,
    key: `${kind}-${f.id}`,
    displayName: pick(f, nameKey, 'name') || '—',
    area: pick(f, 'areaLga', 'locationArea', 'area'),
  }));
  return [
    ...tag(d.hospitals, 'HOSPITAL', 'hospitalName'),
    ...tag(d.pharmacies, 'PHARMACY', 'pharmacyName'),
    ...tag(d.laboratories, 'LAB', 'laboratoryName'),
  ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export const facilityStatus = (f) => {
  if (typeof f.enabled === 'boolean' && !f.enabled) return 'INACTIVE';
  return String(f.status || 'ACTIVE').toUpperCase();
};

/* ── Organisations ── */
export const orgName = (o) => pick(o, 'name', 'companyName', 'organisationName') || '—';
export const orgEmail = (o) => pick(o, 'contactEmail', 'email');
export const hmoStatus = (o) => String(pick(o, 'hmoStatus', 'applicationStatus', 'status') || 'PENDING').toUpperCase();
export const isConfirmed = (o) => ['CONFIRMED', 'ACTIVE', 'APPROVED'].includes(hmoStatus(o));

export const COMPANY_SIZES = [
  ['SIZE_1_10', '1 – 10'],
  ['SIZE_11_50', '11 – 50'],
  ['SIZE_51_200', '51 – 200'],
  ['SIZE_201_500', '201 – 500'],
  ['SIZE_500_1000', '500 – 1000'],
  ['SIZE_1000_PLUS', '1000+'],
];
export const SIZE_LABEL = Object.fromEntries(COMPANY_SIZES);

/* Comma-separated text → trimmed list */
export const splitList = (v) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean);
export const listText = (v) => (Array.isArray(v) ? v.join(', ') : v || '');
