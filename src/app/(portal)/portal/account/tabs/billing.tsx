'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { formatInvoiceAmount } from '@/lib/billing/invoice-format';

interface Invoice {
  id: string;
  number: string;
  amountUsd: string;
  amountIdr: number | null;
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
  const t = useTranslations('portal.account.billing');
  const tParent = useTranslations('portal.account');
  const locale = useLocale();
  const dateLocale = locale === 'en' ? 'en-US' : 'id-ID';
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/client/invoices', { headers: getAuthHeaders() })
      .then((r) => r.ok ? r.json() : { invoices: [], subscriptions: [], licenses: [] })
      .then((data) => {
        setInvoices(data.invoices ?? []);
        setSubs(data.subscriptions ?? []);
        setLicenses(data.licenses ?? []);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="text-muted-foreground">{tParent('loading')}</p>;

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-lg font-semibold">{t('active_title')}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {licenses.length === 0 && subs.length === 0 && (
            <p className="text-muted-foreground text-sm">{t('active_empty')}</p>
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
                  {t('ends_at')}: {new Date(l.expiresAt).toLocaleDateString(dateLocale)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('auto_renew_label')}: {l.autoRenew ? t('auto_renew_on') : t('auto_renew_off')}
                </p>
              </div>
            </div>
          ))}
          {subs.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 border border-border rounded-md">
              <div>
                <p className="font-medium text-sm">{s.tier}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {/* Zero-custody: flat monthly only — never surface any
                      profit-share / performance-fee figure (legal directive). */}
                  {s.monthlyFeeUsd ? t('flat_per_month', { fee: s.monthlyFeeUsd }) : '—'}
                </p>
              </div>
              <div className="text-right">
                <span className={cn('inline-block px-2 py-0.5 text-[10px] rounded border',
                  s.status === 'ACTIVE' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-border text-muted-foreground')}>
                  {s.status}
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('ends_at')}: {new Date(s.expiresAt).toLocaleDateString(dateLocale)}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-lg font-semibold">{t('history_title')}</CardTitle></CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('history_empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b border-border/50">
                  <tr>
                    <th className="text-left py-2 px-2">{t('col_number')}</th>
                    <th className="text-left py-2 px-2">{t('col_issued')}</th>
                    <th className="text-right py-2 px-2">{t('col_amount')}</th>
                    <th className="text-center py-2 px-2">{t('col_status')}</th>
                    <th className="text-right py-2 px-2">{t('col_due')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((i) => (
                    <tr key={i.id} className="border-b border-border/30">
                      <td className="py-2 px-2 font-mono text-xs">{i.number}</td>
                      <td className="py-2 px-2 text-muted-foreground">{new Date(i.issuedAt).toLocaleDateString(dateLocale)}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{formatInvoiceAmount(i)}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={cn('inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border', STATUS_COLOR[i.status])}>
                          {i.status}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right text-muted-foreground">{new Date(i.dueAt).toLocaleDateString(dateLocale)}</td>
                      <td className="py-2 px-2 text-right">
                        {i.pdfUrl && <a href={i.pdfUrl} className="text-amber-400 hover:underline text-xs">{t('pdf_label')}</a>}
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
