/**
 * Client-safe role helpers — single source of truth for what counts as an
 * "admin" role. Kept free of `jose` / `process.env` so this module can be
 * imported into client components (login pages, auth-context) WITHOUT pulling
 * server-only crypto into the browser bundle.
 *
 * `jwt.ts` re-exports these for back-compat, so existing
 * `import { isAdminRole } from '@/lib/auth/jwt'` sites keep working.
 */
export type JwtRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR' | 'CLIENT';

export const ADMIN_ROLES: readonly JwtRole[] = ['SUPER_ADMIN', 'ADMIN', 'OPERATOR'];

/** True for any console role (SUPER_ADMIN / ADMIN / OPERATOR), false for CLIENT. */
export function isAdminRole(role: string): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}
