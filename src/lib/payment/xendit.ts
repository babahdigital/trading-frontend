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
  // E-Wallet Indonesia (inline via /ewallets/charges)
  | 'GOPAY' | 'OVO' | 'DANA' | 'SHOPEEPAY' | 'LINKAJA' | 'ASTRAPAY'
  // E-Wallet Regional (Global Account markets)
  | 'GRABPAY_PH' | 'GRABPAY_MY' | 'GRABPAY_SG'
  | 'GCASH_PH' | 'PAYMAYA_PH' | 'TOUCHNGO_MY'
  // Retail outlets
  | 'ALFAMART' | 'INDOMARET';

/** Xendit /ewallets/charges canonical channel_code per region. */
const EWALLET_CHANNEL_CODE: Partial<Record<XenditPaymentMethod, string>> = {
  GOPAY: 'ID_GOPAY',
  OVO: 'ID_OVO',
  DANA: 'ID_DANA',
  SHOPEEPAY: 'ID_SHOPEEPAY',
  LINKAJA: 'ID_LINKAJA',
  ASTRAPAY: 'ID_ASTRAPAY',
  GRABPAY_PH: 'PH_GRABPAY',
  GRABPAY_MY: 'MY_GRABPAY',
  GRABPAY_SG: 'SG_GRABPAY',
  GCASH_PH: 'PH_GCASH',
  PAYMAYA_PH: 'PH_PAYMAYA',
  TOUCHNGO_MY: 'MY_TOUCHNGO',
};

/** Currency per e-wallet (Global Account multi-currency). */
const EWALLET_CURRENCY: Partial<Record<XenditPaymentMethod, string>> = {
  GOPAY: 'IDR', OVO: 'IDR', DANA: 'IDR', SHOPEEPAY: 'IDR',
  LINKAJA: 'IDR', ASTRAPAY: 'IDR',
  GRABPAY_PH: 'PHP', GCASH_PH: 'PHP', PAYMAYA_PH: 'PHP',
  GRABPAY_MY: 'MYR', TOUCHNGO_MY: 'MYR',
  GRABPAY_SG: 'SGD',
};

/** Supported settlement currencies untuk Card via Global Account.
 *  Per Xendit docs: IDR, USD, SGD, MYR, PHP, THB, VND, HKD. */
export const SUPPORTED_CURRENCIES = ['IDR', 'USD', 'SGD', 'MYR', 'PHP', 'THB', 'HKD'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

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

// ════════════════════════════════════════════════════════════════════
// Payment Methods API v2 (inline checkout — 2026-05-22)
// ════════════════════════════════════════════════════════════════════
// Pak Abdullah audit 2026-05-22: upgrade dari Invoice API (hosted page)
// ke Payment Methods API v2 untuk true Stripe-like inline UX.
//
// Flow:
//   - Card: client tokenize via Xendit.js → server create payment_method
//           pakai card_id → create payment_request → 3DS modal kalau perlu
//   - QRIS: server create payment_request type=QR_CODE → render qr_string
//           di domain kita → polling status
//   - VA:   server create payment_request type=VIRTUAL_ACCOUNT → display
//           account_number+bank di domain kita → polling status
//   - E-wallet: defer ke phase 2 (deep-link popup window)
//
// Common return shape (XenditPaymentInstrument) supaya FE component bisa
// switch render berdasar method tanpa special-case server logic.

export interface XenditPaymentInstrument {
  /** payment_request_id dari Xendit */
  id: string;
  /** Status canonical: PENDING | SUCCEEDED | FAILED | EXPIRED | REQUIRES_ACTION */
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED' | 'REQUIRES_ACTION';
  /** Method kanonik */
  method: XenditPaymentMethod;
  /** QR string (untuk QRIS) — encode jadi PNG di FE */
  qrString?: string;
  /** Account number (untuk VA) */
  accountNumber?: string;
  /** Bank code/display name (untuk VA) */
  bankCode?: string;
  /** 3DS / e-wallet redirect/action URL (mobile_web_checkout_url etc) */
  actionUrl?: string;
  /** Mobile deep-link URL (untuk e-wallet apps — gojek://, dana://, dst) */
  deeplinkUrl?: string;
  /** Reference ke external_id kita (order ID) */
  externalId: string;
  /** Expiry timestamp (ISO) — biasanya 24 jam */
  expiresAt?: string;
  /** Raw amount IDR (echo back untuk verification) */
  amountIdr: number;
  /** Charge currency (USD/IDR/SGD/MYR for multi-currency Card + native for e-wallet) */
  currency?: string;
  /** Actual charge amount in charge currency (untuk e-wallet non-IDR) */
  chargeAmount?: number;
}

interface CreateChargeBase {
  externalId: string;
  amountIdr: number;
  customerName: string;
  customerEmail: string;
  description: string;
}

interface CreateQrisCharge extends CreateChargeBase {
  method: 'QRIS';
}

interface CreateVaCharge extends CreateChargeBase {
  method: 'BCA' | 'BNI' | 'BSI' | 'BRI' | 'MANDIRI' | 'PERMATA';
}

interface CreateCardCharge extends CreateChargeBase {
  method: 'CREDIT_CARD';
  /** Token ID dari Xendit.js tokenization */
  tokenId: string;
  /** Auth ID (jika 3DS challenged successfully) */
  authenticationId?: string;
  /** Multi-currency support (Global Account) — default IDR.
   *  Bila non-IDR, amount dianggap sudah dalam currency tersebut. */
  currency?: SupportedCurrency;
  /** Amount dalam target currency (overrides amountIdr untuk non-IDR). */
  amountInCurrency?: number;
}

interface CreateEwalletCharge extends CreateChargeBase {
  method: 'GOPAY' | 'OVO' | 'DANA' | 'SHOPEEPAY' | 'LINKAJA' | 'ASTRAPAY'
    | 'GRABPAY_PH' | 'GRABPAY_MY' | 'GRABPAY_SG'
    | 'GCASH_PH' | 'PAYMAYA_PH' | 'TOUCHNGO_MY';
  /** Amount dalam native currency e-wallet (PHP/MYR/SGD/IDR). Default = amountIdr. */
  amountInCurrency?: number;
  /** E.164 phone number — required untuk OVO, LinkAja, GCash, Maya, TouchNGo.
   *  Other wallets (GoPay, DANA, ShopeePay, AstraPay, GrabPay) tidak butuh
   *  karena redirect-based flow. */
  mobileNumber?: string;
}

/** E-wallet channels yang butuh mobile_number di channel_properties. */
const EWALLET_REQUIRES_PHONE = new Set([
  'OVO', 'LINKAJA', 'GCASH_PH', 'PAYMAYA_PH', 'TOUCHNGO_MY',
]);

type CreateChargeParams = CreateQrisCharge | CreateVaCharge | CreateCardCharge | CreateEwalletCharge;

/** Auth header utility — Basic dari secret key. */
function authHeader(): string {
  const secretKey = process.env.XENDIT_SECRET_KEY;
  if (!secretKey) throw new Error('XENDIT_SECRET_KEY not configured');
  return 'Basic ' + Buffer.from(secretKey + ':').toString('base64');
}

/** Xendit fetch dengan retry untuk DNS transient (sama pattern Invoice API).
 *  Note: api-version is per-endpoint — caller passes via init.headers.
 *  Tidak ada single global default karena each Xendit API has different
 *  version requirement (QR Code = 2022-07-31, Cards = 2020-04-01, dst). */
async function xenditFetch(url: string, init: RequestInit & { idempotencyKey?: string }): Promise<Response> {
  const maxAttempts = 3;
  let lastErr: unknown;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: authHeader(),
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.idempotencyKey) headers['Idempotency-key'] = init.idempotencyKey;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetch(url, {
        ...init,
        headers,
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const transient = msg.includes('EAI_AGAIN') || msg.includes('ENOTFOUND')
        || msg.includes('ECONNRESET') || msg.includes('fetch failed');
      if (!transient || attempt === maxAttempts) throw err;
      log.warn(`Xendit fetch attempt ${attempt} (${url}) failed: ${msg}`);
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  throw lastErr;
}

/** Normalize Xendit status string ke canonical enum. */
function normalizeStatus(s: string): XenditPaymentInstrument['status'] {
  const upper = s.toUpperCase();
  if (upper === 'SUCCEEDED' || upper === 'PAID' || upper === 'SETTLED' || upper === 'COMPLETED') return 'SUCCEEDED';
  if (upper === 'FAILED' || upper === 'DENIED' || upper === 'DECLINED') return 'FAILED';
  if (upper === 'EXPIRED') return 'EXPIRED';
  if (upper === 'REQUIRES_ACTION' || upper === 'AWAITING_CAPTURE' || upper === 'AUTHORIZED') return 'REQUIRES_ACTION';
  return 'PENDING';
}

/**
 * Create QRIS payment via Xendit QR Code API v1 (api-version 2022-07-31).
 *
 * Customer scan QR pakai any Indonesian e-wallet/mobile banking yang
 * support QRIS standard (GoPay, OVO, DANA, ShopeePay, BCA Mobile,
 * Mandiri Livin, LinkAja, dst — universal Indonesian standard).
 *
 * Payload shape per Xendit v1 docs:
 *   external_id (required), type=DYNAMIC|STATIC, callback_url (required),
 *   amount, currency=IDR. DYNAMIC = amount baked in, customer can't change.
 */
export async function createXenditQrisCharge(params: CreateQrisCharge): Promise<XenditPaymentInstrument> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://babahalgo.com';
  // QRIS expiry minimum 1 menit, max 24 jam. Default 30 menit.
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  // Xendit QR Code v2 API (api-version 2022-07-31) — shape canonical:
  //   reference_id (NOT external_id), type=DYNAMIC, currency, amount, expires_at
  const payload = {
    reference_id: params.externalId,
    type: 'DYNAMIC',
    currency: 'IDR',
    amount: params.amountIdr,
    expires_at: expiresAt,
  };

  const res = await xenditFetch('https://api.xendit.co/qr_codes', {
    method: 'POST',
    headers: {
      'api-version': '2022-07-31',
      // Per-request callback URL (alternative ke dashboard setting)
      'x-callback-url': `${appUrl}/api/billing/webhook/xendit`,
    },
    body: JSON.stringify(payload),
    idempotencyKey: `qris_${params.externalId}`,
  });

  if (!res.ok) {
    const body = await res.text();
    log.error(`Xendit QRIS create error: ${body}`);
    throw new Error(`Xendit QRIS API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as {
    id: string; reference_id?: string; external_id?: string;
    qr_string: string; status: string; expires_at?: string; type?: string;
  };
  return {
    id: data.id,
    status: normalizeStatus(data.status),
    method: 'QRIS',
    qrString: data.qr_string,
    externalId: data.reference_id ?? data.external_id ?? params.externalId,
    expiresAt: data.expires_at ?? expiresAt,
    amountIdr: params.amountIdr,
  };
}

/**
 * Create Virtual Account payment — customer transfer ke nomor VA yang
 * dihasilkan, kita display nomor + bank instructions di FE.
 *
 * Bank channel codes per Xendit canonical:
 *   BCA, BNI, BRI, MANDIRI, BSI, PERMATA
 */
export async function createXenditVaCharge(params: CreateVaCharge): Promise<XenditPaymentInstrument> {
  // Customer name sanitization — Xendit VA requires ASCII-only name (max 40)
  const safeName = params.customerName.replace(/[^\x20-\x7E]/g, '').slice(0, 40) || 'Customer';

  const payload = {
    external_id: params.externalId,
    bank_code: params.method,
    name: safeName,
    expected_amount: params.amountIdr,
    is_closed: true,
    is_single_use: true,
    expiration_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  const res = await xenditFetch('https://api.xendit.co/callback_virtual_accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
    idempotencyKey: `va_${params.method}_${params.externalId}`,
  });

  if (!res.ok) {
    const body = await res.text();
    log.error(`Xendit VA create error: ${body}`);
    throw new Error(`Xendit VA API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as {
    id: string; external_id: string; account_number: string;
    bank_code: string; status: string; expiration_date: string;
  };
  return {
    id: data.id,
    status: normalizeStatus(data.status),
    method: params.method,
    accountNumber: data.account_number,
    bankCode: data.bank_code,
    externalId: data.external_id,
    expiresAt: data.expiration_date,
    amountIdr: params.amountIdr,
  };
}

/**
 * Create Card charge — pakai card_token dari Xendit.js client tokenization.
 *
 * Flow: FE tokenize CC pakai Xendit.js v2 → kirim token_id ke kita →
 * kita create charge → kalau require_authentication, Xendit return
 * REQUIRES_ACTION dengan authentication_url → FE buka iframe modal 3DS
 * → setelah customer complete, retry charge dengan authentication_id.
 */
export async function createXenditCardCharge(params: CreateCardCharge): Promise<XenditPaymentInstrument> {
  const currency = params.currency ?? 'IDR';
  const chargeAmount = params.amountInCurrency ?? params.amountIdr;

  const payload: Record<string, unknown> = {
    token_id: params.tokenId,
    external_id: params.externalId,
    amount: chargeAmount,
    currency,
    capture: true,
    descriptor: 'BabahAlgo',
    metadata: { externalId: params.externalId, customerEmail: params.customerEmail },
  };
  if (params.authenticationId) payload.authentication_id = params.authenticationId;

  const res = await xenditFetch('https://api.xendit.co/credit_card_charges', {
    method: 'POST',
    body: JSON.stringify(payload),
    idempotencyKey: `card_${params.externalId}`,
  });

  if (!res.ok) {
    const body = await res.text();
    log.error(`Xendit Card charge error: ${body}`);
    throw new Error(`Xendit Card API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as {
    id: string; status: string; external_id: string;
    redirect_url?: string;
    authentication_url?: string;
    failure_reason?: string;
  };
  return {
    id: data.id,
    status: normalizeStatus(data.status),
    method: 'CREDIT_CARD',
    actionUrl: data.authentication_url ?? data.redirect_url,
    externalId: data.external_id,
    amountIdr: params.amountIdr,
    currency,
    chargeAmount,
  };
}

/**
 * Create E-Wallet charge via Xendit /ewallets/charges API v2.
 *
 * Supported: GoPay, OVO, DANA, ShopeePay, LinkAja, AstraPay (ID),
 * GrabPay/GCash/Maya (PH), GrabPay/TouchNGo (MY), GrabPay (SG).
 *
 * Customer flow:
 *   1. Server create charge → returns actions.mobile_web_checkout_url
 *      (desktop_web_checkout_url + mobile_deeplink_url)
 *   2. FE opens checkout URL di small popup window (window.open)
 *   3. Customer authorize di e-wallet (push notif ke app, or web login)
 *   4. Webhook ewallet.capture event → invoice PAID
 *   5. FE poll + close popup + redirect ke success
 */
export async function createXenditEwalletCharge(params: CreateEwalletCharge): Promise<XenditPaymentInstrument> {
  const channelCode = EWALLET_CHANNEL_CODE[params.method];
  const currency = EWALLET_CURRENCY[params.method] ?? 'IDR';
  if (!channelCode) throw new Error(`Unsupported e-wallet method: ${params.method}`);

  const chargeAmount = params.amountInCurrency ?? params.amountIdr;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://babahalgo.com';

  // Channel-properties bervariasi per wallet:
  //   - Pull (OVO/LinkAja/GCash/Maya/TouchNGo): butuh mobile_number E.164
  //   - Redirect (GoPay/DANA/ShopeePay/AstraPay/GrabPay): pakai redirect URLs
  const needsPhone = EWALLET_REQUIRES_PHONE.has(params.method);
  if (needsPhone && !params.mobileNumber) {
    throw new Error(`Mobile number required for ${params.method}`);
  }

  const channelProperties: Record<string, unknown> = needsPhone
    ? { mobile_number: params.mobileNumber }
    : {
        success_redirect_url: `${appUrl}/portal/billing/success?order_id=${encodeURIComponent(params.externalId)}`,
        failure_redirect_url: `${appUrl}/portal/billing/failure?order_id=${encodeURIComponent(params.externalId)}`,
      };

  const payload = {
    reference_id: params.externalId,
    currency,
    amount: chargeAmount,
    checkout_method: 'ONE_TIME_PAYMENT',
    channel_code: channelCode,
    channel_properties: channelProperties,
    customer: {
      given_names: params.customerName.split(' ')[0] ?? params.customerName,
      surname: params.customerName.split(' ').slice(1).join(' ') || params.customerName,
      email: params.customerEmail,
    },
    metadata: { externalId: params.externalId, description: params.description },
  };

  const res = await xenditFetch('https://api.xendit.co/ewallets/charges', {
    method: 'POST',
    headers: {
      'api-version': '2024-11-11',
      // Per-request callback URL — dipakai kalau dashboard global setting
      // belum di-config. Webhook tetap masuk ke /api/billing/webhook/xendit.
      'x-callback-url': `${appUrl}/api/billing/webhook/xendit`,
    },
    body: JSON.stringify(payload),
    idempotencyKey: `ewallet_${params.method}_${params.externalId}`,
  });

  if (!res.ok) {
    const body = await res.text();
    log.error(`Xendit E-Wallet charge error: ${body}`);
    throw new Error(`Xendit E-Wallet API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as {
    id: string; status: string; reference_id: string;
    currency: string; charge_amount: number;
    actions?: {
      desktop_web_checkout_url?: string;
      mobile_web_checkout_url?: string;
      mobile_deeplink_checkout_url?: string;
    };
  };

  return {
    id: data.id,
    status: normalizeStatus(data.status),
    method: params.method,
    // Prefer mobile_web (works on both desktop browser + mobile fallback)
    actionUrl: data.actions?.mobile_web_checkout_url
            ?? data.actions?.desktop_web_checkout_url,
    deeplinkUrl: data.actions?.mobile_deeplink_checkout_url,
    externalId: data.reference_id,
    amountIdr: params.amountIdr,
    currency: data.currency,
    chargeAmount: data.charge_amount,
  };
}

/** All e-wallet methods that route to /ewallets/charges */
const EWALLET_METHODS = new Set<XenditPaymentMethod>([
  'GOPAY', 'OVO', 'DANA', 'SHOPEEPAY', 'LINKAJA', 'ASTRAPAY',
  'GRABPAY_PH', 'GRABPAY_MY', 'GRABPAY_SG',
  'GCASH_PH', 'PAYMAYA_PH', 'TOUCHNGO_MY',
]);

/** Unified entrypoint — dispatch ke API spesifik per method. */
export async function createXenditCharge(params: CreateChargeParams): Promise<XenditPaymentInstrument> {
  if (params.method === 'QRIS') return createXenditQrisCharge(params);
  if (params.method === 'CREDIT_CARD') return createXenditCardCharge(params);
  if (EWALLET_METHODS.has(params.method)) return createXenditEwalletCharge(params as CreateEwalletCharge);
  return createXenditVaCharge(params as CreateVaCharge);
}

/**
 * Poll payment status by ID. Dipakai oleh FE polling loop untuk QRIS/VA
 * dan oleh /api/billing/poll-status endpoint.
 *
 * Note: untuk QRIS pakai `/qr_codes/:id`, VA pakai `/callback_virtual_accounts/:id`,
 * Card pakai `/credit_card_charges/:id`. We accept method param untuk
 * route ke endpoint yang tepat.
 */
export async function getXenditChargeStatus(
  method: XenditPaymentMethod,
  chargeId: string,
): Promise<XenditPaymentInstrument['status']> {
  let url: string;
  let extraHeaders: Record<string, string> = {};

  if (method === 'QRIS') {
    url = `https://api.xendit.co/qr_codes/${encodeURIComponent(chargeId)}`;
    extraHeaders = { 'api-version': '2022-07-31' };
  } else if (method === 'CREDIT_CARD') {
    url = `https://api.xendit.co/credit_card_charges/${encodeURIComponent(chargeId)}`;
  } else if (EWALLET_METHODS.has(method)) {
    url = `https://api.xendit.co/ewallets/charges/${encodeURIComponent(chargeId)}`;
    extraHeaders = { 'api-version': '2024-11-11' };
  } else {
    url = `https://api.xendit.co/callback_virtual_accounts/${encodeURIComponent(chargeId)}`;
  }

  const res = await xenditFetch(url, { method: 'GET', headers: extraHeaders });
  if (!res.ok) {
    // VA `is_closed=true` doesn't expose status easily — fall back ke PENDING
    return 'PENDING';
  }
  const data = await res.json() as { status?: string };
  return data.status ? normalizeStatus(data.status) : 'PENDING';
}
