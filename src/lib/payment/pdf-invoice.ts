/**
 * Premium institutional PDF invoice — pdf-lib (pure JS, no native deps,
 * Next.js standalone friendly).
 *
 * Pak Abdullah audit 2026-05-22 directive: "buatkan versi premium dan
 * institusional pdf invoicenya, sempurnakan". Upgrade dari 1-page
 * basic layout → multi-section institutional grade design.
 *
 * Design language:
 *   - Navy/charcoal heading ink (#0B1220) + slate labels (#475569)
 *   - Amber accent (#F5B547) untuk brand band + section dividers
 *   - Sand neutral row striping (#F8F5EF) untuk line item table
 *   - Status badge full-color (emerald PAID / rose UNPAID)
 *   - "PAID" watermark rotated diagonal (kalau invoice paid)
 *   - Brand logo embedded di header (top-left)
 *   - Multi-section: Bill From / Bill To / Items / Totals / Payment /
 *     Terms / Footer dengan invoice hash + timestamp
 *
 * Bilingual: subject + headings localized per invoice.metadata.locale.
 * Currency: IDR primary, USD secondary (auto convert via lib/payment/rates).
 */
import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import { mkdir, writeFile, readFile } from 'fs/promises';
import path from 'path';
import { createLogger } from '@/lib/logger';
import { idrToUsd } from '@/lib/payment/rates';
import { getCompanySettings, type CompanySettings } from '@/lib/company/settings';

const log = createLogger('pdf-invoice');

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'invoices');
const LOGO_PATH = path.join(process.cwd(), 'public', 'logo', 'babahalgo-icon-256.png');

// ─── Brand palette ──────────────────────────────────────────────────
const COLOR = {
  ink: rgb(0.043, 0.071, 0.125),          // #0B1220 navy/charcoal
  inkSoft: rgb(0.2, 0.24, 0.31),          // #334155 slate-700
  label: rgb(0.42, 0.45, 0.5),            // #6B7280 muted
  rule: rgb(0.86, 0.87, 0.89),            // #DBDDE0 hairline border
  ruleSoft: rgb(0.93, 0.93, 0.95),        // very soft rule
  amber: rgb(0.96, 0.71, 0.18),           // #F5B547 brand amber
  amberDeep: rgb(0.78, 0.55, 0.10),       // #C68B19 darker amber for text
  sand: rgb(0.97, 0.96, 0.94),            // #F8F5EF row striping
  emerald: rgb(0.06, 0.6, 0.43),          // #10B981 paid
  emeraldSoft: rgb(0.86, 0.96, 0.91),     // emerald-50 bg
  rose: rgb(0.88, 0.11, 0.28),            // #E11D48 unpaid
  roseSoft: rgb(0.98, 0.88, 0.91),        // rose-50 bg
  watermark: rgb(0.96, 0.84, 0.5),        // light amber for watermark stamp
};

const PAGE = {
  W: 595.28, H: 841.89,
  marginX: 48, marginTop: 56, marginBottom: 56,
};

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
  /** Optional payment method label (Xendit channel — VA bank, QRIS, etc). */
  paymentMethodLabel?: string;
}

const I18N = {
  id: {
    title: 'INVOICE',
    subtitle: 'Faktur Pembayaran',
    invoiceNo: 'No. Invoice',
    issuedAt: 'Tanggal Terbit',
    paidAt: 'Tanggal Pembayaran',
    dueAt: 'Jatuh Tempo',
    billFrom: 'Ditagihkan Oleh',
    billTo: 'Ditagihkan Kepada',
    description: 'Deskripsi',
    qty: 'Qty',
    unitPrice: 'Harga Satuan',
    amount: 'Jumlah',
    subtotal: 'Subtotal',
    discount: 'Diskon',
    total: 'Total Akhir',
    totalUsd: 'Setara USD',
    paymentMethod: 'Metode Pembayaran',
    status: 'Status',
    paidStatus: 'LUNAS',
    dueStatus: 'BELUM DIBAYAR',
    notesTitle: 'Catatan & Ketentuan',
    notes: [
      'Invoice ini sah tanpa tanda tangan basah karena diterbitkan secara elektronik.',
      'Pembayaran via gateway terenkripsi PCI DSS Level 1 melalui Xendit/Midtrans.',
      'Refund mengikuti kebijakan 7 hari pertama untuk pelanggan baru — hubungi support.',
      'Pertanyaan billing? Email %SUPPORT% atau %COMPLIANCE% untuk hal compliance.',
    ],
    footerLeft: 'Diterbitkan elektronik oleh sistem BabahAlgo · Dokumen ini tidak memerlukan tanda tangan basah.',
    page: 'Halaman',
    of: 'dari',
    generated: 'Dibuat',
    watermarkPaid: 'LUNAS',
    qty1: '1',
  },
  en: {
    title: 'INVOICE',
    subtitle: 'Payment Invoice',
    invoiceNo: 'Invoice No.',
    issuedAt: 'Issued At',
    paidAt: 'Paid At',
    dueAt: 'Due At',
    billFrom: 'Billed By',
    billTo: 'Billed To',
    description: 'Description',
    qty: 'Qty',
    unitPrice: 'Unit Price',
    amount: 'Amount',
    subtotal: 'Subtotal',
    discount: 'Discount',
    total: 'Grand Total',
    totalUsd: 'USD Equivalent',
    paymentMethod: 'Payment Method',
    status: 'Status',
    paidStatus: 'PAID',
    dueStatus: 'UNPAID',
    notesTitle: 'Notes & Terms',
    notes: [
      'This invoice is valid without a wet signature as it is issued electronically.',
      'Payment via PCI DSS Level 1 encrypted gateway through Xendit/Midtrans.',
      'Refund follows the first 7-day policy for new subscribers — contact support.',
      'Billing questions? Email %SUPPORT% or %COMPLIANCE% for compliance matters.',
    ],
    footerLeft: 'Electronically issued by the BabahAlgo system · This document requires no signature.',
    page: 'Page',
    of: 'of',
    generated: 'Generated',
    watermarkPaid: 'PAID',
    qty1: '1',
  },
};

// ─── Helpers ────────────────────────────────────────────────────────
/**
 * WinAnsi sanitizer — pdf-lib StandardFonts (Helvetica family) encode di
 * WinAnsi yang TIDAK punya Unicode chars seperti em-dash, smart-quotes,
 * minus sign, approx symbol. Replace dengan ASCII-safe equivalents
 * supaya rendering tidak crash di input customer arbitrary.
 *
 * Untuk full Unicode support nanti: pakai pdf.embedFont(NotoSansTTF) +
 * registerFontkit. Sementara ASCII-safe sufficient untuk invoice business.
 */
function sanitizeForWinAnsi(text: string): string {
  return text
    .replace(/[—–]/g, '-')      // em/en dash → hyphen
    .replace(/−/g, '-')              // minus sign → hyphen
    .replace(/≈/g, '~=')             // approx symbol → ~=
    .replace(/[‘’]/g, "'")     // smart single quotes → '
    .replace(/[“”]/g, '"')     // smart double quotes → "
    .replace(/…/g, '...')            // ellipsis → ...
    .replace(/ /g, ' ');             // non-breaking space → space
}

function fmtIdr(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}
function fmtUsd(n: number): string {
  return '$' + n.toFixed(2);
}
function fmtDate(d: Date | null | undefined, locale: 'id' | 'en'): string {
  if (!d) return '-';
  return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

interface DrawParams {
  page: PDFPage;
  text: string;
  x: number;
  y: number;
  size?: number;
  font: PDFFont;
  color?: ReturnType<typeof rgb>;
  maxWidth?: number;
}
function drawText({ page, text, x, y, size = 10, font, color = COLOR.ink, maxWidth }: DrawParams) {
  const safe = sanitizeForWinAnsi(text);
  page.drawText(safe, { x, y, size, font, color, maxWidth });
}

/** Right-align text horizontally at given x as the right edge. */
function drawTextRight({ page, text, x, y, size = 10, font, color = COLOR.ink }: DrawParams) {
  const safe = sanitizeForWinAnsi(text);
  const width = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, { x: x - width, y, size, font, color });
}

/** Try-load logo PNG; return null if missing (so PDF still renders). */
async function loadLogoSafe(pdf: PDFDocument): Promise<PDFImage | null> {
  try {
    const bytes = await readFile(LOGO_PATH);
    return await pdf.embedPng(bytes);
  } catch (err) {
    log.warn(`Logo embed failed (${LOGO_PATH}): ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export interface InvoicePdfResult {
  pdfUrl: string;
  filename: string;
  sizeBytes: number;
}

// ─── Generator ──────────────────────────────────────────────────────
export async function generateInvoicePdf(input: InvoicePdfInput): Promise<InvoicePdfResult> {
  const locale: 'id' | 'en' = input.locale === 'en' ? 'en' : 'id';
  const t = I18N[locale];
  const isPaid = !!input.paidAt;

  const company = await getCompanySettings().catch((): CompanySettings => ({
    name: 'BabahAlgo', legalEntity: 'CV Babah Digital',
    tagline: '', taglineEn: '', logoUrl: '', logoDarkUrl: '',
    address: 'Indonesia', phone: '', whatsappDigits: '',
    emailGeneral: 'hello@babahalgo.com', emailCompliance: 'compliance@babahalgo.com',
    emailSupport: 'support@babahalgo.com', country: 'ID', foundedYear: '2024',
    twitterUrl: '', linkedinUrl: '', telegramUrl: '', instagramUrl: '',
    refundPolicyDays: 7,
  }));

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invoice ${input.invoiceNumber} — ${company.name}`);
  pdf.setAuthor(company.legalEntity);
  pdf.setSubject(`Invoice — ${input.description}`);
  pdf.setProducer('BabahAlgo Invoice System');
  pdf.setCreator('BabahAlgo');
  pdf.setCreationDate(input.issuedAt);

  const page = pdf.addPage([PAGE.W, PAGE.H]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const oblique = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const logo = await loadLogoSafe(pdf);

  // ═══ WATERMARK (drawn FIRST so content sits above) ═════════════════
  // Diagonal rotated "PAID/LUNAS" stamp di tengah halaman, large faded
  // amber. Only render kalau invoice is paid.
  if (isPaid) {
    page.drawText(sanitizeForWinAnsi(t.watermarkPaid), {
      x: 80, y: 360,
      size: 140,
      font: bold,
      color: COLOR.watermark,
      rotate: degrees(28),
      opacity: 0.18,
    });
  }

  // ═══ HEADER BAND ════════════════════════════════════════════════════
  // Brand mark + wordmark di kiri-atas, INVOICE title di kanan-atas,
  // amber divider band sebagai pembatas section bawah header.
  const HEADER_Y = PAGE.H - PAGE.marginTop;

  // Brand logo (top-left)
  if (logo) {
    const logoDim = 36;
    page.drawImage(logo, {
      x: PAGE.marginX,
      y: HEADER_Y - logoDim,
      width: logoDim,
      height: logoDim,
    });
  }

  // Brand wordmark + tagline next to logo
  const brandX = PAGE.marginX + (logo ? 48 : 0);
  drawText({ page, text: company.name, x: brandX, y: HEADER_Y - 14, size: 18, font: bold, color: COLOR.ink });
  drawText({
    page,
    text: locale === 'en' ? (company.taglineEn || company.tagline) : company.tagline,
    x: brandX, y: HEADER_Y - 28, size: 8.5, font, color: COLOR.label,
  });

  // INVOICE title (top-right, large)
  drawTextRight({
    page, text: t.title,
    x: PAGE.W - PAGE.marginX, y: HEADER_Y - 8,
    size: 26, font: bold, color: COLOR.ink,
  });
  drawTextRight({
    page, text: t.subtitle,
    x: PAGE.W - PAGE.marginX, y: HEADER_Y - 24,
    size: 9, font: oblique, color: COLOR.label,
  });

  // Amber divider line under header
  page.drawRectangle({
    x: PAGE.marginX, y: HEADER_Y - 50,
    width: PAGE.W - PAGE.marginX * 2, height: 2,
    color: COLOR.amber,
  });

  // ═══ INVOICE META STRIP ═════════════════════════════════════════════
  // 3-col grid: Invoice #, Issued At, Status pill
  let y = HEADER_Y - 72;
  const colW = (PAGE.W - PAGE.marginX * 2) / 3;

  function metaCell(idx: number, label: string, value: string, valueColor = COLOR.ink, valueBold = true) {
    const cx = PAGE.marginX + colW * idx;
    drawText({ page, text: label.toUpperCase(), x: cx, y, size: 7.5, font: bold, color: COLOR.label });
    drawText({
      page, text: value,
      x: cx, y: y - 14,
      size: 11, font: valueBold ? bold : font, color: valueColor,
    });
  }
  metaCell(0, t.invoiceNo, input.invoiceNumber);
  metaCell(1, t.issuedAt, fmtDate(input.issuedAt, locale), COLOR.inkSoft, false);

  // Status pill (col 3)
  const statusLabel = isPaid ? t.paidStatus : t.dueStatus;
  const statusBg = isPaid ? COLOR.emeraldSoft : COLOR.roseSoft;
  const statusFg = isPaid ? COLOR.emerald : COLOR.rose;
  const cx3 = PAGE.marginX + colW * 2;
  drawText({ page, text: t.status.toUpperCase(), x: cx3, y, size: 7.5, font: bold, color: COLOR.label });
  const pillW = bold.widthOfTextAtSize(statusLabel, 10) + 18;
  page.drawRectangle({
    x: cx3, y: y - 18, width: pillW, height: 18,
    color: statusBg,
  });
  drawText({
    page, text: statusLabel, x: cx3 + 9, y: y - 13,
    size: 10, font: bold, color: statusFg,
  });
  // Paid/Due date next to pill
  if (isPaid && input.paidAt) {
    drawText({
      page, text: `${t.paidAt}: ${fmtDate(input.paidAt, locale)}`,
      x: cx3 + pillW + 8, y: y - 13, size: 8, font, color: COLOR.label,
    });
  } else if (input.dueAt) {
    drawText({
      page, text: `${t.dueAt}: ${fmtDate(input.dueAt, locale)}`,
      x: cx3 + pillW + 8, y: y - 13, size: 8, font, color: COLOR.rose,
    });
  }

  // ═══ BILL FROM / BILL TO (2-col block) ══════════════════════════════
  y -= 56;
  const colHalfW = (PAGE.W - PAGE.marginX * 2 - 24) / 2;

  // Section labels
  drawText({ page, text: t.billFrom.toUpperCase(), x: PAGE.marginX, y, size: 7.5, font: bold, color: COLOR.amberDeep });
  drawText({ page, text: t.billTo.toUpperCase(), x: PAGE.marginX + colHalfW + 24, y, size: 7.5, font: bold, color: COLOR.amberDeep });

  // Bill From — company info
  let fromY = y - 16;
  drawText({ page, text: company.legalEntity, x: PAGE.marginX, y: fromY, size: 11, font: bold });
  fromY -= 13;
  drawText({ page, text: company.name + ' · babahalgo.com', x: PAGE.marginX, y: fromY, size: 9, font, color: COLOR.inkSoft });
  fromY -= 12;
  drawText({ page, text: company.address, x: PAGE.marginX, y: fromY, size: 9, font, color: COLOR.label, maxWidth: colHalfW });
  fromY -= 12;
  drawText({ page, text: company.emailGeneral, x: PAGE.marginX, y: fromY, size: 9, font, color: COLOR.label });

  // Bill To — customer info
  const toX = PAGE.marginX + colHalfW + 24;
  let toY = y - 16;
  drawText({ page, text: input.customer.name, x: toX, y: toY, size: 11, font: bold });
  toY -= 13;
  drawText({ page, text: input.customer.email, x: toX, y: toY, size: 9, font, color: COLOR.inkSoft });
  toY -= 12;
  drawText({ page, text: `Customer ID: ${input.invoiceId.slice(0, 14).toUpperCase()}`, x: toX, y: toY, size: 8, font, color: COLOR.label });

  // ═══ LINE ITEM TABLE ════════════════════════════════════════════════
  y -= 90;
  // Header row (sand background)
  page.drawRectangle({
    x: PAGE.marginX, y: y - 8,
    width: PAGE.W - PAGE.marginX * 2, height: 24,
    color: COLOR.sand,
  });
  drawText({ page, text: t.description.toUpperCase(), x: PAGE.marginX + 10, y: y + 1, size: 8, font: bold, color: COLOR.inkSoft });
  drawTextRight({ page, text: t.qty.toUpperCase(), x: PAGE.W - PAGE.marginX - 180, y: y + 1, size: 8, font: bold, color: COLOR.inkSoft });
  drawTextRight({ page, text: t.unitPrice.toUpperCase(), x: PAGE.W - PAGE.marginX - 80, y: y + 1, size: 8, font: bold, color: COLOR.inkSoft });
  drawTextRight({ page, text: t.amount.toUpperCase(), x: PAGE.W - PAGE.marginX - 10, y: y + 1, size: 8, font: bold, color: COLOR.inkSoft });

  // Item row
  y -= 30;
  const originalAmount = input.originalAmountIdr ?? input.amountIdr;
  drawText({ page, text: input.description, x: PAGE.marginX + 10, y, size: 10, font: bold, maxWidth: PAGE.W - PAGE.marginX * 2 - 220 });
  drawText({
    page, text: `Tier: ${input.tier}`,
    x: PAGE.marginX + 10, y: y - 12, size: 8, font: oblique, color: COLOR.label,
  });
  drawTextRight({ page, text: t.qty1, x: PAGE.W - PAGE.marginX - 180, y, size: 10, font, color: COLOR.inkSoft });
  drawTextRight({ page, text: fmtIdr(originalAmount), x: PAGE.W - PAGE.marginX - 80, y, size: 10, font, color: COLOR.inkSoft });
  drawTextRight({ page, text: fmtIdr(originalAmount), x: PAGE.W - PAGE.marginX - 10, y, size: 10, font: bold });

  // Bottom rule under item
  y -= 22;
  page.drawRectangle({
    x: PAGE.marginX, y, width: PAGE.W - PAGE.marginX * 2, height: 0.6,
    color: COLOR.rule,
  });

  // ═══ TOTALS BREAKDOWN (right-aligned) ═══════════════════════════════
  y -= 18;
  const totalsLabelX = PAGE.W - PAGE.marginX - 240;
  const totalsValueX = PAGE.W - PAGE.marginX - 10;

  // Subtotal
  drawText({ page, text: t.subtotal, x: totalsLabelX, y, size: 10, font, color: COLOR.inkSoft });
  drawTextRight({ page, text: fmtIdr(originalAmount), x: totalsValueX, y, size: 10, font });

  // Discount (if applied)
  if (input.promo && originalAmount > input.amountIdr) {
    y -= 16;
    const discountValue = originalAmount - input.amountIdr;
    const discountLabel = input.promo.discountType === 'PERCENT'
      ? `${t.discount} (${input.promo.discountValue}% · ${input.promo.slug})`
      : `${t.discount} (${input.promo.slug})`;
    drawText({ page, text: discountLabel, x: totalsLabelX, y, size: 10, font, color: COLOR.emerald });
    drawTextRight({ page, text: '− ' + fmtIdr(discountValue), x: totalsValueX, y, size: 10, font, color: COLOR.emerald });
  }

  // Total — emphasized with sand band
  y -= 24;
  page.drawRectangle({
    x: totalsLabelX - 12, y: y - 8,
    width: totalsValueX - totalsLabelX + 22, height: 30,
    color: COLOR.sand,
  });
  drawText({ page, text: t.total.toUpperCase(), x: totalsLabelX, y: y + 4, size: 8, font: bold, color: COLOR.amberDeep });
  drawText({ page, text: fmtIdr(input.amountIdr), x: totalsLabelX, y: y - 9, size: 16, font: bold, color: COLOR.ink });
  drawTextRight({ page, text: t.totalUsd, x: totalsValueX, y: y + 4, size: 7.5, font: bold, color: COLOR.label });
  drawTextRight({ page, text: '≈ ' + fmtUsd(idrToUsd(input.amountIdr)), x: totalsValueX, y: y - 8, size: 11, font: bold, color: COLOR.inkSoft });

  // ═══ PAYMENT METHOD ═════════════════════════════════════════════════
  y -= 46;
  drawText({ page, text: t.paymentMethod.toUpperCase(), x: PAGE.marginX, y, size: 7.5, font: bold, color: COLOR.amberDeep });
  y -= 14;
  const providerLabel = input.provider === 'xendit' ? 'Xendit' : 'Midtrans';
  const methodLabel = input.paymentMethodLabel
    ? `${input.paymentMethodLabel} · via ${providerLabel}`
    : `${providerLabel} (Multi-channel)`;
  drawText({ page, text: methodLabel, x: PAGE.marginX, y, size: 10, font: bold });
  if (isPaid && input.paidAt) {
    drawText({
      page, text: `${locale === 'en' ? 'Settled on' : 'Diselesaikan'} ${fmtDate(input.paidAt, locale)}`,
      x: PAGE.marginX, y: y - 12, size: 8.5, font: oblique, color: COLOR.label,
    });
  }

  // ═══ NOTES & TERMS ══════════════════════════════════════════════════
  y -= 40;
  drawText({ page, text: t.notesTitle.toUpperCase(), x: PAGE.marginX, y, size: 7.5, font: bold, color: COLOR.amberDeep });
  y -= 12;
  page.drawRectangle({
    x: PAGE.marginX, y, width: PAGE.W - PAGE.marginX * 2, height: 0.6, color: COLOR.ruleSoft,
  });
  y -= 12;

  const notes = t.notes.map((n) =>
    n.replace('%SUPPORT%', company.emailSupport)
     .replace('%COMPLIANCE%', company.emailCompliance),
  );
  for (const note of notes) {
    drawText({ page, text: '·', x: PAGE.marginX, y, size: 10, font: bold, color: COLOR.amberDeep });
    drawText({ page, text: note, x: PAGE.marginX + 10, y, size: 9, font, color: COLOR.inkSoft, maxWidth: PAGE.W - PAGE.marginX * 2 - 14 });
    y -= 14;
  }

  // ═══ FOOTER BAND ════════════════════════════════════════════════════
  const footerY = PAGE.marginBottom + 26;
  page.drawRectangle({
    x: PAGE.marginX, y: footerY + 22,
    width: PAGE.W - PAGE.marginX * 2, height: 0.6,
    color: COLOR.rule,
  });
  drawText({
    page, text: t.footerLeft,
    x: PAGE.marginX, y: footerY + 10, size: 7.5, font, color: COLOR.label,
    maxWidth: PAGE.W - PAGE.marginX * 2 - 200,
  });
  drawText({
    page, text: `ID: ${input.invoiceId}  ·  ${t.generated}: ${new Date().toISOString().slice(0, 19)}Z`,
    x: PAGE.marginX, y: footerY - 4, size: 7, font, color: COLOR.label,
  });
  drawTextRight({
    page, text: `${t.page} 1 ${t.of} 1`,
    x: PAGE.W - PAGE.marginX, y: footerY + 10, size: 7.5, font: bold, color: COLOR.inkSoft,
  });
  drawTextRight({
    page, text: `© ${company.foundedYear || new Date().getFullYear()}–${new Date().getFullYear()} ${company.legalEntity}`,
    x: PAGE.W - PAGE.marginX, y: footerY - 4, size: 7, font, color: COLOR.label,
  });

  // ═══ SAVE ═══════════════════════════════════════════════════════════
  const pdfBytes = await pdf.save();
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${input.invoiceId}.pdf`;
  const fullPath = path.join(UPLOAD_DIR, filename);
  await writeFile(fullPath, pdfBytes, { mode: 0o644 });

  const pdfUrl = `/api/uploads/invoices/${filename}`;
  log.info(`Premium invoice PDF generated: id=${input.invoiceId} bytes=${pdfBytes.byteLength} url=${pdfUrl}`);

  return { pdfUrl, filename, sizeBytes: pdfBytes.byteLength };
}
