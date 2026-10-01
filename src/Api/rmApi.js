import { apiFetch } from './apiFetch';

/*
 * Endpoints for Relationship Managers — field marketers who onboard
 * facilities (hospitals, pharmacies, labs) and organisations into the HMO.
 *
 * Every path here is REFERENCE — taken from the working HTML RM dashboard.
 */
export const rmApi = {
  /* { hospitals: [...], pharmacies: [...], laboratories: [...] } */
  facilities: () => apiFetch('/admin/infrastructures'),

  createHospital: (body) => apiFetch('/admin/hospitals', { method: 'POST', body }),
  createPharmacy: (body) => apiFetch('/admin/pharmacies', { method: 'POST', body }),
  createLaboratory: (body) => apiFetch('/admin/laboratories', { method: 'POST', body }),

  /* [{ id, name, contactEmail, industry, createdAt, hmoStatus, hmoPlan, memberCount, hmoExpiry }] */
  organisations: () => apiFetch('/rm/organisations'),
  /* Same endpoint as the public HMO form, tagged createdBy: RELATIONSHIP_MANAGER */
  onboardOrganisation: (body) => apiFetch('/admin/hmo', { method: 'POST', body: { ...body, createdBy: 'RELATIONSHIP_MANAGER' } }),
  confirmHmo: (id) => apiFetch(`/rm/organisations/${id}/confirm-hmo`, { method: 'PUT' }),
};
