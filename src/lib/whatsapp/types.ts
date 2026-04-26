/**
 * Shared types for the WhatsApp notification feature.
 *
 * Two backends own WA delivery:
 *   - Forex (VPS1) — `/api/forex/tenant/whatsapp` GET/PATCH live.
 *   - Crypto       — endpoint pending; FE gracefully degrades to 503.
 *
 * The frontend only owns the preferences UI + history viewer + OTP
 * verification scaffold. It never sends WA messages directly to the
 * customer in production traffic.
 */

export type WaProduct = 'forex' | 'crypto';

export type WaProvider = 'fonnte' | 'twilio' | 'disabled';

export interface WhatsappConfig {
  /** Commercial add-on flag — admin must enable per tenant before delivery. */
  addonActive: boolean;
  /** User toggle — falsey means no messages will be queued even if addon active. */
  enabled: boolean;
  /** E.164 string or `<group_id>@g.us` for routing alerts (signal, kill-switch). */
  alertsTarget: string | null;
  /** Operations alerts (deploy notice, status pause). */
  opsTarget: string | null;
  /** Daily digest. Optional; null disables digest. */
  digestTarget: string | null;
  /** Default ITU country code (no `+`). Phase 1: always "62". */
  countryCode: string;
  /** Backend-resolved provider — surface for transparency, not for branching FE logic. */
  provider: WaProvider;
}

export interface WhatsappConfigPatch {
  enabled?: boolean;
  alertsTarget?: string | null;
  opsTarget?: string | null;
  digestTarget?: string | null;
  countryCode?: string;
}

export interface ValidateNumberResult {
  registered: boolean;
  reason?: string;
}

export interface OtpRequestResult {
  /** Verification handle. Required to confirm the OTP. */
  verificationId: string;
  /** ISO timestamp for client countdown. */
  expiresAt: string;
  /** Provider used to send the OTP — null when delivery declined (rate limit, etc.). */
  via: 'backend' | 'fonnte_direct' | null;
}

export interface OtpConfirmResult {
  verified: boolean;
  /** Echo of the new config after the verified target was saved. */
  config: WhatsappConfig | null;
}

export class WhatsappAdapterError extends Error {
  constructor(public status: number, message: string, public detail?: unknown) {
    super(message);
    this.name = 'WhatsappAdapterError';
  }
}
