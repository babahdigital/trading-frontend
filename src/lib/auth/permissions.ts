/**
 * Permission constants for the admin RBAC system.
 *
 * Format: `<scope>.<action>` where:
 *   - scope = nav-group / feature domain (matches AdminTopNav grouping)
 *   - action = `view` (read) | `write` (mutate) | `create` (instantiate) |
 *              `resolve` (specific verb e.g. kill-switch resolve)
 *
 * Authorization model:
 *
 *   role=SUPER_ADMIN  -> ALWAYS allowed, all permissions implicit
 *   role=ADMIN        -> empty permissions array = legacy full-access
 *                        (back-compat); populated array = scoped admin
 *   role=OPERATOR     -> ALWAYS scoped; permissions array MUST contain the
 *                        required permission or access is denied
 *   role=CLIENT       -> never granted admin scopes (handled at middleware
 *                        level — admin routes return 403 for CLIENT role)
 */

import type { Role } from '@prisma/client';

export const PERMISSIONS = {
  // Operations
  DASHBOARD_VIEW: 'dashboard.view',
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_WRITE: 'customers.write',
  LICENSES_VIEW: 'licenses.view',
  LICENSES_WRITE: 'licenses.write',
  KILL_SWITCH_VIEW: 'kill_switch.view',
  KILL_SWITCH_RESOLVE: 'kill_switch.resolve',
  // Infrastructure
  VPS_VIEW: 'vps.view',
  VPS_WRITE: 'vps.write',
  AUDIT_VIEW: 'audit.view',
  // People (sensitive — typically reserved for SUPER_ADMIN)
  USERS_VIEW: 'users.view',
  USERS_WRITE: 'users.write',
  USERS_CREATE: 'users.create',
  // Content (CMS)
  CMS_VIEW: 'cms.view',
  CMS_WRITE: 'cms.write',
  CMS_PUBLISH: 'cms.publish',
  // System
  SETTINGS_WRITE: 'settings.write',
  PLATFORM_CONFIG: 'platform.config',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Permission catalog grouped untuk UI permission picker. Each group label is
 * shown sebagai section heading di /admin/users/[id]/permissions form.
 */
export const PERMISSION_GROUPS: Array<{
  id: string;
  labelId: string;
  labelEn: string;
  descId?: string;
  descEn?: string;
  permissions: Array<{
    key: Permission;
    labelId: string;
    labelEn: string;
    descId: string;
    descEn: string;
  }>;
}> = [
  {
    id: 'operations',
    labelId: 'Operasi',
    labelEn: 'Operations',
    descId: 'Akses dashboard, customer, lisensi, dan kill-switch resolver.',
    descEn: 'Dashboard, customer, license, and kill-switch resolver access.',
    permissions: [
      { key: PERMISSIONS.DASHBOARD_VIEW, labelId: 'Lihat dashboard', labelEn: 'View dashboard', descId: 'Buka /admin dashboard utama', descEn: 'Open /admin main dashboard' },
      { key: PERMISSIONS.CUSTOMERS_VIEW, labelId: 'Lihat customer', labelEn: 'View customers', descId: 'Buka daftar customer + detail tier', descEn: 'View customer list + tier details' },
      { key: PERMISSIONS.CUSTOMERS_WRITE, labelId: 'Edit customer', labelEn: 'Edit customers', descId: 'Suspend/reactivate, override tier, edit profile', descEn: 'Suspend/reactivate, override tier, edit profile' },
      { key: PERMISSIONS.LICENSES_VIEW, labelId: 'Lihat lisensi', labelEn: 'View licenses', descId: 'Daftar lisensi + status expiry', descEn: 'License list + expiry status' },
      { key: PERMISSIONS.LICENSES_WRITE, labelId: 'Edit lisensi', labelEn: 'Edit licenses', descId: 'Issue, rotate, revoke license keys', descEn: 'Issue, rotate, revoke license keys' },
      { key: PERMISSIONS.KILL_SWITCH_VIEW, labelId: 'Lihat kill-switch', labelEn: 'View kill-switch', descId: 'Daftar kill-switch event aktif', descEn: 'Active kill-switch events list' },
      { key: PERMISSIONS.KILL_SWITCH_RESOLVE, labelId: 'Resolve kill-switch', labelEn: 'Resolve kill-switch', descId: 'Override kill-switch lockout, force-release', descEn: 'Override kill-switch lockout, force-release' },
    ],
  },
  {
    id: 'infrastructure',
    labelId: 'Infrastruktur',
    labelEn: 'Infrastructure',
    descId: 'VPS fleet, instance health, dan audit log.',
    descEn: 'VPS fleet, instance health, and audit log.',
    permissions: [
      { key: PERMISSIONS.VPS_VIEW, labelId: 'Lihat VPS', labelEn: 'View VPS', descId: 'Daftar VPS + health metrics', descEn: 'VPS list + health metrics' },
      { key: PERMISSIONS.VPS_WRITE, labelId: 'Edit VPS', labelEn: 'Edit VPS', descId: 'Provision, scale, decommission VPS instance', descEn: 'Provision, scale, decommission VPS' },
      { key: PERMISSIONS.AUDIT_VIEW, labelId: 'Lihat audit log', labelEn: 'View audit log', descId: 'Tamper-evident audit trail (SHA-256 chain)', descEn: 'Tamper-evident audit trail (SHA-256 chain)' },
    ],
  },
  {
    id: 'people',
    labelId: 'Tim & RBAC',
    labelEn: 'Team & RBAC',
    descId: 'PALING SENSITIF — biasanya dikunci ke SUPER_ADMIN saja.',
    descEn: 'MOST SENSITIVE — usually reserved for SUPER_ADMIN only.',
    permissions: [
      { key: PERMISSIONS.USERS_VIEW, labelId: 'Lihat tim', labelEn: 'View team', descId: 'Daftar admin/operator + role + last login', descEn: 'Admin/operator list + role + last login' },
      { key: PERMISSIONS.USERS_WRITE, labelId: 'Edit tim', labelEn: 'Edit team', descId: 'Edit role, permissions, deactivate akun', descEn: 'Edit role, permissions, deactivate accounts' },
      { key: PERMISSIONS.USERS_CREATE, labelId: 'Buat akun baru', labelEn: 'Create accounts', descId: 'Provision admin/operator baru — biasanya hanya SUPER_ADMIN', descEn: 'Provision new admin/operator — typically SUPER_ADMIN only' },
    ],
  },
  {
    id: 'content',
    labelId: 'Konten (CMS)',
    labelEn: 'Content (CMS)',
    descId: 'Landing, pricing, FAQ, banners, articles, blog topics.',
    descEn: 'Landing, pricing, FAQ, banners, articles, blog topics.',
    permissions: [
      { key: PERMISSIONS.CMS_VIEW, labelId: 'Lihat CMS', labelEn: 'View CMS', descId: 'Browse CMS content (read-only)', descEn: 'Browse CMS content (read-only)' },
      { key: PERMISSIONS.CMS_WRITE, labelId: 'Edit konten', labelEn: 'Edit content', descId: 'Buat/edit draft konten — belum di-publish', descEn: 'Create/edit content drafts — not yet published' },
      { key: PERMISSIONS.CMS_PUBLISH, labelId: 'Publish konten', labelEn: 'Publish content', descId: 'Publikasi ke production (visible publik)', descEn: 'Publish to production (publicly visible)' },
    ],
  },
  {
    id: 'system',
    labelId: 'Sistem',
    labelEn: 'System',
    descId: 'Konfigurasi platform, integration secrets, feature flags.',
    descEn: 'Platform configuration, integration secrets, feature flags.',
    permissions: [
      { key: PERMISSIONS.SETTINGS_WRITE, labelId: 'Edit settings', labelEn: 'Edit settings', descId: 'Site settings, branding, contact info', descEn: 'Site settings, branding, contact info' },
      { key: PERMISSIONS.PLATFORM_CONFIG, labelId: 'Konfigurasi platform', labelEn: 'Platform config', descId: 'Tier mapping, pricing engine, capability gates — high-impact', descEn: 'Tier mapping, pricing engine, capability gates — high-impact' },
    ],
  },
];

/**
 * Preset permission bundles for common operator archetypes. Used as
 * starting points di /admin/users/new — admin can tweak from there.
 */
export const PERMISSION_PRESETS: Record<string, { labelId: string; labelEn: string; permissions: Permission[] }> = {
  support_agent: {
    labelId: 'Support Agent',
    labelEn: 'Support Agent',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.CUSTOMERS_VIEW,
      PERMISSIONS.LICENSES_VIEW,
      PERMISSIONS.KILL_SWITCH_VIEW,
    ],
  },
  ops_operator: {
    labelId: 'Operator Ops',
    labelEn: 'Ops Operator',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.CUSTOMERS_VIEW,
      PERMISSIONS.CUSTOMERS_WRITE,
      PERMISSIONS.LICENSES_VIEW,
      PERMISSIONS.LICENSES_WRITE,
      PERMISSIONS.KILL_SWITCH_VIEW,
      PERMISSIONS.KILL_SWITCH_RESOLVE,
      PERMISSIONS.VPS_VIEW,
      PERMISSIONS.AUDIT_VIEW,
    ],
  },
  content_editor: {
    labelId: 'Editor Konten',
    labelEn: 'Content Editor',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.CMS_VIEW,
      PERMISSIONS.CMS_WRITE,
    ],
  },
  content_publisher: {
    labelId: 'Publisher Konten',
    labelEn: 'Content Publisher',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.CMS_VIEW,
      PERMISSIONS.CMS_WRITE,
      PERMISSIONS.CMS_PUBLISH,
    ],
  },
  full_admin: {
    labelId: 'Admin Penuh',
    labelEn: 'Full Admin',
    permissions: Object.values(PERMISSIONS).filter((p) => !['users.create', 'users.write', 'platform.config'].includes(p)),
  },
};

/**
 * Check kalau user dengan role + permissions tertentu boleh akses suatu
 * permission. Authoritative — pakai ini di route handler untuk gating.
 */
export function hasPermission(
  role: Role | string,
  permissions: unknown,
  required: Permission,
): boolean {
  // SUPER_ADMIN bypasses all checks
  if (role === 'SUPER_ADMIN') return true;

  // ADMIN with empty permissions = legacy full-access (back-compat)
  // ADMIN with populated permissions = scoped admin
  if (role === 'ADMIN') {
    if (!Array.isArray(permissions) || permissions.length === 0) return true;
    return permissions.includes(required);
  }

  // OPERATOR must have explicit permission
  if (role === 'OPERATOR') {
    if (!Array.isArray(permissions)) return false;
    return permissions.includes(required);
  }

  // CLIENT or anything else — denied
  return false;
}

/**
 * Helper untuk component-level rendering — kalau user tidak punya
 * permission tampilkan placeholder atau redirect.
 */
export function requirePermission(
  role: Role | string,
  permissions: unknown,
  required: Permission,
): { ok: true } | { ok: false; reason: string } {
  if (hasPermission(role, permissions, required)) return { ok: true };
  return { ok: false, reason: `Missing permission: ${required}` };
}
