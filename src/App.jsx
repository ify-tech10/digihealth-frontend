import { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

/* ── LAYOUTS ── */
import PublicLayout from './components/layout/PublicLayout/PublicLayout';
import DashboardLayout from './components/layout/DashboardLayout/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import { financeApi } from './Api/financeApi';

/* ── PUBLIC PAGES ── */
import Home       from './pages/public/Home';
import Why        from './pages/public/Why';
import Services   from './pages/public/Services';
import Programs   from './pages/public/Programs';
import Contact    from './pages/public/Contact';
import PostNatal  from './pages/public/PostNatal';
import HMO        from './pages/public/Hmo';
import HowItWorks from './pages/public/HowItWorks';
import Apply      from './pages/public/Apply';
import Privacy      from './pages/public/Privacy';

/* ── AUTH ── */
import Login from './pages/auth/Login';
import ResetPassword from './pages/auth/ResetPassword';

/* ── ADMIN (loaded only when an admin opens them) ── */
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const CareRequests = lazy(() => import('./pages/Admin/CareRequests'));
const Patients = lazy(() => import('./pages/Admin/Patients'));
const Personnel = lazy(() => import('./pages/Admin/Personnel'));
const Schedule = lazy(() => import('./pages/Admin/Schedule'));
const Applications = lazy(() => import('./pages/Admin/Applications'));
const HmoCoverage = lazy(() => import('./pages/Admin/HmoCoverage'));
const Facilities = lazy(() => import('./pages/Admin/Facilities'));
const Analytics = lazy(() => import('./pages/Admin/Analytics'));
const Financials = lazy(() => import('./pages/Admin/Financials'));
const Settings = lazy(() => import('./pages/Admin/Settings'));
const Users = lazy(() => import('./pages/Admin/Users'));
const HmoPlans = lazy(() => import('./pages/Admin/HmoPlans'));
const HmoSubscriptions = lazy(() => import('./pages/Admin/HmoSubscriptions'));
const FinancialRequests = lazy(() => import('./pages/Admin/FinancialRequests'));
const ActivityLog = lazy(() => import('./pages/Admin/ActivityLog'));

/* ── PROVIDER PORTAL (doctors, nurses, caregivers) ── */
const ProviderDashboard = lazy(() => import('./pages/Caregivers/ProviderDashboard'));
const MySchedule        = lazy(() => import('./pages/Caregivers/MySchedule'));
const MyPatients        = lazy(() => import('./pages/Caregivers/MyPatients'));
const MyAvailability    = lazy(() => import('./pages/Caregivers/MyAvailability'));
const VisitReports      = lazy(() => import('./pages/Caregivers/VisitReports'));
const MyProfile         = lazy(() => import('./pages/Caregivers/MyProfile'));
const Earnings          = lazy(() => import('./pages/Caregivers/Earnings'));

/* ── SUPERVISOR PORTAL (CNO, Medical Director and other clinical leads) ── */
const CnoDashboard        = lazy(() => import('./pages/CNO/CnoDashboard'));
const Team                = lazy(() => import('./pages/CNO/Team'));
const Performance         = lazy(() => import('./pages/CNO/Performance'));
const VisitReportReview   = lazy(() => import('./pages/CNO/VisitReportReview'));
const ExportReports       = lazy(() => import('./pages/CNO/ExportReports'));
const MyFinancialRequests = lazy(() => import('./pages/CNO/MyFinancialRequests'));

/* Customer Care */
const CcsDashboard     = lazy(() => import('./pages/CCS/CcsDashboard'));
const Tickets          = lazy(() => import('./pages/CCS/Tickets'));
const PatientLookup    = lazy(() => import('./pages/CCS/PatientLookup'));
const CareRequestsDesk = lazy(() => import('./pages/CCS/CareRequestsDesk'));
const MyPerformance    = lazy(() => import('./pages/CCS/MyPerformance'));

/* Lab scientists & pharmacists (one portal) */
const LabDashboard  = lazy(() => import('./pages/Lab_Pharm_Scientist/LabDashboard'));
const LabRequests   = lazy(() => import('./pages/Lab_Pharm_Scientist/Requests'));
const LabSchedule   = lazy(() => import('./pages/Lab_Pharm_Scientist/Schedule'));
const LabCatalogue  = lazy(() => import('./pages/Lab_Pharm_Scientist/Catalogue'));
const LabHistory    = lazy(() => import('./pages/Lab_Pharm_Scientist/History'));

/* Relationship Managers */
const RmDashboard     = lazy(() => import('./pages/RM/RmDashboard'));
const RmFacilities    = lazy(() => import('./pages/RM/Facilities'));
const RmOrganisations = lazy(() => import('./pages/RM/Organisations'));

/* Patient portal */
const PatientDashboard = lazy(() => import('./pages/Patient/PatientDashboard'));
const PatientBookings  = lazy(() => import('./pages/Patient/Bookings'));
const CareHistory      = lazy(() => import('./pages/Patient/CareHistory'));
const CareReports      = lazy(() => import('./pages/Patient/CareReports'));
const PatientPayments  = lazy(() => import('./pages/Patient/Payments'));
const PatientSupport   = lazy(() => import('./pages/Patient/Support'));
const PatientProfile   = lazy(() => import('./pages/Patient/Profile'));

/* Partner facilities: hospitals, pharmacies & lab centres */
const HospitalDashboard = lazy(() => import('./pages/Hospital/HospitalDashboard'));
const HospitalReferrals = lazy(() => import('./pages/Hospital/Referrals'));
const PharmacyDashboard = lazy(() => import('./pages/Pharmarcy/PharmacyDashboard'));
const PharmacyOrders    = lazy(() => import('./pages/Pharmarcy/Orders'));
const LabCentreDashboard = lazy(() => import('./pages/Laboratory/LabCentreDashboard'));
const LabCentreRequests  = lazy(() => import('./pages/Laboratory/TestRequests'));
const LabCentreTests     = lazy(() => import('./pages/Laboratory/TestMenu'));
const FacilityInvoices  = lazy(() => import('./pages/Facility/Invoices'));
const FacilityProfile   = lazy(() => import('./pages/Facility/FacilityProfile'));

/* HMO organisation admin */
const HmoDashboard  = lazy(() => import('./pages/HMO/HmoDashboard'));
const HmoEmployees  = lazy(() => import('./pages/HMO/Employees'));
const HmoUploads    = lazy(() => import('./pages/HMO/UploadRecords'));
const HmoReports    = lazy(() => import('./pages/HMO/Reports'));
const HmoOrgPlans   = lazy(() => import('./pages/HMO/Plans'));

/* Finance Manager — fund requests reuse the supervisor page with finance endpoints */
const FINANCE_REQUESTS = { list: financeApi.financialRequests, create: financeApi.createFinancialRequest };
const FinanceDashboard = lazy(() => import('./pages/FinanceManager/FinanceDashboard'));
const Invoices         = lazy(() => import('./pages/FinanceManager/Invoices'));
const Payments         = lazy(() => import('./pages/FinanceManager/Payments'));
const HmoClaims        = lazy(() => import('./pages/FinanceManager/HmoClaims'));
const ExpenseClaims    = lazy(() => import('./pages/FinanceManager/ExpenseClaims'));
const FacilityBills    = lazy(() => import('./pages/FinanceManager/FacilityBills'));
const Payroll          = lazy(() => import('./pages/FinanceManager/Payroll'));
const Budget           = lazy(() => import('./pages/FinanceManager/Budget'));
const Reports          = lazy(() => import('./pages/FinanceManager/Reports'));

const SUPERVISOR_ROLES = [
  'CNO_MEDICAL_DIRECTOR', 'CNO', 'CHIEF_MEDICAL_OFFICER',
  'HEAD_OF_CLINICAL_OPERATIONS', 'NURSING_SUPERVISOR',
];

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── PUBLIC (shared nav + footer) ── */}
        <Route element={<PublicLayout />}>
          <Route path="/"              element={<Home />} />
          <Route path="/why"           element={<Why />} />
          <Route path="/contact"       element={<Contact />} />
          <Route path="/hmo"           element={<HMO />} />
          <Route path="/services"      element={<Services />} />
          <Route path="/programs"      element={<Programs />} />
          <Route path="/how-it-works"  element={<HowItWorks />} />
          <Route path="/postnatal"     element={<PostNatal />} />
          <Route path="/privacy"     element={<Privacy />} />
          
          <Route path="/apply"         element={<Apply />} />
        </Route>

        {/* ── AUTH ── */}
         <Route path="/login" element={<Login />} /> 
         <Route path="/reset-password" element={<ResetPassword />} />
         <Route path="/set-password"   element={<ResetPassword />} />

        {/* ── CLINICAL SUPERVISORS: CNO, Medical Director… (one portal) ── */}
        <Route element={<ProtectedRoute roles={SUPERVISOR_ROLES} />}>
          <Route element={<DashboardLayout role="CNO" />}>
            <Route path="/cno"                    element={<CnoDashboard />} />
            <Route path="/cno/applications"       element={<Applications />} />
            <Route path="/cno/requests"           element={<CareRequests />} />
            <Route path="/cno/personnel"          element={<Team />} />
            <Route path="/cno/schedule"           element={<Schedule />} />
            <Route path="/cno/performance"        element={<Performance />} />
            <Route path="/cno/visit-reports"      element={<VisitReportReview />} />
            <Route path="/cno/exports"            element={<ExportReports />} />
            <Route path="/cno/financial-requests" element={<MyFinancialRequests />} />
            <Route path="/cno/settings"           element={<Settings />} />
          </Route>
        </Route>

        {/* ── CCS ── */}
        <Route element={<ProtectedRoute roles={['CUSTOMER_CARE']} />}>
          <Route element={<DashboardLayout role="CCS" />}>
            <Route path="/ccs"                   element={<CcsDashboard />} />
            <Route path="/ccs/tickets"           element={<Tickets key="all" />} />
            <Route path="/ccs/tickets/urgent"    element={<Tickets key="urgent" scope="URGENT" />} />
            <Route path="/ccs/tickets/resolved"  element={<Tickets key="resolved" scope="RESOLVED" />} />
            <Route path="/ccs/tickets/escalated" element={<Tickets key="escalated" scope="ESCALATED" />} />
            <Route path="/ccs/patients"          element={<PatientLookup />} />
            <Route path="/ccs/care-requests"     element={<CareRequestsDesk />} />
            <Route path="/ccs/performance"       element={<MyPerformance />} />
            <Route path="/ccs/schedule"          element={<Schedule />} />
            <Route path="/ccs/profile"           element={<Settings />} />
          </Route>
        </Route>

        {/* ── PATIENT ── */}
        <Route element={<ProtectedRoute roles={['PATIENT']} />}>
          <Route element={<DashboardLayout role="PATIENT" />}>
            <Route path="/patient"              element={<PatientDashboard />} />
            <Route path="/patient/bookings"     element={<PatientBookings />} />
            <Route path="/patient/care-history" element={<CareHistory />} />
            <Route path="/patient/care-reports" element={<CareReports />} />
            <Route path="/patient/payments"     element={<PatientPayments />} />
            <Route path="/patient/support"      element={<PatientSupport />} />
            <Route path="/patient/profile"      element={<PatientProfile />} />
            <Route path="/patient/settings"     element={<Settings />} />
          </Route>
        </Route>

        {/* ── DOCTORS / NURSES / CAREGIVERS (one portal) ── */}
        <Route element={<ProtectedRoute roles={['SERVICE_PROVIDER', 'CLINICAL_PERSONNEL']} />}>
          <Route element={<DashboardLayout role="PROVIDER" />}>
            <Route path="/caregiver"              element={<ProviderDashboard />} />
            <Route path="/caregiver/schedule"     element={<MySchedule />} />
            <Route path="/caregiver/patients"     element={<MyPatients />} />
            <Route path="/caregiver/availability" element={<MyAvailability />} />
            <Route path="/caregiver/reports"      element={<VisitReports />} />
            <Route path="/caregiver/profile"      element={<MyProfile />} />
            <Route path="/caregiver/earnings"     element={<Earnings />} />
            <Route path="/caregiver/settings"     element={<Settings />} />
          </Route>
        </Route>
        {/* old /personnel links → provider portal */}
        <Route path="/personnel/*" element={<Navigate to="/caregiver" replace />} />

        {/* ── ADMIN (signed-in ADMIN only) ── */}
        <Route element={<ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']} />}>
          <Route element={<DashboardLayout role="ADMIN" />}>
            <Route path="/admin"                element={<AdminDashboard />} />
            <Route path="/admin/care-requests"  element={<CareRequests />} />
            <Route path="/admin/patients"       element={<Patients />} />
            <Route path="/admin/personnel"      element={<Personnel />} />
            <Route path="/admin/schedule"       element={<Schedule />} />
            <Route path="/admin/applications"   element={<Applications />} />
            <Route path="/admin/hmo-coverage"   element={<HmoCoverage />} />
            <Route path="/admin/hospitals"      element={<Facilities kind="hospitals" key="hospitals" />} />
            <Route path="/admin/pharmacies"     element={<Facilities kind="pharmacies" key="pharmacies" />} />
            <Route path="/admin/laboratories"   element={<Facilities kind="laboratories" key="laboratories" />} />
            <Route path="/admin/analytics"      element={<Analytics />} />
            <Route path="/admin/financials"     element={<Financials />} />
            <Route path="/admin/settings"       element={<Settings />} />
            <Route path="/admin/users"          element={<Users />} />
            <Route path="/admin/hmo-plans"      element={<HmoPlans />} />
            <Route path="/admin/hmo-subscriptions" element={<HmoSubscriptions />} />
            <Route path="/admin/financial-requests" element={<FinancialRequests />} />
            <Route path="/admin/activity"       element={<ActivityLog />} />
          </Route>
        </Route>

        {/* ── HMO / FINANCE / RELATIONSHIP / MEDICAL ── */}
        <Route element={<ProtectedRoute roles={['FINANCE_MANAGER']} />}>
          <Route element={<DashboardLayout role="FINANCE" />}>
            <Route path="/finance"                    element={<FinanceDashboard />} />
            <Route path="/finance/invoices"           element={<Invoices />} />
            <Route path="/finance/payments"           element={<Payments />} />
            <Route path="/finance/hmo-claims"         element={<HmoClaims />} />
            <Route path="/finance/expenses"           element={<ExpenseClaims />} />
            <Route path="/finance/facility-bills"     element={<FacilityBills />} />
            <Route path="/finance/payroll"            element={<Payroll />} />
            <Route path="/finance/budget"             element={<Budget />} />
            <Route path="/finance/reports"            element={<Reports />} />
            <Route path="/finance/financial-requests" element={<MyFinancialRequests api={FINANCE_REQUESTS} cacheKey="fin-requests" />} />
            <Route path="/finance/settings"           element={<Settings />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['HOSPITAL_ADMIN']} />}>
          <Route element={<DashboardLayout role="HOSPITAL" />}>
            <Route path="/hospital"           element={<HospitalDashboard />} />
            <Route path="/hospital/referrals" element={<HospitalReferrals />} />
            <Route path="/hospital/invoices"  element={<FacilityInvoices />} />
            <Route path="/hospital/profile"   element={<FacilityProfile />} />
            <Route path="/hospital/settings"  element={<Settings />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['PHARMACY_ADMIN']} />}>
          <Route element={<DashboardLayout role="PHARMACY" />}>
            <Route path="/pharmacy"          element={<PharmacyDashboard />} />
            <Route path="/pharmacy/orders"   element={<PharmacyOrders />} />
            <Route path="/pharmacy/invoices" element={<FacilityInvoices />} />
            <Route path="/pharmacy/profile"  element={<FacilityProfile />} />
            <Route path="/pharmacy/settings" element={<Settings />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['LAB_ADMIN']} />}>
          <Route element={<DashboardLayout role="LABORATORY" />}>
            <Route path="/laboratory"          element={<LabCentreDashboard />} />
            <Route path="/laboratory/requests" element={<LabCentreRequests />} />
            <Route path="/laboratory/tests"    element={<LabCentreTests />} />
            <Route path="/laboratory/invoices" element={<FacilityInvoices />} />
            <Route path="/laboratory/profile"  element={<FacilityProfile />} />
            <Route path="/laboratory/settings" element={<Settings />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['HMO']} />}>
          <Route element={<DashboardLayout role="HMO" />}>
            <Route path="/hmo-dashboard"           element={<HmoDashboard />} />
            <Route path="/hmo-dashboard/employees" element={<HmoEmployees />} />
            <Route path="/hmo-dashboard/uploads"   element={<HmoUploads />} />
            <Route path="/hmo-dashboard/reports"   element={<HmoReports />} />
            <Route path="/hmo-dashboard/plans"     element={<HmoOrgPlans />} />
            <Route path="/hmo-dashboard/settings"  element={<Settings />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute roles={['RELATIONSHIP_MANAGER']} />}>
          <Route element={<DashboardLayout role="RM" />}>
            <Route path="/relationship"               element={<RmDashboard />} />
            <Route path="/relationship/facilities"    element={<RmFacilities />} />
            <Route path="/relationship/organisations" element={<RmOrganisations key="all" />} />
            <Route path="/relationship/hmo"           element={<RmOrganisations key="hmo" mode="hmo" />} />
            <Route path="/relationship/settings"      element={<Settings />} />
          </Route>
        </Route>
        <Route path="/medical/*"        element={<Navigate to="/cno" replace />} />
        <Route element={<ProtectedRoute roles={['LAB_SCIENTIST', 'PHARMACIST']} />}>
          <Route element={<DashboardLayout role="LAB" />}>
            <Route path="/lab"           element={<LabDashboard />} />
            <Route path="/lab/requests"  element={<LabRequests />} />
            <Route path="/lab/schedule"  element={<LabSchedule />} />
            <Route path="/lab/history"   element={<LabHistory />} />
            <Route path="/lab/catalogue" element={<LabCatalogue />} />
            <Route path="/lab/settings"  element={<Settings />} />
          </Route>
        </Route>
        <Route path="/lab-scientist/*"  element={<Navigate to="/lab" replace />} />
        <Route path="/pharmacist/*"     element={<Navigate to="/lab" replace />} />

        {/* ── FALLBACK ── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}