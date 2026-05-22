/**
 * PDF Invoice Generation — pakai pdf-lib (pure JS, no native deps,
 * Next.js standalone friendly).
 *
 * Pak Abdullah audit 2026-05-22 directive — tuntaskan deferred PDF
 * invoice generation. PDF saved to /public/uploads/invoices/<id>.pdf,
 * URL persisted di Invoice.metadata.pdfUrl, included di activation email.
 *
 * Bilingual: subject + headings localized per invoice.metadata.locale.
 * Layout: 1-page A4, brand-aligned amber accent.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { createLogger } from '@/lib/logger';
import { idrToUsd } from '@/lib/payment/rates';

const log = createLogger('pdf-invoice');

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'invoices');

export interface InvoicePdfInput {
  invoiceId: string;
  invoiceNumber: string;
  issuedAt: Date;
  paidAt?: Date | null;
  dueAt?: Date | null;
  customer: { name: string; email: string };
  amountIdr: number;
  originalAmountIdr?: number;
  description: string;
  tier: string;
  provider: 'xendit' | 'midtrans';
  promo?: { slug: string; discountValue: number; discountType: 'PERCENT' | 'FIXED_IDR' } | null;
  locale?: 'id' | 'en';
}

const I18N = {
  id: {
    title: 'INVOICE',
    invoiceNo: 'No. Invoice',
    issuedAt: 'Tanggal Terbit',
    paidAt: 'Tanggal Pembayaran',
    dueAt: 'Jatuh Tempo',
    billedTo: 'Ditagihkan Kepada',
    description: 'Deskripsi',
    subtotal: 'Subtotal',
    discount: 'Diskon',
    total: 'Total',
    paymentMethod: 'Metode Pembayaran',
    status: 'Status',
    paidStatus: 'LUNAS',
    dueStatus: 'BELUM DIBAYAR',
    thankYou: 'Terima kasih atas kepercayaan Anda.',
    contact: 'Bantuan? hello@babahalgo.com',
  },
  en: {
    title: 'INVOICE',
    invoiceNo: 'Invoice No.',
    issuedAt: 'Issued At',
    paidAt: 'Paid At',
    dueAt: 'Due At',
    billedTo: 'Billed To',
    description: 'Description',
    subtotal: 'Subtotal',
    discount: 'Discount',
    total: 'Total',
    paymentMethod: 'Payment Method',
    status: 'Status',
    paidStatus: 'PAID',
    dueStatus: 'UNPAID',
    thankYou: 'Thank you for your trust.',
    contact: 'Support? hello@babahalgo.com',
  },
};

function fmtIdr(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}
function fmtUsd(n: number): string {
  return '$' + n.toFixed(2);
}
function fmtDate(d: Date | null | undefined, locale: 'id' | 'en'): string {
  if (!d) return '—';
  return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

interface DrawParams {
  page: ReturnType<PDFDocument['addPage']>;
  text: string;
  x: number;
  y: number;
  size?: number;
  font: PDFFont;
  color?: ReturnType<typeof rgb>;
}
function drawText({ page, text, x, y, size = 11, font, color = rgb(0.1, 0.1, 0.15) }: DrawParams) {
  page.drawText(text, { x, y, size, font, color });
}

export interface InvoicePdfResult {
  pdfUrl: string;
  filename: string;
  sizeBytes: number;
}

export async function generateInvoicePdf(input: InvoicePdfInput): Promise<InvoicePdfResult> {
  const locale: 'id' | 'en' = input.locale === 'en' ? 'en' : 'id';
  const t = I18N[locale];
  const isPaid = !!input.paidAt;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4 portrait
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // ── Header brand banner ───────────────────────────────────────────
  const accentColor = rgb(0.96, 0.71, 0.18); // amber-500
  page.drawRectangle({ x: 0, y: 791, width: 595.28, height: 50, color: accentColor });
  drawText({ page, text: 'BabahAlgo', x: 40, y: 810, size: 18, font: bold, color: rgb(0.07, 0.07, 0.13) });
  drawText({ page, text: 'CV Babah Digital · babahalgo.com', x: 40, y: 795, size: 9, font, color: rgb(0.07, 0.07, 0.13) });
  drawText({ page, text: t.title, x: 460, y: 810, size: 22, font: bold, color: rgb(0.07, 0.07, 0.13) });

  // ── Invoice meta block ───────────────────────────────────────────
  let y = 740;
  drawText({ page, text: `${t.invoiceNo}: ${input.invoiceNumber}`, x: 40, y, size: 10, font: bold });
  drawText({ page, text: `${t.issuedAt}: ${fmtDate(input.issuedAt, locale)}`, x: 320, y, size: 10, font });
  y -= 16;
  drawText({
    page,
    text: `${t.status}:`,
    x: 40, y, size: 10, font: bold,
  });
  drawText({
    page,
    text: isPaid ? t.paidStatus : t.dueStatus,
    x: 90, y, size: 10, font: bold,
    color: isPaid ? rgb(0.05, 0.55, 0.32) : rgb(0.85, 0.30, 0.15),
  });
  if (isPaid && input.paidAt) {
    drawText({ page, text: `${t.paidAt}: ${fmtDate(input.paidAt, locale)}`, x: 320, y, size: 10, font });
  } else if (input.dueAt) {
    drawText({ page, text: `${t.dueAt}: ${fmtDate(input.dueAt, locale)}`, x: 320, y, size: 10, font });
  }

  // ── Customer block ───────────────────────────────────────────────
  y -= 36;
  drawText({ page, text: t.billedTo, x: 40, y, size: 9, font: bold, color: rgb(0.45, 0.45, 0.50) });
  y -= 14;
  drawText({ page, text: input.customer.name, x: 40, y, size: 11, font: bold });
  y -= 14;
  drawText({ page, text: input.customer.email, x: 40, y, size: 10, font, color: rgb(0.4, 0.4, 0.45) });

  // ── Line item table ──────────────────────────────────────────────
  y -= 36;
  page.drawRectangle({ x: 40, y: y - 4, width: 515, height: 26, color: rgb(0.96, 0.95, 0.93) });
  drawText({ page, text: t.description, x: 48, y: y + 8, size: 10, font: bold });
  drawText({ page, text: t.total, x: 480, y: y + 8, size: 10, font: bold });

  y -= 26;
  drawText({ page, text: input.description, x: 48, y, size: 10, font });
  const originalAmount = input.originalAmountIdr ?? input.amountIdr;
  drawText({ page, text: fmtIdr(originalAmount), x: 460, y, size: 10, font });

  // ── Discount row (if applied) ────────────────────────────────────
  if (input.promo && originalAmount > input.amountIdr) {
    y -= 18;
    const discountValue = originalAmount - input.amountIdr;
    const discountLabel = input.promo.discountType === 'PERCENT'
      ? `${t.discount} (${input.promo.discountValue}%)`
      : t.discount;
    drawText({ page, text: discountLabel, x: 48, y, size: 10, font, color: rgb(0.05, 0.55, 0.32) });
    drawText({ page, text: `- ${fmtIdr(discountValue)}`, x: 460, y, size: 10, font, color: rgb(0.05, 0.55, 0.32) });
  }

  // ── Total row (highlighted) ──────────────────────────────────────
  y -= 26;
  page.drawLine({ start: { x: 40, y: y + 14 }, end: { x: 555, y: y + 14 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.75) });
  drawText({ page, text: t.total, x: 48, y, size: 13, font: bold });
  drawText({ page, text: fmtIdr(input.amountIdr), x: 440, y, size: 13, font: bold });
  y -= 14;
  drawText({
    page, text: `≈ ${fmtUsd(idrToUsd(input.amountIdr))}`,
    x: 488, y, size: 9, font, color: rgb(0.5, 0.5, 0.55),
  });

  // ── Payment meta ─────────────────────────────────────────────────
  y -= 30;
  drawText({ page, text: t.paymentMethod, x: 40, y, size: 9, font: bold, color: rgb(0.45, 0.45, 0.50) });
  y -= 14;
  drawText({
    page,
    text: input.provider === 'xendit' ? 'Xendit (Multi-channel)' : 'Midtrans (Multi-channel)',
    x: 40, y, size: 10, font,
  });

  // ── Footer ───────────────────────────────────────────────────────
  drawText({ page, text: t.thankYou, x: 40, y: 70, size: 10, font, color: rgb(0.45, 0.45, 0.50) });
  drawText({ page, text: t.contact, x: 40, y: 56, size: 9, font, color: rgb(0.55, 0.55, 0.60) });
  drawText({ page, text: `Generated: ${new Date().toISOString()}`, x: 40, y: 42, size: 8, font, color: rgb(0.65, 0.65, 0.70) });

  // ── Save ──────────────────────────────────────────────────────────
  const pdfBytes = await pdf.save();
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${input.invoiceId}.pdf`;
  const fullPath = path.join(UPLOAD_DIR, filename);
  await writeFile(fullPath, pdfBytes, { mode: 0o644 });

  const pdfUrl = `/api/uploads/invoices/${filename}`;
  log.info(`Invoice PDF generated: id=${input.invoiceId} bytes=${pdfBytes.byteLength} url=${pdfUrl}`);

  return { pdfUrl, filename, sizeBytes: pdfBytes.byteLength };
}
