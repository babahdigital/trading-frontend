/**
 * Payment-method brand colors — single source of truth.
 *
 * These are EXTERNAL brand IPs (e-wallets, banks) whose official hex values
 * must be reproduced faithfully, so they live as named constants rather than
 * design tokens. Previously these maps were duplicated inline across the
 * checkout display components; centralizing them here means a brand-color
 * update (or adding a channel) happens in exactly one place.
 *
 * Used by: components/checkout/ewallet-display.tsx, va-display.tsx.
 */

export interface WalletBrand {
  name: string;
  color: string;
  logo: string;
  country: string;
}

/** Xendit e-wallet channels (ID/PH/MY/SG). */
export const WALLET_INFO: Record<string, WalletBrand> = {
  GOPAY: { name: 'GoPay', color: '#00AED6', logo: 'G', country: 'ID' },
  OVO: { name: 'OVO', color: '#4C2A86', logo: 'O', country: 'ID' },
  DANA: { name: 'DANA', color: '#118EEA', logo: 'D', country: 'ID' },
  SHOPEEPAY: { name: 'ShopeePay', color: '#EE4D2D', logo: 'S', country: 'ID' },
  LINKAJA: { name: 'LinkAja', color: '#E32024', logo: 'L', country: 'ID' },
  ASTRAPAY: { name: 'AstraPay', color: '#00529C', logo: 'A', country: 'ID' },
  GRABPAY_PH: { name: 'GrabPay', color: '#00B14F', logo: 'G', country: 'PH' },
  GRABPAY_MY: { name: 'GrabPay', color: '#00B14F', logo: 'G', country: 'MY' },
  GRABPAY_SG: { name: 'GrabPay', color: '#00B14F', logo: 'G', country: 'SG' },
  GCASH_PH: { name: 'GCash', color: '#007DFF', logo: 'G', country: 'PH' },
  PAYMAYA_PH: { name: 'Maya', color: '#7BD234', logo: 'M', country: 'PH' },
  TOUCHNGO_MY: { name: "Touch 'n Go", color: '#E32024', logo: 'T', country: 'MY' },
};

/** Neutral fallback when a wallet channel is unknown. */
export const WALLET_FALLBACK: WalletBrand = { name: '', color: '#475569', logo: 'E', country: 'ID' };

export interface BankBrand {
  name: string;
  color: string;
  logoLetter: string;
}

/** Virtual-account bank brands (Xendit VA channels). */
export const BANK_INFO: Record<string, BankBrand> = {
  BCA: { name: 'Bank Central Asia (BCA)', color: '#0060AF', logoLetter: 'B' },
  BNI: { name: 'Bank Negara Indonesia', color: '#F36F21', logoLetter: 'N' },
  BRI: { name: 'Bank Rakyat Indonesia', color: '#003D7E', logoLetter: 'R' },
  MANDIRI: { name: 'Bank Mandiri', color: '#003366', logoLetter: 'M' },
  BSI: { name: 'Bank Syariah Indonesia', color: '#00529C', logoLetter: 'S' },
  PERMATA: { name: 'Bank Permata', color: '#005FAA', logoLetter: 'P' },
};
