'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';

interface Invoice {
  id: string;
  number: string;
  amountUsd: string;
  currency: string;
  status: 'DRAFT' | 'DUE' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
  description: string;
  periodStart: string | null;
  periodEnd: string | null;
  pdfUrl: string | null;
}

interface Subscription {
  id: string;
  tier: string;
  status: string;
  startsAt: string;
  expiresAt: string;
  profitSharePct: string | null;
  monthlyFeeUsd: string | null;
}

interface License {
  id: string;
  licenseKey: string;
  type: string;
  status: string;
  startsAt: string;
  expiresAt: string;
  autoRenew: boolean;
}

const STATUS_COLOR: Record<Invoice['status'], string> = {
  PAID: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  DUE: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  OVERDUE: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  DRAFT: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  CANCELLED: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  REFUNDED: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
};

export function BillingTab() {
  const { getAuthHeaders } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/client/invoices', { headers: getAuthHeaders() })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setInvoices(data.invoices ?? []);
          setSubs(data.subscriptions ?? []);
          setLicenses(data.licenses ?? []);
        }
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="text-muted-foreground">Memuat…</p>;

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-lg font-semibold">Lisensi & Langganan Aktif</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {licenses.length === 0 && subs.length === 0 && (
            <p className="text-muted-foreground text-sm">Belum ada lisensi atau langganan aktif.</p>
          )}
          {licenses.map((l) => (
            <div key={l.id} className="flex items-center justify-between p-3 border border-border rounded-md">
              <div>
                <p className="font-mono text-xs text-amber-400">{l.licenseKey}</p>
                <p className="text-xs text-muted-foreground mt-1">{l.type}</p>
              </div>
              <div className="text-right">
                <span className={cn('inline-block px-2 py-0.5 text-[10px] rounded border',
                  l.status === 'ACTIVE' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-border text-muted-foreground')}>
                  {l.status}
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  Berakhir: {new Date(l.expiresAt).toLocaleDateString('id-ID')}
                </p>
                <p className="text-xs text-muted-foreground">
                  Auto-renew: {l.autoRenew ? 'On' : 'Off'}
                </p>
              </div>
            </div>
          ))}
          {subs.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 border border-border rounded-md">
              <div>
                <p className="font-medium text-sm">{s.tier}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {s.monthlyFeeUsd ? `$${s.monthlyFeeUsd}/bulan` : s.profitSharePct ? `Profit share ${s.profitSharePct}%` : '—'}
                </p>
              </div>
              <div className="text-right">
                <span className={cn('inline-block px-2 py-0.5 text-[10px] rounded border',
                  s.status === 'ACTIVE' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-border text-muted-foreground')}>
                  {s.status}
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  Berakhir: {new Date(s.expiresAt).toLocaleDateString('id-ID')}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-lg font-semibold">Riwayat Invoice</CardTitle></CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada invoice.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b border-border/50">
                  <tr>
                    <th className="text-left py-2 px-2">Nomor</th>
                    <th className="text-left py-2 px-2">Terbit</th>
                    <th className="text-right py-2 px-2">Jumlah</th>
                    <th className="text-center py-2 px-2">Status</th>
                    <th className="text-right py-2 px-2">Jatuh tempo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((i) => (
                    <tr key={i.id} className="border-b border-border/30">
                      <td className="py-2 px-2 font-mono text-xs">{i.number}</td>
                      <td className="py-2 px-2 text-muted-foreground">{new Date(i.issuedAt).toLocaleDateString('id-ID')}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{i.currency} {Number(i.amountUsd).toFixed(2)}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={cn('inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border', STATUS_COLOR[i.status])}>
                          {i.status}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right text-muted-foreground">{new Date(i.dueAt).toLocaleDateString('id-ID')}</td>
                      <td className="py-2 px-2 text-right">
                        {i.pdfUrl && <a href={i.pdfUrl} className="text-amber-400 hover:underline text-xs">PDF</a>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
