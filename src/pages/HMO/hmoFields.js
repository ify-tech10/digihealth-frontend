import { pick } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';

/* Tolerant readers for HMO records — the backend may name things differently. */

export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const employeeName = (e) =>
  pick(e, 'fullName', 'name') || [e?.firstName, e?.lastName].filter(Boolean).join(' ');
export const employeeStatus = (e) => {
  const st = String(e?.status || '').toUpperCase();
  if (st) return st === 'ACTIVE' ? 'REGISTERED' : st;
  return e?.nextOfKinCompleted && e?.consentSigned ? 'REGISTERED' : 'PENDING';
};
export const employeeUsed = (e) => num(pick(e, 'benefitUsed', 'amountUsed', 'utilised'));

/* Registration is complete only once the employee has done both steps themselves. */
export const nextOfKinDone = (e) => Boolean(e?.nextOfKinCompleted || pick(e, 'nextOfKinName'));
export const consentDone = (e) => Boolean(e?.consentSigned || pick(e, 'consentSignedAt'));

export const limitOf = (s) => num(pick(s, 'benefitLimit', 'planBenefitLimit'));
export const usedOf = (s) => num(pick(s, 'benefitUsed', 'amountUsed', 'utilisedAmount'));
export const expiryOf = (s) => pick(s, 'expiryDate', 'endDate', 'expiresAt');
export const daysLeft = (s) => {
  const e = expiryOf(s);
  if (!e) return null;
  return Math.ceil((new Date(e) - new Date()) / 86400000);
};

/* ── CSV ── */
export const CSV_COLUMNS = ['firstName', 'lastName', 'email', 'phone', 'department', 'staffId', 'dateOfBirth', 'gender'];
export const REQUIRED_COLUMNS = ['firstName', 'lastName', 'email', 'phone'];
export const CSV_LABEL = { firstName: 'First name', lastName: 'Last name', email: 'Email', phone: 'Phone', department: 'Department', staffId: 'Staff ID', dateOfBirth: 'Date of birth', gender: 'Gender' };

/* A one-row example file with the headers we understand. */
export function downloadTemplate() {
  downloadCsv('employee-upload-template.csv', CSV_COLUMNS.map((c) => CSV_LABEL[c]), [
    ['Adaeze', 'Okafor', 'adaeze.okafor@company.com', '+2348031234567', 'Finance', 'EMP-0042', '1990-04-12', 'Female'],
  ]);
}

/* Header text → field: "First Name", "first_name", "FIRSTNAME" all map to firstName. */
const ALIASES = {
  firstname: 'firstName', givenname: 'firstName',
  lastname: 'lastName', surname: 'lastName', familyname: 'lastName',
  fullname: 'fullName', name: 'fullName',
  email: 'email', emailaddress: 'email',
  phone: 'phone', phonenumber: 'phone', mobile: 'phone', telephone: 'phone',
  department: 'department', dept: 'department', unit: 'department',
  staffid: 'staffId', employeeid: 'staffId', staffnumber: 'staffId', employeenumber: 'staffId',
  dateofbirth: 'dateOfBirth', dob: 'dateOfBirth', birthdate: 'dateOfBirth',
  gender: 'gender', sex: 'gender',
};
const normalise = (h) => ALIASES[String(h).toLowerCase().replace(/[^a-z]/g, '')] || null;

/* RFC 4180-ish: quoted fields, escaped quotes, commas/newlines inside quotes. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const src = String(text).replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

const EMAIL = /^\S+@\S+\.\S+$/;
const PHONE = /^\+?[0-9 ()-]{7,}$/;

/*
 * Turn CSV text into employee rows with per-row problems.
 * Returns { headersMissing, rows: [{ line, data, problems }] }
 */
export function readEmployeeCsv(text, existingEmails = []) {
  const table = parseCsv(text);
  if (!table.length) return { headersMissing: REQUIRED_COLUMNS, rows: [] };
  const fields = table[0].map(normalise);
  const has = (f) => fields.includes(f) || (['firstName', 'lastName'].includes(f) && fields.includes('fullName'));
  const headersMissing = REQUIRED_COLUMNS.filter((f) => !has(f));

  const known = new Set(existingEmails.map((e) => String(e).toLowerCase()));
  const seen = new Set();
  const rows = table.slice(1).map((cells, i) => {
    const data = {};
    fields.forEach((f, c) => { if (f) data[f] = String(cells[c] ?? '').trim(); });
    if (data.fullName && !data.firstName) {
      const [first, ...rest] = data.fullName.split(/\s+/);
      data.firstName = first;
      data.lastName = data.lastName || rest.join(' ');
    }
    delete data.fullName;
    const problems = [];
    if (!data.firstName) problems.push('first name missing');
    if (!data.lastName) problems.push('last name missing');
    const email = (data.email || '').toLowerCase();
    if (!email) problems.push('email missing');
    else if (!EMAIL.test(email)) problems.push('email looks wrong');
    else if (seen.has(email)) problems.push('email repeated in file');
    else if (known.has(email)) problems.push('already on your list');
    if (email) seen.add(email);
    if (!data.phone) problems.push('phone missing');
    else if (!PHONE.test(data.phone)) problems.push('phone looks wrong');
    return { line: i + 2, data, problems };
  });
  return { headersMissing, rows };
}
