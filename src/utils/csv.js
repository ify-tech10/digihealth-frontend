/*
 * downloadCsv('visits.csv', ['Date', 'Patient'], rows.map((r) => [r.date, r.patient]))
 * Values are quoted and escaped; opens cleanly in Excel / Google Sheets.
 */
export function downloadCsv(filename, headers, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const body = [headers, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  // BOM so Excel reads ₦ and accented names correctly
  const url = URL.createObjectURL(new Blob(['﻿', body], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
