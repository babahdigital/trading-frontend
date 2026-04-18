import { createLogger } from '@/lib/logger';

const log = createLogger('midtrans');

interface CreateTransactionParams {
  orderId: string;
  amountIdr: number;
  customerName: string;
  customerEmail: string;
  itemDescription: string;
}

interface SnapResponse {
  token: string;
  redirect_url: string;
}

export async function createMidtransTransaction(params: CreateTransactionParams) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) throw new Error('MIDTRANS_SERVER_KEY not configured');

  const isProduction = process.env.NODE_ENV === 'production';
  const baseUrl = isProduction
    ? 'https://app.midtrans.com'
    : 'https://app.sandbox.midtrans.com';

  const payload = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.amountIdr,
    },
    credit_card: { secure: true },
    customer_details: {
      first_name: params.customerName,
      email: params.customerEmail,
    },
    item_details: [
      {
        id: 'SUB-' + params.orderId,
        name: params.itemDescription,
        price: params.amountIdr,
        quantity: 1,
      },
    ],
    callbacks: {
      finish: `${process.env.NEXT_PUBLIC_APP_URL}/portal/billing/success?order_id=${params.orderId}`,
    },
    expiry: {
      unit: 'hour',
      duration: 24,
    },
  };

  const auth = Buffer.from(serverKey + ':').toString('base64');
  const response = await fetch(`${baseUrl}/snap/v1/transactions`, {
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
    log.error(`Midtrans Snap error: ${body}`);
    throw new Error(`Midtrans API ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as SnapResponse;
  return {
    token: data.token,
    redirectUrl: data.redirect_url,
  };
}
