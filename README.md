# DiGi Health — web frontend

React 19 + Vite + React Router 7. The public website and every staff, partner and patient portal live in this single app.

## Run it

```bash
npm install
cp .env.example .env.local   # /api is forwarded to Spring Boot on :8080
npm run dev                  # http://localhost:5173
npm run lint
npm run build                # output in dist/
```

`VITE_API_BASE` is where API calls go. In development, use `/api`: the Vite dev server forwards it to `VITE_DEV_API_TARGET` (default `http://localhost:8080`), so the httpOnly refresh cookie is same-origin. In production, point it at an API on the same site as the app (e.g. `https://api.digihealth.ng/api`). If it isn't set, the app uses the Render deployment.

## Portals

| Portal | URL | Login role(s) | Folder in `src/pages` | API file in `src/Api` |
|---|---|---|---|---|
| Admin | `/admin` | `ADMIN`, `SUPER_ADMIN` | `Admin` | `adminApi.js` |
| Clinical leadership | `/cno` | `CNO`, `CNO_MEDICAL_DIRECTOR`, `CHIEF_MEDICAL_OFFICER`, `HEAD_OF_CLINICAL_OPERATIONS`, `NURSING_SUPERVISOR` | `CNO` | `cnoApi.js` |
| Caregivers / providers | `/caregiver` | `SERVICE_PROVIDER`, `CLINICAL_PERSONNEL` | `Caregivers` | `providerApi.js` |
| Customer Care | `/ccs` | `CUSTOMER_CARE` | `CCS` | `ccsApi.js` |
| Finance | `/finance` | `FINANCE_MANAGER` | `FinanceManager` | `financeApi.js` |
| HMO organisation | `/hmo-dashboard` | `HMO` | `HMO` | `hmoApi.js` |
| Relationship Manager | `/relationship` | `RELATIONSHIP_MANAGER` | `RM` | `rmApi.js` |
| Lab scientist & pharmacist | `/lab` | `LAB_SCIENTIST`, `PHARMACIST` | `Lab_Pharm_Scientist` | `labApi.js` |
| Hospital | `/hospital` | `HOSPITAL_ADMIN` | `Hospital` + `Facility` | `facilityApi.js` |
| Pharmacy | `/pharmacy` | `PHARMACY_ADMIN` | `Pharmarcy` + `Facility` | `facilityApi.js` |
| Lab centre | `/laboratory` | `LAB_ADMIN` | `Laboratory` + `Facility` | `facilityApi.js` |
| Patient | `/patient` | `PATIENT` | `Patient` | `patientApi.js` |

The public site (`/`, `/services`, `/contact`, `/apply`, `/hmo`, …) is in `pages/public`. Sign-in is at `/login`. The links in password-reset and invite emails open `/reset-password` and `/set-password`.

## How it fits together

- **Routing and access:** `src/App.jsx`. Each portal is wrapped in `ProtectedRoute` (role check) and `DashboardLayout` (sidebar and top bar).
- **Role → home page:** `src/config/roles.js`. **Sidebars and colours:** `src/config/Navigation.js`. **Roles an admin can create:** `src/config/userRoles.js`.
- **API calls:** every dashboard request goes through `src/Api/apiFetch.jsx`. It adds the bearer token, signs the user out on a 401 and turns errors into readable messages. Dashboard pages never call `fetch` directly; they use their portal's `src/Api/*Api.js` file. Only the login, password-reset and public form pages post with `fetch` and the shared `API_BASE`.
- **Endpoint list for the backend:** [`docs/API_ENDPOINTS.md`](docs/API_ENDPOINTS.md). It lists every path, method, body and cross-portal flow the frontend expects.
- **Sessions:** short-lived access token kept **in memory only**; the refresh token is an **httpOnly cookie** set by the backend, so page scripts can't read either. `apiFetch` gets a new access token from `POST /auth/refresh` on page load, before expiry and on a 401, and signs the user out only if that fails. Storage holds just who is signed in (name, role, email, id) so the right portal renders straight away. "Remember me" is sent to the backend, which decides how long the cookie lasts. "Sign out" revokes the cookie (`POST /auth/logout`).
- **Patients sign up** through the public Book care page (`/contact`). The backend creates their account and emails a `/set-password` link.
