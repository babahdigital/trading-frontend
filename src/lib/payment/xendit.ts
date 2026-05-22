import { createLogger } from '@/lib/logger';

const log = createLogger('xendit');

/**
 * Xendit Invoice canonical payment method codes. Subset yang kita expose
 * lewat inline method picker. Bila customer pilih satu, Xendit hosted
 * page langsung skip method-picker dan render form spesifik (Stripe-like
 * feel: choose method on our domain, gateway only handles secure form).
 */
export type XenditPaymentMethod =
  // Cards
  | 'CREDIT_CARD'
  // QR
  | 'QRIS'
  // Bank Virtual Account
  | 'BCA' | 'BNI' | 'BSI' | 'BRI' | 'MANDIRI' | 'PERMATA'
  // E-Wallet
  | 'OVO' | 'DANA' | 'SHOPEEPAY' | 'LINKAJA'
  // Retail outlets
  | 'ALFAMART' | 'INDOMARET';

interface CreateInvoiceParams {
  externalId: string;
  amountIdr: number;
  customerName: string;
  customerEmail: string;
  description: string;
  successRedirectUrl?: string;
  /** Locale-aware payment channel filter (Pak Abdullah 2026-05-21):
   *  - 'en': hanya Credit Card (international customer)
   *  - 'id': full Indonesian channels (VA bank + e-wallet + QRIS + CC)
   *  Kalau tidak di-set, fallback ke full default (backward-compat). */
  locale?: 'id' | 'en';
  /** Inline checkout (2026-05-22): kalau provided, override locale filter
   *  dan kunci ke single method. Xendit hosted page langsung render form
   *  spesifik tanpa method-picker layer. */
  paymentMethod?: XenditPaymentMethod;
}

const PAYMENT_METHODS_ID = [
  // Bank Virtual Account
  'BCA', 'BNI', 'BSI', 'BRI', 'MANDIRI', 'PERMATA',
  // Retail outlets
  'ALFAMART', 'INDOMARET',
  // E-Wallet
  'OVO', 'DANA', 'SHOPEEPAY', 'LINKAJA',
  // QR + Card
  'QRIS', 'CREDIT_CARD',
];

const PAYMENT_METHODS_EN = [
  // International customer → Credit Card only
  'CREDIT_CARD',
];

interface XenditInvoiceResponse {
  id: string;
  external_id: string;
  status: string;
  amount: number;
  invoice_url: string;
  expiry_date: string;
}

export async function createXenditInvoice(params: CreateInvoiceParams) {
  const secretKey = process.env.XENDIT_SECRET_KEY;
  if (!secretKey) throw new Error('XENDIT_SECRET_KEY not configured');

  const auth = Buffer.from(secretKey + ':').toString('base64');

  const payload = {
    external_id: params.externalId,
    amount: params.amountIdr,
    payer_email: params.customerEmail,
    description: params.description,
    success_redirect_url:
      params.successRedirectUrl ??
      `${process.env.NEXT_PUBLIC_APP_URL}/portal/billing/success?order_id=${params.externalId}`,
    failure_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/billing/failure?order_id=${params.externalId}`,
    currency: 'IDR',
    invoice_duration: 86400, // 24 hours
    customer: {
      given_names: params.customerName,
      email: params.customerEmail,
    },
    payment_methods: params.paymentMethod
      ? [params.paymentMethod]
      : (params.locale === 'en' ? PAYMENT_METHODS_EN : PAYMENT_METHODS_ID),
    // Force Xendit page bahasa sesuai locale customer
    locale: params.locale === 'en' ? 'en' : 'id',
  };

  // DNS retry — VPS3 container kadang hit EAI_AGAIN intermittent ke
  // api.xendit.co (Cloudflare-fronted, DNS occasionally hiccup). Retry 2x
  // dengan exponential backoff 500ms→1500ms supaya checkout tidak 500
  // karena masalah jaringan transient.
  async function xenditFetchWithRetry(): Promise<Response> {
    const maxAttempts = 3;
    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fetch('https://api.xendit.co/v2/invoices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15_000),
        });
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        const isTransient = msg.includes('EAI_AGAIN')
          || msg.includes('ENOTFOUND')
          || msg.includes('ECONNRESET')
          || msg.includes('fetch failed');
        if (!isTransient || attempt === maxAttempts) throw err;
        log.warn(`Xendit fetch attempt ${attempt} failed (${msg}); retrying...`);
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
    throw lastErr;
  }

  const response = await xenditFetchWithRetry();

  if (!response.ok) {
    const body = await response.text();
    log.error(`Xendit Invoice error: ${body}`);
    throw new Error(`Xendit API ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as XenditInvoiceResponse;
  return {
    invoiceId: data.id,
    invoiceUrl: data.invoice_url,
    externalId: data.external_id,
    expiryDate: data.expiry_date,
  };
}

/** Verify Xendit webhook callback token */
export function verifyXenditWebhook(
  xCallbackToken: string,
): boolean {
  const webhookToken = process.env.XENDIT_WEBHOOK_TOKEN;
  if (!webhookToken) return false;
  return xCallbackToken === webhookToken;
}
