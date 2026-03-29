/**
 * Matric number format: U{YY}{DEPT}{4-digit serial}
 * Example: U23CS1019 → year=2023, dept="CS", serial="1019"
 */

/**
 * Parses a matric number into its components.
 * @param {string} matric - e.g. "U23CS1019"
 * @returns {{ year: number, department: string, serial: string, raw: string } | null}
 */
export function parseMatric(matric) {
  if (!matric) return null;
  const match = matric.trim().toUpperCase().match(/^U(\d{2})([A-Z]+)(\d{4})$/);
  if (!match) return null;

  const [, yy, department, serial] = match;
  const year = 2000 + parseInt(yy, 10);

  return { year, department, serial, raw: matric.trim().toUpperCase() };
}

/**
 * Infers the current academic level (100–400) from the admission year.
 * Clamps at 400 for students who've exceeded 4 years.
 * @param {number} admissionYear - e.g. 2023
 * @returns {100 | 200 | 300 | 400}
 */
export function inferLevel(admissionYear) {
  const currentYear = new Date().getFullYear();
  const yearsIn = currentYear - admissionYear + 1;
  const raw = yearsIn * 100;
  if (raw <= 100) return 100;
  if (raw >= 400) return 400;
  // round down to nearest 100
  return Math.floor(raw / 100) * 100;
}
