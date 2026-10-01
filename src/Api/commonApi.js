import { apiFetch } from './apiFetch';

/* Endpoints shared by every signed-in role (GUESS — correct here). */
export const commonApi = {
  notifications: () => apiFetch('/notifications/me'),
  markNotificationRead: (id) => apiFetch(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => apiFetch('/notifications/me/read-all', { method: 'PUT' }),
};
