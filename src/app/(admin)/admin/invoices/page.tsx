'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FileText, X as XIcon, ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/admin/page-header';
import { FilterBar } from '@/components/admin/filter-bar';
import { EmptyState } from '@/components/admin/empty-state';
import { invoiceStatusBadge } from '@/lib/admin/badges';
import { formatDate, formatCurrency } from '@/lib/format-locale';

/* ─── Types ───────────────────────────────────────────────────────────────── */

interface InvoiceMeta {
  tier?: string;
  amountIdr?: number;
  provider?: string;
  [key: string]: unknown;
}

interface Invoice {
  id: string;
  number: string;
  userId: string;
  amountUsd: number;
  currency: string;
  status: string;
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
  description: string;
  subscriptionId: string | null;
  licenseId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  pdfUrl: string | null;
  metadata: InvoiceMeta;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; name: string | null };
}

type FilterType = 'ALL' | 'DRAFT' | 'DUE' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';

const STATUSES: FilterType[] = ['ALL', 'DRAFT', 'DUE', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED'];

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function AdminInvoicesPage() {
  const t = useTranslations('admin.invoices');
  const tc = useTranslations('admin.common');
  const { getAuthHeaders } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Invoice | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/invoices', { headers: getAuthHeaders() });
      if (res.ok) {
        setInvoices(await res.json());
      } else {
        toast.push({ title: t('toast_load_error'), description: `HTTP ${res.status}`, tone: 'error' });
      }
    } catch (err) {
      toast.push({ title: 'Network error', description: err instanceof Error ? err.message : 'Unknown', tone: 'error' });
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, toast, t]);

  // fetchInvoices drives setState — intentional fetch on mount + refetch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  /* ── Actions ──────────────────────────────────────────────────────────── */

  async function handleStatusChange(inv: Invoice, newStatus: 'CANCELLED' | 'REFUNDED') {
    const label = newStatus === 'CANCELLED' ? t('btn_cancel') : 'Refund';
    const ok = await confirm({
      title: `${label} Invoice ${inv.number}?`,
      description: t('confirm_desc', { status: newStatus }),
      confirmLabel: label,
      tone: 'destructive',
    });
    if (!ok) return;
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: inv.id, status: newStatus }),
      });
      if (res.ok) {
        toast.push({ title: `Invoice ${inv.number} di-${label.toLowerCase()}`, tone: 'success' });
        fetchInvoices();
        if (detail?.id === inv.id) setDetail(null);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.push({ title: t('toast_status_error'), description: data.error || `HTTP ${res.status}`, tone: 'error' });
      }
    } catch (err) {
      toast.push({ title: 'Network error', description: err instanceof Error ? err.message : 'Unknown', tone: 'error' });
    }
  }

  /* ── Filtering ────────────────────────────────────────────────────────── */

  const filtered = invoices
    .filter((inv) => filter === 'ALL' || inv.status === filter)
    .filter((inv) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        inv.number.toLowerCase().includes(q) ||
        inv.user.email.toLowerCase().includes(q) ||
        (inv.user.name || '').toLowerCase().includes(q)
      );
    });

  const filterOptions = STATUSES.map((s) => ({
    value: s,
    label: s === 'ALL' ? tc('filter_all') : s,
    count: s === 'ALL' ? invoices.length : invoices.filter((inv) => inv.status === s).length,
  }));

  /* ── Summary ──────────────────────────────────────────────────────────── */

  const paidInvoices = invoices.filter((inv) => inv.status === 'PAID');
  const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.amountUsd, 0);

  /* ── Helpers ──────────────────────────────────────────────────────────── */

  function metaTier(inv: Invoice): string {
    return inv.metadata?.tier || '-';
  }

  function metaProvider(inv: Invoice): string {
    return inv.metadata?.provider || '-';
  }

  function metaIdr(inv: Invoice): string {
    const idr = inv.metadata?.amountIdr;
    return typeof idr === 'number' ? formatCurrency(idr, 'IDR', 'id') : '-';
  }

  const canChangeStatus = (status: string) => !['CANCELLED', 'REFUNDED', 'DRAFT'].includes(status);

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('description', { count: invoices.length })}
      />

      {/* Summary cards */}
      {!loading && invoices.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{t('card_total')}</div>
              <div className="text-2xl font-semibold mt-1">{invoices.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{t('card_paid')}</div>
              <div className="text-2xl font-semibold mt-1 text-emerald-700 dark:text-emerald-300">{paidInvoices.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{t('card_revenue')}</div>
              <div className="text-2xl font-semibold mt-1">{formatCurrency(totalRevenue, 'USD', 'en')}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <FilterBar
        className="mb-4"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('search_placeholder')}
        filters={filterOptions}
        activeFilter={filter}
        onFilterChange={setFilter}
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState
                variant="inline"
                icon={FileText}
                title={search
                  ? t('empty_search')
                  : filter === 'ALL'
                    ? t('empty_no_data')
                    : t('empty_filter', { status: filter })}
                description={!search && filter === 'ALL' ? t('empty_no_data_desc') : undefined}
              />
            </div>
          ) : (
            <div className="md:overflow-x-auto">
              <table className="w-full text-sm table-responsive">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium text-muted-foreground">{t('th_invoice')}</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">{t('th_user')}</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">{t('th_amount')}</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">{t('th_tier')}</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">{t('th_status')}</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">{t('th_provider')}</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">{t('th_created')}</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">{t('th_paid_at')}</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">{t('th_actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => {
                    const badge = invoiceStatusBadge(inv.status);
                    return (
                      <tr key={inv.id} className="border-b hover:bg-accent/50 transition-colors">
                        <td className="p-4 font-mono text-xs" data-label="Invoice #">
                          <button
                            type="button"
                            className="text-left hover:underline text-primary"
                            onClick={() => setDetail(inv)}
                          >
                            {inv.number}
                          </button>
                        </td>
                        <td className="p-4" data-label="User">
                          <div className="truncate max-w-[180px]">{inv.user.email}</div>
                          {inv.user.name && (
                            <div className="text-xs text-muted-foreground truncate">{inv.user.name}</div>
                          )}
                        </td>
                        <td className="p-4" data-label="Amount">
                          <div>{formatCurrency(inv.amountUsd, 'USD', 'en')}</div>
                          <div className="text-xs text-muted-foreground">{metaIdr(inv)}</div>
                        </td>
                        <td className="p-4" data-label="Tier">{metaTier(inv)}</td>
                        <td className="p-4" data-label="Status">
                          <span className={cn('px-2 py-1 rounded-full text-xs font-medium', badge.cls)}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground" data-label="Provider">{metaProvider(inv)}</td>
                        <td className="p-4 text-muted-foreground" data-label="Dibuat">{formatDate(inv.createdAt)}</td>
                        <td className="p-4 text-muted-foreground" data-label="Paid At">{formatDate(inv.paidAt)}</td>
                        <td className="p-4" data-label="Aksi">
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => setDetail(inv)}>
                              {tc('details')}
                            </Button>
                            {canChangeStatus(inv.status) && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleStatusChange(inv, 'CANCELLED')}
                              >
                                {t('btn_cancel')}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail modal */}
      {detail && (
        <DetailModal
          invoice={detail}
          onClose={() => setDetail(null)}
          onCancel={canChangeStatus(detail.status) ? () => handleStatusChange(detail, 'CANCELLED') : undefined}
          onRefund={canChangeStatus(detail.status) ? () => handleStatusChange(detail, 'REFUNDED') : undefined}
        />
      )}
    </div>
  );
}

/* ─── Detail Modal ────────────────────────────────────────────────────────── */

function DetailModal({
  invoice,
  onClose,
  onCancel,
  onRefund,
}: {
  invoice: Invoice;
  onClose: () => void;
  onCancel?: () => void;
  onRefund?: () => void;
}) {
  const t = useTranslations('admin.invoices');
  const tc = useTranslations('admin.common');
  const badge = invoiceStatusBadge(invoice.status);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Invoice ${invoice.number}`}
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={tc('close')}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-card border border-border rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Invoice {invoice.number}</h2>
            <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium mt-1', badge.cls)}>
              {badge.label}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={tc('close')}
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Key info grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <InfoRow label="User" value={invoice.user.name ? `${invoice.user.name} (${invoice.user.email})` : invoice.user.email} />
            <InfoRow label="Amount USD" value={formatCurrency(invoice.amountUsd, 'USD', 'en')} />
            <InfoRow label="Amount IDR" value={typeof invoice.metadata?.amountIdr === 'number' ? formatCurrency(invoice.metadata.amountIdr, 'IDR', 'id') : '-'} />
            <InfoRow label="Currency" value={invoice.currency} />
            <InfoRow label="Tier" value={invoice.metadata?.tier || '-'} />
            <InfoRow label="Provider" value={invoice.metadata?.provider || '-'} />
            <InfoRow label={t('label_description')} value={invoice.description} />
            <InfoRow label="Issued At" value={formatDate(invoice.issuedAt)} />
            <InfoRow label="Due At" value={formatDate(invoice.dueAt)} />
            <InfoRow label="Paid At" value={formatDate(invoice.paidAt)} />
            <InfoRow label="Period" value={invoice.periodStart ? `${formatDate(invoice.periodStart)} - ${formatDate(invoice.periodEnd)}` : '-'} />
            <InfoRow label="Created" value={formatDate(invoice.createdAt)} />
          </div>

          {/* PDF link */}
          {invoice.pdfUrl && (
            <div>
              <a
                href={invoice.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t('view_pdf')}
              </a>
            </div>
          )}

          {/* Metadata JSON */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">{t('metadata_title')}</h3>
            <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto max-h-48 border border-border">
              {JSON.stringify(invoice.metadata, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer actions */}
        {(onCancel || onRefund) && (
          <div className="flex items-center gap-2 px-6 py-4 border-t border-border bg-muted/20">
            {onCancel && (
              <Button size="sm" variant="destructive" onClick={onCancel}>
                {t('btn_cancel_invoice')}
              </Button>
            )}
            {onRefund && (
              <Button size="sm" variant="outline" onClick={onRefund}>
                {t('btn_refund_invoice')}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Small helpers ───────────────────────────────────────────────────────── */

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs font-medium mb-0.5">{label}</dt>
      <dd className="text-foreground break-words">{value || '-'}</dd>
    </div>
  );
}
