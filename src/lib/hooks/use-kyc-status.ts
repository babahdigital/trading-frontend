/**
 * useKycStatus — polling hook untuk status KYC user current.
 *
 * Source: /api/kyc/status. Polling 60s pasca-submit untuk catch transisi
 * SUBMITTED → APPROVED/REJECTED tanpa hard refresh.
 *
 * Status values (per Prisma UserKyc.status enum):
 *   - NOT_SUBMITTED — belum mulai wizard
 *   - DRAFT — wizard partial save
 *   - SUBMITTED — sudah submit, menunggu review
 *   - APPROVED — siap full trading
 *   - REJECTED — perlu re-submit dengan dokumen koreksi
 *
 * Returns:
 *   { status, kyc, loading, isApproved, isPending, isRejected, isNotStarted, refresh }
 */
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

export type KycStatus = 'NOT_SUBMITTED' | 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface KycData {
  id?: string;
  status: KycStatus;
  fullName?: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  documentType?: string | null;
  investmentExperience?: string | null;
  riskTolerance?: string | null;
  expectedMonthlyVolume?: number | null;
  updatedAt?: string;
}

const POLL_INTERVAL_MS = 60_000;

interface UseKycStatusResult {
  status: KycStatus;
  kyc: KycData | null;
  loading: boolean;
  isApproved: boolean;
  isPending: boolean;
  isRejected: boolean;
  isNotStarted: boolean;
  refresh: () => Promise<void>;
}

export function useKycStatus(): UseKycStatusResult {
  const [kyc, setKyc] = useState<KycData | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/kyc/status', { credentials: 'same-origin' });
      if (!res.ok) {
        if (res.status === 401) {
          if (isMounted.current) setKyc(null);
          return;
        }
        return;
      }
      const data = (await res.json()) as { kyc?: KycData };
      if (isMounted.current) setKyc(data.kyc ?? { status: 'NOT_SUBMITTED' });
    } catch {
      // silent — keep stale state
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    void fetchStatus();
    // Pause polling kalau status sudah final (APPROVED/REJECTED) — tidak akan
    // berubah lagi tanpa user action. Hemat backend load.
    const timer = setInterval(() => {
      if (kyc && (kyc.status === 'APPROVED' || kyc.status === 'REJECTED')) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      void fetchStatus();
    }, POLL_INTERVAL_MS);
    return () => {
      isMounted.current = false;
      clearInterval(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchStatus]);

  const status: KycStatus = kyc?.status ?? 'NOT_SUBMITTED';
  return {
    status,
    kyc,
    loading,
    isApproved: status === 'APPROVED',
    isPending: status === 'SUBMITTED',
    isRejected: status === 'REJECTED',
    isNotStarted: status === 'NOT_SUBMITTED' || status === 'DRAFT',
    refresh: fetchStatus,
  };
}
