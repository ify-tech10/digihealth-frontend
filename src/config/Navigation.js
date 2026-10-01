import { roleLabel } from './userRoles';
import AgentStatus from '../pages/CCS/components/AgentStatus';

/*
 * Sidebar navigation per role.
 *
 * icon     -> a name from components/Icon/Icon.jsx
 * badgeKey -> a live count the page reports via setBadges({ key: n })
 * end      -> exact-match the path when highlighting the active item
 * topbarExtra -> a component shown in the topbar (e.g. the CCS Online/Away chip)
 */
export const NAVIGATION = {
  ADMIN: {
    subtitle: 'Admin Panel',
    sections: [
      {
        section: 'Overview',
        items: [
          { path: '/admin', label: 'Dashboard', icon: 'grid', end: true },
        ],
      },
      {
        section: 'Management',
        items: [
          { path: '/admin/care-requests', label: 'Care Requests', icon: 'file', badgeKey: 'careRequests' },
          { path: '/admin/users',         label: 'Users',         icon: 'users' },
          { path: '/admin/patients',      label: 'Patients',      icon: 'users' },
          { path: '/admin/personnel',     label: 'Personnel',     icon: 'heart' },
          { path: '/admin/schedule',      label: 'Schedule',      icon: 'calendar' },
          { path: '/admin/applications',  label: 'Applications',  icon: 'userPlus', badgeKey: 'applications' },
        ],
      },
      {
        section: 'HMO',
        items: [
          { path: '/admin/hmo-coverage',      label: 'HMO Onboarding', icon: 'briefcase', badgeKey: 'hmo' },
          { path: '/admin/hmo-plans',         label: 'HMO Plans',      icon: 'file' },
          { path: '/admin/hmo-subscriptions', label: 'Subscriptions',  icon: 'check' },
        ],
      },
      {
        section: 'Infrastructure',
        items: [
          { path: '/admin/hospitals',    label: 'Hospitals',    icon: 'home' },
          { path: '/admin/pharmacies',   label: 'Pharmacies',   icon: 'plusHouse' },
          { path: '/admin/laboratories', label: 'Laboratories', icon: 'flask' },
        ],
      },
      {
        section: 'Finance',
        items: [
          { path: '/admin/financial-requests', label: 'Financial Requests', icon: 'dollar', badgeKey: 'financial' },
          { path: '/admin/financials',         label: 'Payments',           icon: 'trendingUp' },
        ],
      },
      {
        section: 'Reports',
        items: [
          { path: '/admin/analytics', label: 'Analytics',    icon: 'activity' },
          { path: '/admin/activity',  label: 'Activity Log', icon: 'clock' },
        ],
      },
      {
        section: 'System',
        items: [
          { path: '/admin/settings', label: 'Settings', icon: 'settings' },
        ],
      },
    ],
  },

  /* Doctors, nurses and caregivers share one portal */
  PROVIDER: {
    subtitle: 'Personnel Portal',
    avatarColor: '#16a34a',
    sections: [
      {
        section: 'Main',
        items: [
          { path: '/caregiver',              label: 'Dashboard',       icon: 'grid', end: true },
          { path: '/caregiver/schedule',     label: 'My Schedule',     icon: 'calendar' },
          { path: '/caregiver/patients',     label: 'My Patients',     icon: 'users', badgeKey: 'newAssignments' },
          { path: '/caregiver/availability', label: 'My Availability', icon: 'clock' },
          { path: '/caregiver/reports',      label: 'Visit Reports',   icon: 'file' },
        ],
      },
      {
        section: 'Account',
        items: [
          { path: '/caregiver/profile',  label: 'My Profile', icon: 'userPlus' },
          { path: '/caregiver/earnings', label: 'Earnings',   icon: 'dollar' },
          { path: '/caregiver/settings', label: 'Settings',   icon: 'settings' },
        ],
      },
    ],
  },

  /* Clinical supervisors: Chief Nursing Officer, Medical Director and similar */
  CNO: {
    subtitle: 'Clinical Supervisor',
    subtitleFor: (role) => roleLabel(role),
    logo: 'CNO',
    logoFor: (role) => (String(role).toUpperCase() === 'CNO' || String(role).toUpperCase() === 'NURSING_SUPERVISOR' ? 'CNO' : 'MD'),
    avatarColor: '#0891b2',
    theme: {
      '--logo-bg': '#0891b2',
      '--nav-active-bg': 'rgba(8, 145, 178, 0.18)',
      '--nav-active-fg': '#67e8f9',
      '--sidebar-w': '250px',
    },
    sections: [
      {
        section: 'Overview',
        items: [
          { path: '/cno', label: 'Dashboard', icon: 'grid', end: true },
        ],
      },
      {
        section: 'Approvals',
        items: [
          { path: '/cno/applications', label: 'Provider Applications', icon: 'userPlus', badgeKey: 'applications' },
          { path: '/cno/requests',     label: 'Service Requests',      icon: 'file', badgeKey: 'careRequests' },
        ],
      },
      {
        section: 'Team',
        items: [
          { path: '/cno/personnel',   label: 'Nurses & Caregivers', icon: 'users' },
          { path: '/cno/schedule',    label: 'Team Schedule',       icon: 'calendar' },
          { path: '/cno/performance', label: 'Performance',         icon: 'activity' },
        ],
      },
      {
        section: 'Reports',
        items: [
          { path: '/cno/visit-reports', label: 'Visit Reports',  icon: 'file', badgeKey: 'reports' },
          { path: '/cno/exports',       label: 'Export Reports', icon: 'download' },
        ],
      },
      {
        section: 'Finance',
        items: [
          { path: '/cno/financial-requests', label: 'Financial Requests', icon: 'dollar' },
        ],
      },
      {
        section: 'System',
        items: [
          { path: '/cno/settings', label: 'Settings', icon: 'settings' },
        ],
      },
    ],
  },

  /* Customer Care Specialists */
  CCS: {
    subtitle: 'Customer Care',
    logo: 'CCS',
    avatarColor: '#0891b2',
    topbarExtra: AgentStatus,
    theme: {
      '--logo-bg': '#0891b2',
      '--nav-active-bg': 'rgba(8, 145, 178, 0.18)',
      '--nav-active-fg': '#67e8f9',
      '--sidebar-w': '250px',
    },
    sections: [
      {
        section: 'Main',
        items: [
          { path: '/ccs', label: 'Dashboard', icon: 'grid', end: true },
        ],
      },
      {
        section: 'Tickets',
        items: [
          { path: '/ccs/tickets',           label: 'All Tickets', icon: 'message', badgeKey: 'tickets', end: true },
          { path: '/ccs/tickets/urgent',    label: 'Urgent',      icon: 'alert',   badgeKey: 'urgent' },
          { path: '/ccs/tickets/resolved',  label: 'Resolved',    icon: 'check' },
          { path: '/ccs/tickets/escalated', label: 'Escalated',   icon: 'link',    badgeKey: 'escalated', badgeTone: 'teal' },
        ],
      },
      {
        section: 'Patients',
        items: [
          { path: '/ccs/patients',      label: 'Patient Lookup', icon: 'users' },
          { path: '/ccs/care-requests', label: 'Care Requests',  icon: 'file' },
        ],
      },
      {
        section: 'Reports',
        items: [
          { path: '/ccs/performance', label: 'My Performance', icon: 'activity' },
          { path: '/ccs/schedule',    label: 'Schedule',       icon: 'calendar' },
        ],
      },
      {
        section: 'Account',
        items: [
          { path: '/ccs/profile', label: 'My Profile', icon: 'userPlus' },
        ],
      },
    ],
  },

  /* Finance Manager */
  FINANCE: {
    subtitle: 'Finance Manager',
    logo: 'FM',
    avatarColor: '#1d4ed8',
    theme: {
      '--logo-bg': '#1d4ed8',
      '--nav-active-bg': 'rgba(29, 78, 216, 0.22)',
      '--nav-active-fg': '#93c5fd',
      '--sidebar-w': '250px',
    },
    sections: [
      {
        section: 'Overview',
        items: [
          { path: '/finance', label: 'Dashboard', icon: 'grid', end: true },
        ],
      },
      {
        section: 'Revenue',
        items: [
          { path: '/finance/invoices',   label: 'Invoices',    icon: 'file',   badgeKey: 'invoices' },
          { path: '/finance/payments',   label: 'Payments',    icon: 'card' },
          { path: '/finance/hmo-claims', label: 'HMO Billing', icon: 'shield', badgeKey: 'hmo' },
        ],
      },
      {
        section: 'Expenses',
        items: [
          { path: '/finance/expenses',       label: 'Expense Claims', icon: 'dollar',    badgeKey: 'expenses' },
          { path: '/finance/facility-bills', label: 'Facility Bills', icon: 'plusHouse', badgeKey: 'bills' },
          { path: '/finance/payroll',        label: 'Payroll',        icon: 'users' },
        ],
      },
      {
        section: 'Analysis',
        items: [
          { path: '/finance/budget',  label: 'Budget vs Actual',  icon: 'activity' },
          { path: '/finance/reports', label: 'Financial Reports', icon: 'download' },
        ],
      },
      {
        section: 'Requests',
        items: [
          { path: '/finance/financial-requests', label: 'Fund Requests', icon: 'briefcase' },
        ],
      },
      {
        section: 'System',
        items: [
          { path: '/finance/settings', label: 'Settings', icon: 'settings' },
        ],
      },
    ],
  },

  /* HMO organisation admin — the company whose staff are on a DiGi HMO plan */
  HMO: {
    subtitle: 'HMO Admin Panel',
    logo: 'HMO',
    avatarColor: '#7c3aed',
    theme: {
      '--logo-bg': '#7c3aed',
      '--nav-active-bg': 'rgba(124, 58, 237, 0.22)',
      '--nav-active-fg': '#c4b5fd',
    },
    sections: [
      {
        section: 'Overview',
        items: [
          { path: '/hmo-dashboard', label: 'Dashboard', icon: 'grid', end: true },
        ],
      },
      {
        section: 'Management',
        items: [
          { path: '/hmo-dashboard/employees', label: 'Employees',      icon: 'users', badgeKey: 'pending', badgeTone: 'teal' },
          { path: '/hmo-dashboard/uploads',   label: 'Upload Records', icon: 'file' },
        ],
      },
      {
        section: 'Reports',
        items: [
          { path: '/hmo-dashboard/reports', label: 'Reports',   icon: 'activity' },
          { path: '/hmo-dashboard/plans',   label: 'HMO Plans', icon: 'dollar' },
        ],
      },
      {
        section: 'System',
        items: [
          { path: '/hmo-dashboard/settings', label: 'Settings', icon: 'settings' },
        ],
      },
    ],
  },

  /* Lab scientists and pharmacists share one portal; wording follows the role */
  LAB: {
    subtitle: 'Lab & Pharmacy',
    subtitleFor: (role) => (String(role).toUpperCase() === 'PHARMACIST' ? 'Pharmacist' : 'Lab Scientist'),
    logoFor: (role) => (String(role).toUpperCase() === 'PHARMACIST' ? 'Rx' : 'LAB'),
    avatarColor: '#059669',
    theme: {
      '--logo-bg': '#059669',
      '--nav-active-bg': 'rgba(5, 150, 105, 0.2)',
      '--nav-active-fg': '#6ee7b7',
    },
    sections: [
      {
        section: 'Overview',
        items: [
          { path: '/lab', label: 'Dashboard', icon: 'grid', end: true },
        ],
      },
      {
        section: 'Work',
        items: [
          { path: '/lab/requests', label: 'Service Requests', icon: 'file', badgeKey: 'newRequests' },
          { path: '/lab/schedule', label: 'Schedule',         icon: 'calendar' },
          { path: '/lab/history',  label: 'History',          icon: 'clock' },
        ],
      },
      {
        section: 'Inventory',
        items: [
          { path: '/lab/catalogue', label: 'Catalogue & Prices', icon: 'flask' },
        ],
      },
      {
        section: 'System',
        items: [
          { path: '/lab/settings', label: 'Settings', icon: 'settings' },
        ],
      },
    ],
  },

  /* Relationship Managers — onboard facilities and organisations into the HMO */
  RM: {
    subtitle: 'RM Panel',
    logo: 'RM',
    avatarColor: '#1e7fd4',
    theme: {
      '--logo-bg': '#1e7fd4',
      '--nav-active-bg': 'rgba(30, 127, 212, 0.2)',
      '--nav-active-fg': '#93c5fd',
    },
    sections: [
      {
        section: 'Overview',
        items: [
          { path: '/relationship', label: 'Dashboard', icon: 'grid', end: true },
        ],
      },
      {
        section: 'Onboarding',
        items: [
          { path: '/relationship/facilities',    label: 'Facilities',    icon: 'home' },
          { path: '/relationship/organisations', label: 'Organisations', icon: 'briefcase' },
        ],
      },
      {
        section: 'HMO',
        items: [
          { path: '/relationship/hmo', label: 'HMO Status', icon: 'shield', badgeKey: 'pendingHmo' },
        ],
      },
      {
        section: 'System',
        items: [
          { path: '/relationship/settings', label: 'Settings', icon: 'settings' },
        ],
      },
    ],
  },

  /* Partner hospitals: referrals in, invoices out */
  HOSPITAL: {
    subtitle: 'Hospital Admin',
    logo: 'H+',
    avatarColor: '#e11d48',
    theme: {
      '--logo-bg': '#e11d48',
      '--nav-active-bg': 'rgba(255, 255, 255, 0.12)',
      '--nav-active-fg': '#fda4af',
    },
    sections: [
      {
        section: 'Overview',
        items: [
          { path: '/hospital', label: 'Dashboard', icon: 'grid', end: true },
        ],
      },
      {
        section: 'From DiGi Health',
        items: [
          { path: '/hospital/referrals', label: 'Referrals', icon: 'users', badgeKey: 'newRequests' },
        ],
      },
      {
        section: 'Billing',
        items: [
          { path: '/hospital/invoices', label: 'Invoices', icon: 'dollar' },
        ],
      },
      {
        section: 'Account',
        items: [
          { path: '/hospital/profile',  label: 'Facility Profile', icon: 'home' },
          { path: '/hospital/settings', label: 'Settings',         icon: 'settings' },
        ],
      },
    ],
  },

  /* Partner pharmacies: drug orders in, invoices out */
  PHARMACY: {
    subtitle: 'Pharmacy Admin',
    logo: 'Rx',
    avatarColor: '#16a34a',
    theme: {
      '--logo-bg': '#16a34a',
      '--nav-active-bg': 'rgba(255, 255, 255, 0.12)',
      '--nav-active-fg': '#86efac',
    },
    sections: [
      {
        section: 'Overview',
        items: [
          { path: '/pharmacy', label: 'Dashboard', icon: 'grid', end: true },
        ],
      },
      {
        section: 'From DiGi Health',
        items: [
          { path: '/pharmacy/orders', label: 'Drug Orders', icon: 'plusHouse', badgeKey: 'newRequests' },
        ],
      },
      {
        section: 'Billing',
        items: [
          { path: '/pharmacy/invoices', label: 'Invoices', icon: 'dollar' },
        ],
      },
      {
        section: 'Account',
        items: [
          { path: '/pharmacy/profile',  label: 'Facility Profile', icon: 'home' },
          { path: '/pharmacy/settings', label: 'Settings',         icon: 'settings' },
        ],
      },
    ],
  },
  LABORATORY: {
    subtitle: 'Laboratory Admin',
    logo: 'Lab',
    avatarColor: '#d97706',
    theme: {
      '--logo-bg': '#d97706',
      '--nav-active-bg': 'rgba(255, 255, 255, 0.12)',
      '--nav-active-fg': '#fcd34d',
    },
    sections: [
      {
        section: 'Overview',
        items: [
          { path: '/laboratory', label: 'Dashboard', icon: 'grid', end: true },
        ],
      },
      {
        section: 'From DiGi Health',
        items: [
          { path: '/laboratory/requests', label: 'Test Requests', icon: 'flask', badgeKey: 'newRequests' },
        ],
      },
      {
        section: 'Laboratory',
        items: [
          { path: '/laboratory/tests', label: 'Test Menu & Prices', icon: 'layers' },
        ],
      },
      {
        section: 'Billing',
        items: [
          { path: '/laboratory/invoices', label: 'Invoices', icon: 'dollar' },
        ],
      },
      {
        section: 'Account',
        items: [
          { path: '/laboratory/profile',  label: 'Facility Profile', icon: 'home' },
          { path: '/laboratory/settings', label: 'Settings',         icon: 'settings' },
        ],
      },
    ],
  },
  PATIENT: {
    subtitle: 'Patient Portal',
    logo: 'DH',
    avatarColor: '#1a2550',
    theme: {
      '--logo-bg': 'rgba(255, 255, 255, 0.12)',
      '--nav-active-bg': 'rgba(255, 255, 255, 0.12)',
      '--nav-active-fg': '#fff',
    },
    sections: [
      {
        section: 'Main',
        items: [
          { path: '/patient',              label: 'Dashboard',        icon: 'grid', end: true },
          { path: '/patient/bookings',     label: 'My Bookings',      icon: 'calendar', badgeKey: 'upcoming', badgeTone: 'teal' },
          { path: '/patient/care-history', label: 'Care History',     icon: 'activity' },
          { path: '/patient/care-reports', label: 'Care Reports',     icon: 'file' },
          { path: '/patient/payments',     label: 'Bills & Payments', icon: 'card', badgeKey: 'unpaid' },
        ],
      },
      {
        section: 'Account',
        items: [
          { path: '/patient/profile',  label: 'My Profile',      icon: 'users' },
          { path: '/patient/settings', label: 'Settings',        icon: 'settings' },
          { path: '/patient/support',  label: 'Contact Support', icon: 'phone', badgeKey: 'replies' },
        ],
      },
    ],
  },
};
