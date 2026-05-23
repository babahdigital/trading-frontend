'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { FileText, Download, ReceiptText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';

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

const STATUS_COLOR: Record<Invoice['status'], string> = {
  PAID: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  DUE: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  OVERDUE: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  DRAFT: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  CANCELLED: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  REFUNDED: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
};

export default function BillingHistoryPage() {
  const { getAuthHeaders } = useAuth();
  const t = useTranslations('portal.billing_history');
  const locale = useLocale();
  const dateLocale = locale === 'en' ? 'en-US' : 'id-ID';
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/client/invoices', { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : { invoices: [] }))
      .then((data) => {
        setInvoices(data.invoices ?? []);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="portal-page-stack">
      <PageHeader title={t('title')} description={t('subtitle')} />

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-amber-500" />
            {t('card_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-muted/30 rounded animate-pulse" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">{t('empty')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b border-border/50">
                  <tr>
                    <th className="text-left py-2 px-2">{t('col_number')}</th>
                    <th className="text-right py-2 px-2">{t('col_amount')}</th>
                    <th className="text-center py-2 px-2">{t('col_status')}</th>
                    <th className="text-left py-2 px-2">{t('col_description')}</th>
                    <th className="text-left py-2 px-2">{t('col_created')}</th>
                    <th className="text-left py-2 px-2">{t('col_paid_at')}</th>
                    <th className="text-right py-2 px-2">{t('col_pdf')}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/30 hover:bg-muted/5 transition-colors">
                      <td className="py-2.5 px-2 font-mono text-xs">{inv.number}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums">
                        {inv.currency} {Number(inv.amountUsd).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span
                          className={cn(
                            'inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border',
                            STATUS_COLOR[inv.status],
                          )}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-muted-foreground max-w-[200px] truncate">
                        {inv.description}
                      </td>
                      <td className="py-2.5 px-2 text-muted-foreground">
                        {new Date(inv.issuedAt).toLocaleDateString(dateLocale)}
                      </td>
                      <td className="py-2.5 px-2 text-muted-foreground">
                        {inv.paidAt
                          ? new Date(inv.paidAt).toLocaleDateString(dateLocale)
                          : <span className="text-muted-foreground/40">--</span>}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        {inv.pdfUrl && (
                          <a
                            href={inv.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 hover:underline text-xs"
                          >
                            <Download className="h-3 w-3" />
                            PDF
                          </a>
                        )}
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
