/**
 * Single formatter for invoice amounts across all portal surfaces (billing
 * history + account billing tab). Prefer the REAL IDR amount actually charged
 * (persisted in Invoice.metadata.amountIdr at checkout and surfaced by
 * /api/client/invoices) — surfacing only a derived USD value mislabeled what
 * the customer actually paid. Falls back to the stored currency + amountUsd
 * when no IDR amount was recorded. (P1-DI-9)
 */
export interface InvoiceAmountLike {
  amountUsd: string | number;
  currency: string;
  amountIdr?: number | null;
}

export function formatInvoiceAmount(inv: InvoiceAmountLike): string {
  const idr = inv.amountIdr != null ? Number(inv.amountIdr) : NaN;
  if (Number.isFinite(idr) && idr > 0) {
    return `Rp ${idr.toLocaleString('id-ID')}`;
  }
  return `${inv.currency} ${Number(inv.amountUsd).toFixed(2)}`;
}
