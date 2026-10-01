# DiGi Health — API endpoints the frontend calls

Generated from `src/Api/*.js` (plus the login and public pages) on 1 Oct 2026. These paths are **proposals** for the new Spring Boot backend: if a path or field name changes, change it in the matching `src/Api/*.js` file and the pages follow.

**189 endpoints** in total: 8 public (no login) and 181 more for signed-in users. `POST /care-requests` is public and also used by Customer Care, so it's counted once. The 13 lab-scientist/pharmacist endpoints serve both `/lab/me` and `/pharmacy/me` from one parameterised controller.

## Conventions the frontend already relies on

- **Base URL:** `VITE_API_BASE` (see `.env.example`), e.g. `http://localhost:8080/api`. Every path below is relative to it.
- **Auth: short-lived access token in memory, refresh token in an httpOnly cookie.** Nothing secret is stored in the browser where scripts can read it.
  - `POST /auth/login { email, password, remember }` returns `{ accessToken, role, name, email, id }` in the body **and** sets the refresh token as a cookie: `Set-Cookie: dh_refresh=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth`. Add `Max-Age` (e.g. 30 days) only when `remember` is true; otherwise leave it out so it's a session cookie. Do **not** put the refresh token in the response body.
  - The access token is a JWT with an `exp` claim, short-lived (e.g. 15 minutes). The frontend keeps it in memory only and sends `Authorization: Bearer <accessToken>` on every other call.
  - `POST /auth/refresh` has no body; the browser sends the cookie on its own (the frontend uses `credentials: 'include'` and adds an `X-Requested-With: DiGiHealth` header). Validate the cookie, **rotate** it (new `Set-Cookie`, old one revoked) and return `{ accessToken }`. If the token is missing, expired, revoked or reused, return 401. If a rotated-out token is used again, revoke that whole token family. Store refresh tokens server-side (hashed) so they can be revoked.
  - The frontend refreshes on page load (the access token is gone after a reload), about 30 seconds before `exp`, and on any 401; it then retries the request once. Calls that happen at the same moment share a single refresh. If the refresh fails, the user is signed out.
  - `POST /auth/logout` (cookie plus bearer if still valid): revoke the refresh token and clear the cookie (`Max-Age=0`).
  - **CORS and hosting:** the cookie is `SameSite=Strict`, so serve the API on the **same site** as the app, e.g. `app.digihealth.ng` and `api.digihealth.ng`, or one domain with `/api`. Cross-site cookies are blocked by Safari and increasingly by Chrome. If the API is on another origin, set `Access-Control-Allow-Credentials: true`, list the frontend origin explicitly (no `*`) and allow the `Authorization`, `Content-Type` and `X-Requested-With` headers. In local dev, Vite forwards `/api` to Spring Boot (see `.env.example`), so everything is same-origin.
- **Roles** (the `role` string at login) must be one of: `ADMIN`, `SUPER_ADMIN` (same portal as ADMIN), `SERVICE_PROVIDER`, `CLINICAL_PERSONNEL`, `PATIENT`, `HMO`, `RELATIONSHIP_MANAGER`, `LAB_SCIENTIST`, `PHARMACIST`, `CNO_MEDICAL_DIRECTOR`, `CNO`, `CHIEF_MEDICAL_OFFICER`, `HEAD_OF_CLINICAL_OPERATIONS`, `NURSING_SUPERVISOR`, `CUSTOMER_CARE`, `FINANCE_MANAGER`, `HOSPITAL_ADMIN`, `PHARMACY_ADMIN`, `LAB_ADMIN`. Any other role is refused at login.
- **`/me` endpoints** are scoped by the token: the backend works out the patient, HMO, facility, agent, etc. from the signed-in user. Never trust an id sent from the browser for these.
- **Lists:** a plain JSON array **or** a Spring `Page` (`{ content: [...] }`) both work.
- **Errors:** any non-2xx with `{ "message": "…" }` (or `{ "error": "…" }`). The message is shown to the user as-is, so keep it human-readable.
- **Bodies:** JSON unless marked *multipart*. In multipart forms, list fields such as invoice `items` and lab `results` are sent as a JSON string.
- **Dates:** ISO-8601 strings (`2026-10-01T09:00:00Z`; plain dates as `2026-10-01`). **Money:** naira as plain numbers (no kobo).
- **Status enums:** pages accept common synonyms (e.g. `PENDING`/`NEW`, `COMPLETED`/`DONE`), but use one consistent set per entity.

## Public (no login)

| Method | Path | Body | Used by |
|---|---|---|---|
| POST | `/auth/login` | JSON {email,password,remember} | Login page → body `{ accessToken, role, name, email, id }` + `Set-Cookie: dh_refresh` (httpOnly) |
| POST | `/auth/refresh` | none (refresh cookie) | Automatic: on page load, before expiry and on a 401 → `{ accessToken }` + rotated `Set-Cookie` |
| POST | `/auth/logout` | none (refresh cookie) | "Sign out" in every portal → revoke the token, clear the cookie |
| POST | `/auth/forgot-password` | JSON {email} | Login → "Forgot password?" (always shows the same message) |
| POST | `/auth/reset-password` | JSON {token,password} | `/reset-password?token=` and `/set-password?token=` (new-account invite) pages |
| POST | `/auth/provider/apply` | multipart (CV, licence, …) | Public "Apply as a provider" form |
| POST | `/care-requests` | JSON {fullName,email,phoneNumber,address,locationArea,serviceNeeded,description,preferredContactTime} | Public **Book care** page — this is how patients sign up (see below). Also used by CCS to log a phone request. Response: `{ id, accountCreated }` |
| POST | `/hmo/apply` | JSON | Public HMO application form |

**Patient sign-up (Book care page):** there's no separate registration. When `POST /care-requests` arrives:
1. Look up the email (store it lower-cased; the form sends it lower-cased).
2. **New email:** create a `PATIENT` user with no usable password, link the care request to them, email a set-password link (`{site}/set-password?token=…`, single-use and expiring, e.g. after 72 hours) and return `accountCreated: true`.
3. **Existing email:** attach the request to that patient, send no link and return `accountCreated: false`. The page then tells them to sign in instead.
4. After setting a password at `/set-password`, the patient signs in at `/login` and lands on `/patient`, where the request shows under **My Bookings**.

A patient booking from inside the portal (`POST /patient/me/bookings`) is already signed in, so no email is needed.

**Emails the backend must send:** the password-reset link → `{site}/reset-password?token=…`; the invite for any account created by an admin, RM, CNO or HMO → `{site}/set-password?token=…`. Both are handled by `POST /auth/reset-password`.

## Shared (every signed-in user)

**Roles:** any role · **Frontend:** Notifications bell in every dashboard top bar. · **File:** `src/Api/commonApi.js` · 3 endpoints

| Method | Path | Query | Body | Frontend function — notes |
|---|---|---|---|---|
| GET | `/notifications/me` |  |  | `notifications` |
| PUT | `/notifications/{id}/read` |  |  | `markNotificationRead` |
| PUT | `/notifications/me/read-all` |  |  | `markAllNotificationsRead` |

## Admin portal

**Roles:** ADMIN, SUPER_ADMIN · **Frontend:** `/admin` — users, providers, care requests, facilities, HMO plans/subscriptions, finances, analytics. · **File:** `src/Api/adminApi.js` · 36 endpoints

| Method | Path | Query | Body | Frontend function — notes |
|---|---|---|---|---|
| GET | `/admin/care-requests` | status |  | `careRequests` — Care requests |
| PUT | `/admin/care-requests/{id}/assign` |  | JSON {providerId,adminNote} | `assignCareRequest` |
| GET | `/admin/providers/available` | careRequestId, location |  | `availableProviders` |
| GET | `/admin/providers` | status |  | `providers` — Service providers / personnel |
| PUT | `/admin/providers/{id}/approve` |  |  | `approveProvider` |
| PUT | `/admin/providers/{id}/reject` |  | JSON {reason} | `rejectProvider` |
| GET | `/admin/patients` |  |  | `patients` — Patients |
| GET | `/admin/visits` | date |  | `visits` — Schedule / visits for one day, date = YYYY-MM-DD |
| GET | `/admin/hmo` | status |  | `hmoApplications` — HMO company applications |
| PUT | `/admin/hmo/{id}/approve` |  |  | `approveHmo` |
| PUT | `/admin/hmo/{id}/reject` |  | JSON {reason} | `rejectHmo` |
| GET | `/admin/{kind}` |  |  | `facilities` — Facilities: kind = hospitals / pharmacies / laboratories |
| POST | `/admin/{kind}` |  | JSON | `createFacility` |
| PUT | `/admin/{kind}/{id}` |  | JSON | `updateFacility` |
| DELETE | `/admin/{kind}/{id}` |  |  | `deleteFacility` |
| GET | `/admin/payments` |  |  | `payments` — Payments |
| PUT | `/admin/care-requests/{id}/approve-closure` |  | JSON {note} | `approveClosure` — Care request closure: provider closes, supervisor/admin approves |
| PUT | `/admin/care-requests/{id}/reject-closure` |  | JSON {reason} | `rejectClosure` |
| GET | `/admin/users` | role |  | `users` — Users: admin creates every other user |
| POST | `/admin/users` |  | JSON | `createUser` |
| PUT | `/admin/users/{id}/activate` |  |  | `activateUser` |
| PUT | `/admin/users/{id}/deactivate` |  |  | `deactivateUser` |
| GET | `/admin/hmo/plans` |  |  | `hmoPlans` — HMO plans — every plan has a benefit limit |
| POST | `/admin/hmo/plans` |  | JSON | `createHmoPlan` |
| PUT | `/admin/hmo/plans/{id}` |  | JSON | `updateHmoPlan` |
| GET | `/admin/hmo/subscriptions` | status |  | `hmoSubscriptions` — HMO subscriptions — expire yearly, renew on payment |
| POST | `/admin/hmo/subscriptions` |  | JSON | `createHmoSubscription` |
| PUT | `/admin/hmo/subscriptions/{id}/renew` |  | JSON | `renewHmoSubscription` |
| GET | `/admin/financial-requests` | status |  | `financialRequests` — Financial requests from MD / CNO / finance manager |
| PUT | `/admin/financial-requests/{id}/approve` |  | JSON {note} | `approveFinancialRequest` |
| PUT | `/admin/financial-requests/{id}/reject` |  | JSON {reason} | `rejectFinancialRequest` |
| GET | `/admin/invoices` | status |  | `invoices` — Invoices raised by hospitals / pharmacies / labs |
| PUT | `/admin/invoices/{id}/approve` |  | JSON {note} | `approveInvoice` |
| PUT | `/admin/invoices/{id}/reject` |  | JSON {reason} | `rejectInvoice` |
| GET | `/admin/activity` |  |  | `activity` — Activity log across all users |
| POST | `/auth/change-password` |  | JSON {currentPassword,newPassword} | `changePassword` — Account |

## CNO / clinical leadership

**Roles:** CNO, CNO_MEDICAL_DIRECTOR, CHIEF_MEDICAL_OFFICER, HEAD_OF_CLINICAL_OPERATIONS, NURSING_SUPERVISOR · **Frontend:** `/cno` — team, visit-report review, performance, financial requests. · **File:** `src/Api/cnoApi.js` · 12 endpoints

| Method | Path | Query | Body | Frontend function — notes |
|---|---|---|---|---|
| GET | `/cno/dashboard/stats` |  |  | `stats` — Dashboard (REFERENCE) |
| GET | `/cno/activity` | limit |  | `activity` |
| GET | `/caregivers` | status |  | `team` |
| GET | `/cno/visits/daily` | from, to |  | `dailyVisits` — Daily visit counts for the chart: [{ date, scheduled, completed }] |
| POST | `/cno/providers` |  | JSON | `createProvider` — Supervisors can create providers directly |
| GET | `/cno/visit-reports` |  |  | `visitReports` — Review providers' visit reports |
| PUT | `/cno/visit-reports/{id}/approve` |  | JSON {note} | `approveVisitReport` |
| PUT | `/cno/visit-reports/{id}/return` |  | JSON {reason} | `returnVisitReport` |
| GET | `/cno/performance` | month |  | `performance` — Team performance for a month, month = YYYY-MM |
| GET | `/cno/visits` | from, to |  | `visits` — Visits in a date range, for exports |
| GET | `/cno/financial-requests` |  |  | `financialRequests` — Financial requests raised by this supervisor → admin approves |
| POST | `/cno/financial-requests` |  | multipart | `createFinancialRequest` |

## Caregivers / providers

**Roles:** SERVICE_PROVIDER, CLINICAL_PERSONNEL · **Frontend:** `/caregiver` — schedule, availability, patients, visit reports, earnings. · **File:** `src/Api/providerApi.js` · 19 endpoints

| Method | Path | Query | Body | Frontend function — notes |
|---|---|---|---|---|
| GET | `/caregivers/me/dashboard` |  |  | `dashboard` — Dashboard (REFERENCE) |
| GET | `/caregivers/me/schedule/today` |  |  | `scheduleToday` |
| GET | `/caregivers/me/availability/status` |  |  | `availabilityStatus` |
| PUT | `/caregivers/me/availability/status` |  | JSON {isAvailable} | `setAvailabilityStatus` |
| GET | `/caregivers/me/earnings/summary` |  |  | `earningsSummary` |
| GET | `/caregivers/me/patients` |  |  | `patients` |
| PUT | `/caregivers/me/requests/{requestId}/close` |  | JSON {closureNote} | `closeRequest` — Assigned requests: close → supervisor approves |
| GET | `/caregivers/me/visits` | from, to |  | `visits` — Visits: from/to = YYYY-MM-DD |
| POST | `/caregivers/me/visits` |  | JSON | `scheduleVisit` |
| PUT | `/caregivers/me/visits/{id}/status` |  | JSON {status} | `updateVisitStatus` |
| GET | `/caregivers/me/availability` | month |  | `availabilityMonth` — Monthly availability calendar, month = YYYY-MM |
| PUT | `/caregivers/me/availability` |  | JSON | `saveAvailability` |
| GET | `/caregivers/me/visit-reports` |  |  | `visitReports` — Visit reports / activity documentation |
| POST | `/caregivers/me/visit-reports` |  | JSON | `createVisitReport` |
| GET | `/caregivers/me/profile` |  |  | `profile` — Profile incl. bank account, BVN, NIN |
| PUT | `/caregivers/me/profile` |  | JSON | `updateProfile` |
| GET | `/caregivers/me/earnings/structure` |  |  | `earningStructure` — Earning structure + payout history |
| PUT | `/caregivers/me/earnings/structure` |  | JSON | `setEarningStructure` |
| GET | `/caregivers/me/earnings` |  |  | `payouts` |

## Customer Care (CCS)

**Roles:** CUSTOMER_CARE · **Frontend:** `/ccs` — tickets inbox, patient lookup, care-request desk. · **File:** `src/Api/ccsApi.js` · 16 endpoints

<details><summary>Shapes the pages read</summary>

```
Endpoints for Customer Care Specialists (role CUSTOMER_CARE).

  REFERENCE -> from the endpoint contract in the HTML CCS dashboard

Ticket shape the pages read (other common names are tolerated too):
  { id, name, subject, preview, type, status, unread, createdAt, updatedAt,
    messages: [{ from: 'agent' | 'patient', name, text, createdAt }],
    patient:  { id, name, phone, email, plan, nurse, status } }
```
</details>

| Method | Path | Query | Body | Frontend function — notes |
|---|---|---|---|---|
| GET | `/customer-care/me/stats` |  |  | `stats` — Dashboard + tickets (REFERENCE) |
| GET | `/customer-care/me/tickets` |  |  | `tickets` |
| GET | `/customer-care/me/tickets/{id}` |  |  | `ticket` |
| POST | `/customer-care/me/tickets/{id}/reply` |  | JSON {message} | `reply` |
| PATCH | `/customer-care/me/tickets/{id}/resolve` |  | note | `resolve` |
| PATCH | `/customer-care/me/tickets/{id}/escalate` |  | JSON {escalateTo,note} | `escalate` — the reference sent no body — escalateTo is one of ESCALATION_TEAMS below |
| GET | `/customer-care/me/activity` | limit |  | `activity` |
| GET | `/patients/{id}` |  |  | `patient` |
| POST | `/customer-care/me/tickets` |  | JSON | `createTicket` — Tickets logged from a call / WhatsApp / walk-in |
| PATCH | `/customer-care/me/tickets/{id}/reopen` |  |  | `reopen` |
| GET | `/customer-care/me/status` |  |  | `myStatus` — Online / Away : { status: 'ONLINE' / 'AWAY' } |
| PUT | `/customer-care/me/status` |  | JSON {status} | `setStatus` |
| GET | `/customer-care/patients` | q |  | `searchPatients` — Patient lookup by name, phone, email or patient ID |
| GET | `/customer-care/care-requests` | status |  | `careRequests` — Care requests (list is a |
| POST | `/care-requests` |  | JSON | `logCareRequest` |
| GET | `/customer-care/me/performance` | month |  | `performance` |

## Finance Manager

**Roles:** FINANCE_MANAGER · **Frontend:** `/finance` — invoices, payments, HMO claims, expense claims, facility bills, payroll, budget. · **File:** `src/Api/financeApi.js` · 27 endpoints

| Method | Path | Query | Body | Frontend function — notes |
|---|---|---|---|---|
| GET | `/finance/summary` | month |  | `summary` |
| GET | `/finance/monthly` | year |  | `monthly` — [{ month: 'YYYY-MM', revenue, expenses }] |
| GET | `/finance/revenue-by-service` | month |  | `revenueByService` — [{ service, amount }] |
| GET | `/finance/activity` | limit |  | `activity` |
| GET | `/finance/invoices` | status |  | `invoices` — Invoices — standard patients get one per care request; corporate clients too |
| POST | `/finance/invoices` |  | JSON | `createInvoice` |
| POST | `/finance/invoices/{id}/remind` |  |  | `sendReminder` |
| PUT | `/finance/invoices/{id}/cancel` |  | JSON {reason} | `cancelInvoice` |
| GET | `/finance/payments` |  |  | `payments` — Payments — recording one against an invoice marks it paid / part-paid |
| POST | `/finance/payments` |  | JSON | `recordPayment` |
| GET | `/finance/hmo-claims` | status |  | `hmoClaims` — HMO claims to insurers |
| POST | `/finance/hmo-claims` |  | JSON | `createHmoClaim` |
| POST | `/finance/hmo-claims/{id}/follow-up` |  | JSON {note} | `followUpHmoClaim` |
| PUT | `/finance/hmo-claims/{id}/paid` |  | JSON | `markHmoClaimPaid` |
| GET | `/finance/expense-claims` | status |  | `expenseClaims` — Staff expense claims |
| PUT | `/finance/expense-claims/{id}/approve` |  | JSON {note} | `approveExpense` |
| PUT | `/finance/expense-claims/{id}/reject` |  | JSON {reason} | `rejectExpense` |
| GET | `/finance/facility-invoices` | status |  | `facilityBills` — Bills from hospitals / pharmacies / labs, once the admin has approved them |
| PUT | `/finance/facility-invoices/{id}/pay` |  | JSON | `payFacilityBill` |
| GET | `/finance/payroll` | month |  | `payroll` — Payroll: salaried staff + providers paid by their earning structure |
| POST | `/finance/payroll/process` |  | JSON {month} | `processPayroll` |
| PUT | `/finance/payroll/{id}/paid` |  | JSON {reference} | `markPayslipPaid` |
| GET | `/finance/budget` | month |  | `budget` — Budget: [{ category, budgeted, actual }] for a month |
| PUT | `/finance/budget` |  | JSON {month,lines} | `setBudget` |
| GET | `/finance/reports` | type, from, to |  | `report` |
| GET | `/finance/financial-requests` |  |  | `financialRequests` — Finance Manager raises fund requests → admin approves |
| POST | `/finance/financial-requests` |  | multipart | `createFinancialRequest` |

## HMO organisation admin

**Roles:** HMO · **Frontend:** `/hmo-dashboard` — employees, CSV uploads, utilisation, plans. · **File:** `src/Api/hmoApi.js` · 11 endpoints

| Method | Path | Query | Body | Frontend function — notes |
|---|---|---|---|---|
| GET | `/hmo/me/summary` |  |  | `summary` — Dashboard: { registered, totalEmployees, pending, newUploads } |
| GET | `/hmo/me/subscription` |  |  | `subscription` |
| GET | `/hmo/me/employees` | status |  | `employees` — Employees (each becomes an HMO patient once registered) |
| POST | `/hmo/me/employees` |  | JSON | `addEmployee` |
| POST | `/hmo/me/employees/{id}/invite` |  |  | `resendInvite` — re-send the email asking the employee to finish registration (next of kin + consent) |
| PUT | `/hmo/me/employees/{id}/deactivate` |  | JSON {reason} | `deactivateEmployee` |
| POST | `/hmo/me/employees/upload` |  | multipart | `uploadEmployees` — Bulk upload: FormData { file } → { created, updated, skipped, errors: [{ row, message }] } |
| GET | `/hmo/me/uploads` |  |  | `uploads` |
| GET | `/hmo/me/utilisation` | year |  | `utilisation` |
| GET | `/hmo/plans` |  |  | `plans` — Plans on offer, and asking DiGi to move the organisation to another one |
| POST | `/hmo/me/plan-change` |  | JSON {planId,note} | `requestPlanChange` |

## Relationship Manager

**Roles:** RELATIONSHIP_MANAGER · **Frontend:** `/relationship` — onboarding facilities and organisations, confirming HMO. · **File:** `src/Api/rmApi.js` · 7 endpoints

| Method | Path | Query | Body | Frontend function — notes |
|---|---|---|---|---|
| GET | `/admin/infrastructures` |  |  | `facilities` — { hospitals: [...], pharmacies: [...], laboratories: [...] } |
| POST | `/admin/hospitals` |  | JSON | `createHospital` |
| POST | `/admin/pharmacies` |  | JSON | `createPharmacy` |
| POST | `/admin/laboratories` |  | JSON | `createLaboratory` |
| GET | `/rm/organisations` |  |  | `organisations` — [{ id, name, contactEmail, industry, createdAt, hmoStatus, hmoPlan, memberCount, hmoExpiry }] |
| POST | `/admin/hmo` |  | JSON {...body,createdBy:'RELATIONSHIP_MANAGER'} | `onboardOrganisation` — Same endpoint as the public HMO form, tagged createdBy: RELATIONSHIP_MANAGER |
| PUT | `/rm/organisations/{id}/confirm-hmo` |  |  | `confirmHmo` |

## Lab scientist & pharmacist (DiGi staff)

**Roles:** LAB_SCIENTIST → /lab/me, PHARMACIST → /pharmacy/me · **Frontend:** `/lab` — requests from the medical team, schedule, catalogue, history. · **File:** `src/Api/labApi.js` · 13 endpoints

<details><summary>Shapes the pages read</summary>

```
Endpoints for Lab Scientists and Pharmacists. Both receive service requests
straight from the senior medical team (CNO / Medical Director), fulfil them at
the patient's home, and price every item for inventory. Requests are never
deleted — a request that can't be fulfilled is declined back to the team.

  labApi('LAB')      -> /lab/me/...
  labApi('PHARMACY') -> /pharmacy/me/...

path/shape HERE and the pages follow.

Request shape the pages read (other common names are tolerated):
  { id, requestNumber, status, priority, dueDate, scheduledAt, createdAt,
    patientName, patientPhone, address, locationArea, patientType,
    requestedByName, requestedByRole, notes,
    items: [{ id, name, quantity, unitPrice, instructions, sampleType }],
    totalAmount, resultUrl, resultSummary, receivedBy, completedAt }
```
</details>

| Method | Path | Query | Body | Frontend function — notes |
|---|---|---|---|---|
| GET | `/{lab|pharmacy}/me/summary` |  |  | `summary` — { newRequests, inProgress, dueToday, completedThisMonth, valueThisMonth } |
| GET | `/{lab|pharmacy}/me/activity` | limit |  | `activity` |
| GET | `/{lab|pharmacy}/me/requests` | status |  | `requests` |
| GET | `/{lab|pharmacy}/me/requests/{id}` |  |  | `request` |
| PUT | `/{lab|pharmacy}/me/requests/{id}/accept` |  | JSON | `accept` — body: { scheduledAt, items: [{ id, unitPrice }], note } |
| PUT | `/{lab|pharmacy}/me/requests/{id}/decline` |  | JSON {reason} | `decline` |
| PUT | `/{lab|pharmacy}/me/requests/{id}/start` |  | JSON {note} | `start` — lab: sample collected · pharmacy: out for delivery |
| PUT | `/{lab|pharmacy}/me/requests/{id}/results` |  | multipart | `submitResults` — lab: FormData { summary, abnormal, file } |
| PUT | `/{lab|pharmacy}/me/requests/{id}/deliver` |  | multipart | `confirmDelivery` — pharmacy: FormData { receivedBy, deliveredAt, note, proof } |
| GET | `/{lab|pharmacy}/me/catalogue` |  |  | `catalogue` — Price list (tests or drugs). Pharmacy items also carry stock. |
| POST | `/{lab|pharmacy}/me/catalogue` |  | JSON | `createItem` |
| PUT | `/{lab|pharmacy}/me/catalogue/{id}` |  | JSON | `updateItem` |
| PUT | `/{lab|pharmacy}/me/catalogue/{id}/stock` |  | JSON {change,reason} | `adjustStock` — body: { change: +/-n, reason } |

## Partner facilities

**Roles:** HOSPITAL_ADMIN, PHARMACY_ADMIN, LAB_ADMIN · **Frontend:** `/hospital`, `/pharmacy`, `/laboratory` — referrals / drug orders / test requests, invoices to DiGi, facility profile. The backend works out the facility from the token. · **File:** `src/Api/facilityApi.js` · 19 endpoints

<details><summary>Shapes the pages read</summary>

```
Endpoints for partner facility admins — hospitals, pharmacies and lab
centres that DiGi Health sends patients / drug orders / test requests to. The backend works out which
facility from the signed-in user, so the paths are the same for all three.

Hospital requests are referrals:
  { id, reference, status, urgency, createdAt, patient: { name, age, gender, phone, address, nextOfKin },
    reason, diagnosis, priorCareSummary, vitals, medications, allergies, referredByName, documents,
    expectedArrival, ward, admittedAt, dischargedAt, dischargeSummary }
Pharmacy requests are drug orders:
  { id, reference, status, urgency, createdAt, patient: { name, phone, address },
    items: [{ id, name, strength, quantity, instructions, unitPrice }], prescribedByName,
    dispatchAt, deliveredAt, receivedBy }
Lab requests are test requests:
  { id, reference, status, urgency, createdAt, patient: { name, age, gender, phone, address },
    tests: [{ id, name, code, sampleType, fasting, price, result }], collectionType: HOME | WALK_IN,
    clinicalNotes, requestedByName, scheduledAt, collectedAt, collectedBy, sampleId,
    resultedAt, critical, documents }
```
</details>

| Method | Path | Query | Body | Frontend function — notes |
|---|---|---|---|---|
| GET | `/facility/me/summary` |  |  | `summary` |
| GET | `/facility/me/requests` | status |  | `requests` |
| GET | `/facility/me/requests/{id}` |  |  | `request` |
| PUT | `/facility/me/requests/{id}/accept` |  | JSON | `accept` |
| PUT | `/facility/me/requests/{id}/decline` |  | JSON {reason} | `decline` |
| PUT | `/facility/me/requests/{id}/admit` |  | JSON | `admit` — hospital: patient arrived and admitted { ward, admittedAt } |
| PUT | `/facility/me/requests/{id}/discharge` |  | multipart | `discharge` — hospital: FormData { summary, outcome, followUp, file } |
| PUT | `/facility/me/requests/{id}/dispatch` |  | JSON | `dispatch` — pharmacy: rider has left |
| PUT | `/facility/me/requests/{id}/deliver` |  | multipart | `deliver` — pharmacy: FormData { receivedBy, deliveredAt, note, proof } |
| PUT | `/facility/me/requests/{id}/collect` |  | JSON | `collect` — lab: sample taken { sampleId, collectedBy, collectedAt, note } |
| PUT | `/facility/me/requests/{id}/results` |  | multipart | `submitResults` — lab: FormData { results: JSON [{ testId, value, unit, referenceRange, flag }], comment, critical, report } |
| GET | `/facility/me/tests` |  |  | `tests` — lab: the tests this centre offers, with prices DiGi sees when ordering |
| POST | `/facility/me/tests` |  | JSON | `createTest` |
| PUT | `/facility/me/tests/{id}` |  | JSON | `updateTest` |
| DELETE | `/facility/me/tests/{id}` |  |  | `deleteTest` |
| GET | `/facility/me/invoices` |  |  | `invoices` — Invoices to DiGi Health — admin approves, finance pays |
| POST | `/facility/me/invoices` |  | multipart | `createInvoice` — FormData { requestId?, items: JSON [{ description, quantity, unitPrice }], notes, attachment } |
| GET | `/facility/me/profile` |  |  | `profile` |
| PUT | `/facility/me/profile` |  | JSON | `updateProfile` |

## Patient

**Roles:** PATIENT · **Frontend:** `/patient` — bookings, visits, care plan, reports, bills, support, profile. · **File:** `src/Api/patientApi.js` · 19 endpoints

<details><summary>Shapes the pages read</summary>

```
Endpoints for the signed-in patient (or the family member managing their care).
Everything is scoped to "me" — the backend works out the patient from the token.

  serviceType, date, timeSlot, address, notes, caregiver: { name, role, phone, photoUrl },
  createdAt, confirmedAt, cancelReason }
Visit: { id, bookingId, serviceType, scheduledAt, checkInAt, checkOutAt, status,
  caregiver: { name, role }, vitals: { bloodPressure, pulse, temperature, spo2, bloodSugar, weight },
  summary, nextSteps, reportUrl, rating }
Care plan: { programName, serviceType, startDate, endDate, frequency, visitsPlanned, visitsCompleted,
  goals: [], coordinator: { name, phone } }
```
</details>

| Method | Path | Query | Body | Frontend function — notes |
|---|---|---|---|---|
| GET | `/patient/me/care-plan` |  |  | `carePlan` |
| GET | `/patient/me/bookings` |  |  | `bookings` |
| POST | `/patient/me/bookings` |  | JSON | `book` — { serviceType, date, timeSlot, address, notes, forSomeoneElse, careRecipient } |
| PUT | `/patient/me/bookings/{id}/reschedule` |  | JSON | `reschedule` |
| PUT | `/patient/me/bookings/{id}/cancel` |  | JSON {reason} | `cancel` |
| GET | `/patient/me/visits` |  |  | `visits` |
| POST | `/patient/me/visits/{id}/feedback` |  | JSON | `rateVisit` — { rating 1–5, comment } |
| GET | `/patient/me/lab-results` |  |  | `labResults` |
| GET | `/patient/me/medications` |  |  | `medications` |
| GET | `/patient/me/documents` |  |  | `documents` — Visit reports, lab reports, discharge summaries, prescriptions, care plans, receipts |
| GET | `/patient/me/invoices` |  |  | `invoices` |
| POST | `/patient/me/invoices/{id}/pay` |  |  | `pay` — Starts a card/transfer payment — returns { authorizationUrl } (e.g. Paystack) to redirect to |
| GET | `/patient/me/payments` |  |  | `payments` |
| GET | `/patient/me/tickets` |  |  | `tickets` |
| GET | `/patient/me/tickets/{id}` |  |  | `ticket` |
| POST | `/patient/me/tickets` |  | JSON | `createTicket` — { category, subject, message } — lands in the Customer Care inbox |
| POST | `/patient/me/tickets/{id}/reply` |  | JSON {message} | `reply` |
| GET | `/patient/me/profile` |  |  | `profile` |
| PUT | `/patient/me/profile` |  | JSON | `updateProfile` |

## Flows that cross portals

These are the places where one portal's action must show up in another. They are easy to miss when each module is built on its own.

- Patient **books care** (`POST /patient/me/bookings`) or the public form posts `/care-requests` → appears in Admin **Care Requests** and the CCS **Care Requests desk**. Admin assigns a provider → the patient sees it as **Upcoming** with the nurse.
- Caregiver submits a **visit report** → CNO **Visit Report Review** approves or returns it → once approved, it appears in the patient's **Care History** and **Care Reports**, with vitals.
- Patient **Support** messages (`/patient/me/tickets`) → the CCS **Tickets** inbox. CCS replies → the patient sees them (set `unreadForPatient`).
- Patient **rates a visit** low (1–2★) → raise a CCS ticket or a CNO alert.
- CNO / medical team request → **Lab scientist / Pharmacist** (`/lab/me`, `/pharmacy/me`).
- Care team referral / drug order / test request → **Hospital / Pharmacy / Lab centre** (`/facility/me/requests`). A **critical** lab result (`critical: true`) must alert the CNO / medical team straight away.
- Facility **invoice** (`POST /facility/me/invoices`) → Admin approval → Finance **Facility Bills** → paid → the facility sees **Paid**.
- Patient **pays** (`POST /patient/me/invoices/{id}/pay` returns `{ authorizationUrl }`, e.g. Paystack) → the provider redirects back to `/patient/payments?reference=…` → the backend confirms through the provider's webhook and marks the invoice paid.
- RM onboards a **facility / organisation** → user accounts created → invite email (`/set-password`). The HMO confirms → the organisation is active.
- HMO **adds or uploads employees** → they become patients with `patientType: HMO`. Their care is billed to the HMO and appears in Finance **HMO Claims**.
- CNO and Lab **financial requests** → Admin **Financial Requests** → Finance.
- Anything a user should be told about → `GET /notifications/me` (the bell is polled every 60 s).
