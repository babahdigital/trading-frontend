/**
 * Escape a value for safe CSV output.
 * - Quotes fields containing `"`, `,`, `\n`, or formula-triggering characters
 * - Prefixes `=+\-@\t\r` with `'` inside quoted field to prevent Excel injection
 */
export function csvEscape(val: string | number): string {
  const s = String(val);
  const needsPrefix = /^[=+\-@\t\r]/.test(s);
  const escaped =
    s.includes('"') || s.includes(',') || s.includes('\n') || needsPrefix
      ? `"${needsPrefix ? "'" : ''}${s.replace(/"/g, '""')}"`
      : s;
  return escaped;
}
