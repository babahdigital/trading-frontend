import { createLogger } from '@/lib/logger';

const log = createLogger('xendit');

interface CreateInvoiceParams {
  externalId: string;
  amountIdr: number;
  customerName: string;
  customerEmail: string;
  description: string;
  successRedirectUrl?: string;
}

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
    failure_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/billing?status=failed`,
    currency: 'IDR',
    invoice_duration: 86400, // 24 hours
    customer: {
      given_names: params.customerName,
      email: params.customerEmail,
    },
    payment_methods: [
      'BCA',
      'BNI',
      'BSI',
      'BRI',
      'MANDIRI',
      'PERMATA',
      'ALFAMART',
      'INDOMARET',
      'OVO',
      'DANA',
      'SHOPEEPAY',
      'LINKAJA',
      'QRIS',
      'CREDIT_CARD',
    ],
  };

  const response = await fetch('https://api.xendit.co/v2/invoices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

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
