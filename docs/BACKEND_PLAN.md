# DiGi Health — backend build plan

A step-by-step order for building the Spring Boot backend (`com.digihealth`) behind this frontend. Work one layer at a time and don't start a step until the one before it passes its **Done when** check.

- **What to build:** [`API_ENDPOINTS.md`](API_ENDPOINTS.md) has all 189 endpoints, with bodies, shapes and conventions.
- **Stack:** Spring Boot · Spring Security · Spring Data JPA · PostgreSQL on **Supabase** · Flyway · **Cloudinary** (files) · **Resend** (email) · **Render** (hosting) · **GitHub** · **Postman** (testing) · Paystack test mode (payments).

---

## The routine for every module

Repeat these ten steps for each module in Phases 3–12. Each step is one layer.

1. **Migration:** add a Flyway file (`V<n>__<module>.sql`) with the tables, foreign keys and indexes.
2. **Entities and enums:** use enum values that match what the frontend reads (statuses, roles, service types).
3. **Repositories:** add the queries the pages need, always scoped to the signed-in user for `/me` endpoints.
4. **DTOs:** request and response records shaped exactly like `API_ENDPOINTS.md` shows. Never return entities directly.
5. **Service:** business rules, status changes (reject illegal ones, e.g. cancelling a completed visit) and side effects (emails, notifications).
6. **Controller:** paths and methods copied from `API_ENDPOINTS.md`. Validate input with `@Valid`.
7. **Security rule:** which roles may call these paths.
8. **Postman:** add each request to the collection folder for this module and test success, validation errors, the wrong role (403) and no token (401).
9. **Frontend check:** run `npm run dev`, sign in as that role and click through every page of the portal. Fix any field-name mismatch on the backend, or in the module's `src/Api/*.js` file.
10. **Commit** and push to GitHub.

---

## Phase 0 — Accounts and tools (one evening)

- [ ] **GitHub:** create a private repo `digihealth-backend` and protect `main`.
- [ ] **Supabase:** create a project. Copy the **Session pooler** connection string (port 5432, IPv4), not the direct one. Save the database password somewhere safe.
- [ ] **Cloudinary:** sign up and note the cloud name, API key and secret.
- [ ] **Resend:** sign up and create an API key. Use their test sender for now and verify your own domain before production.
- [ ] **Paystack:** sign up and take the **test** secret key.
- [ ] **Render:** sign up and connect GitHub (no service yet).
- [ ] **Postman:** create a workspace and an environment `DiGi local` with `baseUrl = http://localhost:8080/api`.
- [ ] **Locally:** JDK (21 or 25 LTS), IntelliJ or VS Code, Docker Desktop (optional, for a local Postgres) and the frontend's `.env.local` (already done).

**Done when:** every account exists and all keys are stored in a password manager, never in the repo.

---

## Phase 1 — Project skeleton

- [ ] Generate the project at start.spring.io: **Web, Security, Data JPA, Validation, PostgreSQL Driver, Flyway, Actuator, Mail** (+ Lombok if you like it). Add a JWT library (`jjwt`) and the Cloudinary SDK.
- [ ] Package layout by feature:
  `com.digihealth.{config, common, auth, user, notification, file, carerequest, patient, provider, cno, ccs, facility, lab, hmo, rm, finance, admin}`
- [ ] Add `application.yml` with **dev** and **prod** profiles. Every secret comes from an environment variable (`DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `CLOUDINARY_URL`, `RESEND_API_KEY`, `PAYSTACK_SECRET`, `FRONTEND_URL`).
- [ ] Prefix every endpoint with `/api` (`server.servlet.context-path: /api`).
- [ ] Add a **global error handler** (`@RestControllerAdvice`) that always returns `{ "message": "…" }`, plus `{ errors: { field: "…" } }` for validation errors.
- [ ] Add a **base entity** with `id`, `createdAt` and `updatedAt` (JPA auditing).
- [ ] **CORS:** allow `FRONTEND_URL` with credentials and the headers `Authorization`, `Content-Type` and `X-Requested-With`.
- [ ] Serialise dates as ISO-8601 (`write-dates-as-timestamps: false`).

**Done when:** the app starts against Supabase, `GET /api/actuator/health` returns `UP`, and Flyway has created its history table.

---

## Phase 2 — Users and roles (the foundation)

- [ ] `V1__users.sql` with `users` (email unique and lower-cased, password hash, `role`, `active`, name, phone, timestamps).
- [ ] Add a `Role` enum with exactly the 19 roles in `API_ENDPOINTS.md` (`ADMIN`, `SUPER_ADMIN`, `PATIENT`, `LAB_ADMIN`, …).
- [ ] **Seed the first super admin** at startup from env vars (`BOOTSTRAP_ADMIN_EMAIL`), only if no admin exists. They set their password through the `/set-password` email.
- [ ] Password hashing with BCrypt.

**Done when:** the super admin row exists after the first start.

---

## Phase 3 — Authentication (5 public endpoints + change-password)

Build these strictly in order. Everything else depends on them.

1. [ ] **Email service:** send through Resend over SMTP (or its REST API) with simple HTML templates: *set your password*, *reset your password*. Done when a test email arrives.
2. [ ] **Tokens table:** `V2__auth_tokens.sql` with
   - `refresh_tokens` (hash, user, family id, expires, revoked, replaced-by)
   - `password_tokens` (hash, user, type SET/RESET, expires, used)
   Store **hashes**, never raw tokens.
3. [ ] **JWT:** a 15-minute access token with `sub` (user id), `role` and `exp`. Add a security filter that reads `Authorization: Bearer`.
4. [ ] `POST /auth/login`: check the password and `active`. Return `{ accessToken, role, name, email, id }` and set the `dh_refresh` cookie (HttpOnly, Secure, SameSite=Strict, Path=/api/auth; add Max-Age only when `remember`). Rate-limit failed attempts.
5. [ ] `POST /auth/refresh`: read the cookie, **rotate** it, return `{ accessToken }`. If an old token is reused, revoke its whole family and return 401.
6. [ ] `POST /auth/logout`: revoke the token and clear the cookie.
7. [ ] `POST /auth/forgot-password`: always return 200 and email a reset link only if the account exists → `{FRONTEND_URL}/reset-password?token=…` (expires in 1 hour).
8. [ ] `POST /auth/reset-password`: works for both RESET and SET tokens (`/set-password` invites, 72 hours). Single use.
9. [ ] `POST /auth/change-password` (signed in).
10. [ ] **Security config:** public paths are `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/provider/apply`, `/care-requests` (POST) and `/hmo/apply`. Everything else needs a token. Add role rules per path prefix.

**Done when:** the super admin can set a password from the email, sign in on the real frontend, reload the page and stay signed in, and sign out. Check in the browser's dev tools that `dh_refresh` is HttpOnly.

---

## Phase 4 — Shared services

- [ ] **Files:** a `FileService` that uploads to Cloudinary and returns `{ name, url }`. Check type and size (≤ 10 MB) and use private delivery for medical documents.
- [ ] **Notifications** (3 endpoints): a `notifications` table and a `NotificationService.notify(user, title, body, link)` that every other module will call.
- [ ] **Activity log:** an `activity` table and a helper that records "who did what". Admin, CNO, CCS, Finance and Lab all have an "activity" endpoint that reads from it.

**Done when:** a test upload returns a Cloudinary URL and the bell in any portal shows a notification you inserted.

---

## Phase 5 — Public intake: how people get in (3 endpoints)

- [ ] `POST /care-requests` (**patient sign-up**): create a `PATIENT` user if the email is new, create the care request, email the `/set-password` link and return `{ id, accountCreated }`. For an existing email, attach the request to that patient and return `accountCreated: false`.
- [ ] `POST /auth/provider/apply` (multipart): create an application with documents uploaded to Cloudinary.
- [ ] `POST /hmo/apply`: create an HMO application.

**Done when:** booking on `/contact` creates a patient, the email arrives, the patient sets a password and signs in to `/patient`, and the request shows under My Bookings (once Phase 8 exists).

---

## Phases 6–12 — Portals, in dependency order

Use **the routine** for each. The counts are the endpoints in `API_ENDPOINTS.md`.

| Phase | Module | Endpoints | Why this order / what to watch |
|---|---|---|---|
| **6** | **Admin** | 36 | The hub. It approves providers, assigns care requests, creates users (invite email), manages facilities (`/admin/{hospitals\|pharmacies\|laboratories}`), HMO plans and subscriptions, and approves facility invoices and financial requests. Build users and providers first, then care requests, then the rest. |
| **7** | **Caregivers / providers** | 19 | Needs approved providers and assigned care requests. Visits, availability, visit reports (with Cloudinary uploads) and earnings. |
| **8** | **Patient** | 19 | Reads the bookings, visits and reports created in Phases 5–7. Add care plans, documents, tickets and profile. Leave `/invoices/{id}/pay` until Phase 12. |
| **9** | **CNO / clinical leadership** | 12 | Reviews caregivers' visit reports. **Approved reports become visible to the patient.** Also team, performance and financial requests. |
| **10** | **Customer Care** | 15 (+ `POST /care-requests` from Phase 5) | Tickets (patient messages from Phase 8 land here), patient lookup, care-request desk, agent status. Mark `unreadForPatient` when an agent replies. |
| **11a** | **Relationship Manager** | 7 | Onboards facilities and organisations, creating their admin users with invite emails. Note that RM uses some `/admin/*` paths, so allow `RELATIONSHIP_MANAGER` on exactly those paths, or move them under `/rm/*` and update `rmApi.js`. |
| **11b** | **Partner facilities** | 19 | One controller for `HOSPITAL_ADMIN`, `PHARMACY_ADMIN` and `LAB_ADMIN`. Work out the facility from the user. Referrals, drug orders, test requests, test menu and invoices to DiGi. **A critical lab result notifies the CNO immediately.** |
| **11c** | **Lab scientist & pharmacist** | 13 | One parameterised controller serving `/lab/me` and `/pharmacy/me`. |
| **11d** | **HMO organisation** | 11 | Employees (each becomes a `PATIENT` with `patientType: HMO`, plus an invite email), CSV upload, utilisation. |
| **12** | **Finance** | 27 | Built last because it reads from everything: invoices, payments, HMO claims, expense claims, facility bills (approved by Admin in Phase 6), payroll, budget, reports. Then connect **Paystack**: `POST /patient/me/invoices/{id}/pay` returns `{ authorizationUrl }`, with a webhook to mark invoices paid (verify the signature). |

**Done when (for each):** every page of that portal works on the real frontend with real data, and the Postman folder passes.

---

## Phase 13 — The flows that cross portals

Walk through each one end to end with real accounts in different browsers. The full list is in *Flows that cross portals* at the bottom of `API_ENDPOINTS.md`.

- [ ] Book care, Admin assigns, the caregiver visits and reports, the CNO approves, and the patient sees the report.
- [ ] Patient message, CCS reply, the patient sees the reply.
- [ ] Referral or test request to a facility, critical result, the CNO is alerted.
- [ ] Facility invoice, Admin approves, Finance pays, the facility sees *Paid*.
- [ ] HMO adds an employee, invite, they sign in as a patient, and their care is billed to the HMO.
- [ ] Patient pays with Paystack (test card), the webhook fires, the bill shows *Paid*.

---

## Phase 14 — Deploy to Render (free tier)

- [ ] Add a **Dockerfile** (multi-stage Maven build, then a JRE image) and set the memory limit for 512 MB (`-XX:MaxRAMPercentage=75`).
- [ ] **Render web service** from the GitHub repo, with all env vars from Phase 1 and the `prod` profile.
- [ ] Use Supabase's **Session pooler** connection string in `DB_URL`.
- [ ] **Frontend as a Render static site** (`npm run build`, publish `dist`) with two rules:
  - rewrite `/api/*` to `https://<backend>.onrender.com/api/*`, which keeps the refresh cookie same-origin;
  - rewrite `/*` to `/index.html` so page refreshes work.
  Set `VITE_API_BASE=/api` in the static site's environment.
- [ ] Set `FRONTEND_URL` to the static site URL (used in email links and CORS).
- [ ] Add a free uptime pinger on `/api/actuator/health` every few days so Supabase doesn't pause.

**Done when:** the deployed site does the Phase 13 walkthroughs.

---

## Phase 15 — Before real patients (move to paid)

- [ ] **Upgrades:** Render paid instance (no sleeping), Supabase Pro (daily backups), Resend with your own verified domain, Paystack live keys.
- [ ] **Your own domain** (e.g. `app.digihealth.ng` + `api.digihealth.ng`, or one domain with the `/api` rewrite).
- [ ] **Security pass:** login rate limits, every `/me` query scoped by user, role tests for every path prefix, no secrets in logs, private medical files on Cloudinary, HTTPS only.
- [ ] **Data protection:** health data is sensitive personal data under Nigeria's Data Protection Act 2023. Get a privacy review, a data-processing record and consent wording on the Book Care page before launch.
- [ ] **Monitoring:** error alerts (Render logs plus a free Sentry plan) and a weekly restore test of a backup.

---

### Progress tracker

| Phase | Endpoints | Done |
|---|---|---|
| 3 Auth | 5 public + change-password | ☐ |
| 4 Shared (notifications) | 3 | ☐ |
| 5 Intake (Book Care, provider apply, HMO apply) | 3 | ☐ |
| 6 Admin | 35 | ☐ |
| 7 Caregivers | 19 | ☐ |
| 8 Patient | 19 | ☐ |
| 9 CNO | 12 | ☐ |
| 10 CCS | 15 | ☐ |
| 11 RM · Facilities · Lab/Pharm · HMO | 7 · 19 · 13 · 11 | ☐ |
| 12 Finance | 27 | ☐ |
| **Total** | **189** | |
