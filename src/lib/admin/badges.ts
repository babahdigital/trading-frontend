/**
 * Admin badge tokens — single source of truth untuk status + role labelling.
 *
 * Sebelumnya tersebar inline di 21 admin pages dengan kombinasi Tailwind
 * `bg-{color}-{shade}/{alpha}` yang berbeda-beda. Centralization ini supaya
 * 1 edit = semua admin page ikut update (institutional consistency).
 *
 * Returns `{ label, cls }` — `label` sudah dilokalisasi default ID, `cls`
 * adalah Tailwind class siap pakai. Pemanggil bisa override label kalau perlu.
 */
import type { ReactNode } from 'react';

export type Tone =
  | 'success'   // active, ok, online, won
  | 'danger'    // expired, failed, offline, lost
  | 'warning'   // suspended, pending, degraded, breakeven
  | 'info'      // new, draft, scheduled
  | 'neutral'   // unknown, no data, archived
  | 'accent';   // featured, primary, highlight

const TONE_CLASS: Record<Tone, string> = {
  success: 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  danger:  'bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  warning: 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  info:    'bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  neutral: 'bg-slate-500/15 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300',
  accent:  'bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
};

const TONE_DOT_CLASS: Record<Tone, string> = {
  success: 'bg-emerald-500 dark:bg-emerald-400',
  danger:  'bg-rose-500 dark:bg-rose-400',
  warning: 'bg-amber-500 dark:bg-amber-400',
  info:    'bg-sky-500 dark:bg-sky-400',
  neutral: 'bg-slate-400 dark:bg-slate-500',
  accent:  'bg-amber-500 dark:bg-amber-400',
};

export interface BadgeMeta {
  label: string;
  tone: Tone;
  cls: string;
  dotCls: string;
}

function build(label: string, tone: Tone): BadgeMeta {
  return { label, tone, cls: TONE_CLASS[tone], dotCls: TONE_DOT_CLASS[tone] };
}

// ─── License / subscription status ────────────────────────────────────────
export function licenseStatusBadge(status?: string | null): BadgeMeta {
  switch (status) {
    case 'ACTIVE':     return build('Aktif', 'success');
    case 'EXPIRED':    return build('Kedaluwarsa', 'danger');
    case 'SUSPENDED':  return build('Ditangguhkan', 'warning');
    case 'PENDING':    return build('Menunggu', 'info');
    case 'CANCELLED':  return build('Dibatalkan', 'neutral');
    case 'TRIAL':      return build('Uji Coba', 'accent');
    case null:
    case undefined:
    case '':           return build('Tanpa Lisensi', 'neutral');
    default:           return build(String(status), 'neutral');
  }
}

// ─── VPS / instance status ────────────────────────────────────────────────
export function vpsStatusBadge(status?: string | null, health?: string | null): BadgeMeta {
  const eff = (health || status || '').toUpperCase();
  if (eff === 'OK' || eff === 'ONLINE')        return build('Online', 'success');
  if (eff === 'DEGRADED')                       return build('Degraded', 'warning');
  if (eff === 'OFFLINE' || eff === 'ERROR')    return build('Offline', 'danger');
  if (eff === 'PROVISIONING')                  return build('Provisioning', 'info');
  if (eff === 'PAUSED')                         return build('Dijeda', 'warning');
  if (!eff)                                     return build('Tidak diketahui', 'neutral');
  return build(eff, 'neutral');
}

// ─── User role badge ──────────────────────────────────────────────────────
export function userRoleBadge(role?: string | null): BadgeMeta {
  switch (role) {
    case 'CLIENT':       return build('CLIENT', 'info');
    case 'OPERATOR':     return build('OPERATOR', 'success');
    case 'ADMIN':        return build('ADMIN', 'accent');
    case 'SUPER_ADMIN':  return build('SUPER ADMIN', 'danger');
    default:             return build(role || 'UNKNOWN', 'neutral');
  }
}

// ─── Generic active toggle ────────────────────────────────────────────────
export function activeBadge(isActive?: boolean | null): BadgeMeta {
  return isActive ? build('Aktif', 'success') : build('Nonaktif', 'neutral');
}

// ─── KYC status ───────────────────────────────────────────────────────────
export function kycStatusBadge(status?: string | null): BadgeMeta {
  switch (status) {
    case 'APPROVED':                  return build('Disetujui', 'success');
    case 'REJECTED':                  return build('Ditolak', 'danger');
    case 'PENDING':                   return build('Menunggu', 'info');
    case 'PENDING_REVIEW':            return build('Menunggu review', 'info');
    case 'ADDITIONAL_INFO_REQUIRED':  return build('Info tambahan', 'warning');
    case 'SUBMITTED':                 return build('Diajukan', 'warning');
    case 'DRAFT':                     return build('Draft', 'neutral');
    case 'NOT_STARTED':
    case 'NOT_SUBMITTED':             return build('Belum dimulai', 'neutral');
    default:                          return build(status || 'N/A', 'neutral');
  }
}

// ─── Payment / billing ────────────────────────────────────────────────────
export function paymentStatusBadge(status?: string | null): BadgeMeta {
  switch (status) {
    case 'PAID':       return build('Lunas', 'success');
    case 'PENDING':    return build('Menunggu', 'info');
    case 'FAILED':     return build('Gagal', 'danger');
    case 'EXPIRED':    return build('Kedaluwarsa', 'warning');
    case 'REFUNDED':   return build('Dikembalikan', 'neutral');
    case 'CANCELLED':  return build('Dibatalkan', 'neutral');
    default:           return build(status || '-', 'neutral');
  }
}

// ─── Trade outcome (WIN/LOSS/BREAKEVEN/OPEN) ──────────────────────────────
export function tradeOutcomeBadge(outcome?: string | null): BadgeMeta {
  switch (outcome) {
    case 'WIN':       return build('WIN', 'success');
    case 'LOSS':      return build('LOSS', 'danger');
    case 'BREAKEVEN': return build('BE', 'neutral');
    case 'OPEN':      return build('OPEN', 'info');
    default:          return build(outcome || '-', 'neutral');
  }
}

// ─── Kill-switch event severity / status ──────────────────────────────────
export function killSwitchSeverityBadge(level?: string | null): BadgeMeta {
  switch ((level || '').toUpperCase()) {
    case 'CRITICAL':  return build('Kritis', 'danger');
    case 'HIGH':      return build('Tinggi', 'warning');
    case 'MEDIUM':    return build('Sedang', 'info');
    case 'LOW':       return build('Rendah', 'neutral');
    case 'RESOLVED':  return build('Selesai', 'success');
    default:          return build(level || '-', 'neutral');
  }
}

// ─── Generic tone-only renderer for inline use ────────────────────────────
export function toneClass(tone: Tone): string {
  return TONE_CLASS[tone];
}

export function toneDotClass(tone: Tone): string {
  return TONE_DOT_CLASS[tone];
}

/** Map any free-form status string to a tone heuristically. */
export function inferTone(status?: string | null): Tone {
  const s = (status || '').toUpperCase();
  if (/(ACTIVE|ONLINE|OK|PAID|WIN|APPROVED|RESOLVED|SUCCESS|HEALTHY)/.test(s)) return 'success';
  if (/(EXPIRED|OFFLINE|FAIL|LOSS|REJECT|ERROR|DOWN|CRITICAL)/.test(s)) return 'danger';
  if (/(SUSPEND|DEGRAD|PAUS|WARN|HIGH|PENDING_REVIEW)/.test(s)) return 'warning';
  if (/(PENDING|SCHED|DRAFT|NEW|INFO|MEDIUM|SUBMIT)/.test(s)) return 'info';
  return 'neutral';
}

export type BadgeRender = (status: string | null | undefined) => ReactNode;
