'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Loader2, Lock, MessageSquare, ShieldCheck, ShieldX } from 'lucide-react';
import { CryptoNotificationsSection } from './crypto-notifications-section';
import {
  confirmWhatsappOtp,
  getWhatsappConfig,
  patchWhatsappConfig,
  requestWhatsappOtp,
  validateWhatsappNumber,
  type WaProduct,
  type WhatsappConfig,
  WhatsappAdapterError,
} from '@/lib/whatsapp/client';
import { formatWhatsappDisplay, isValidWhatsappTarget, maskWhatsappNumber, toE164 } from '@/lib/whatsapp/format';

type RoutingKey = 'alerts' | 'ops' | 'digest';

const ROUTING_KEYS: RoutingKey[] = ['alerts', 'ops', 'digest'];

type VerifyState =
  | { phase: 'idle' }
  | { phase: 'validating' }
  | { phase: 'validated'; e164: string }
  | { phase: 'sending_otp'; e164: string }
  | { phase: 'awaiting_otp'; e164: string; verificationId: string; expiresAt: string; via: string | null }
  | { phase: 'confirming'; e164: string; verificationId: string; otp: string }
  | { phase: 'verified'; e164: string }
  | { phase: 'error'; message: string };

interface ProductPanelProps {
  product: WaProduct;
}

function ProductPanel({ product }: ProductPanelProps) {
  const t = useTranslations('portal.whatsapp_section');
  const [config, setConfig] = useState<WhatsappConfig | null>(null);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'unavailable' | 'forbidden' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  const [draftCountryCode, setDraftCountryCode] = useState('62');
  const [draftNumber, setDraftNumber] = useState('');
  const [routingFor, setRoutingFor] = useState<RoutingKey>('alerts');
  const [verify, setVerify] = useState<VerifyState>({ phase: 'idle' });
  const [otpInput, setOtpInput] = useState('');

  const routingLabel = useCallback((key: RoutingKey): string => {
    if (key === 'alerts') return t('routing_alerts_label');
    if (key === 'ops') return t('routing_ops_label');
    return t('routing_digest_label');
  }, [t]);

  const routingHint = useCallback((key: RoutingKey): string => {
    if (key === 'alerts') return t('routing_alerts_hint');
    if (key === 'ops') return t('routing_ops_hint');
    return t('routing_digest_hint');
  }, [t]);

  const routingLower = useCallback((key: RoutingKey): string => {
    if (key === 'alerts') return t('routing_alerts_lower');
    if (key === 'ops') return t('routing_ops_lower');
    return t('routing_digest_lower');
  }, [t]);

  const refresh = useCallback(async () => {
    setLoadStatus('loading');
    setErrorMessage('');
    try {
      const c = await getWhatsappConfig(product);
      setConfig(c);
      setDraftCountryCode(c.countryCode || '62');
      setLoadStatus('ready');
    } catch (err) {
      if (err instanceof WhatsappAdapterError) {
        if (err.status === 503) {
          setLoadStatus('unavailable');
          setErrorMessage(
            product === 'crypto'
              ? t('unavailable_crypto')
              : t('unavailable_forex'),
          );
          return;
        }
        if (err.status === 403) {
          setLoadStatus('forbidden');
          setErrorMessage(t('forbidden'));
          return;
        }
        setLoadStatus('error');
        setErrorMessage(err.message);
        return;
      }
      setLoadStatus('error');
      setErrorMessage(t('load_failed'));
    }
  }, [product, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const canConfigure = loadStatus === 'ready' && config !== null;

  const submitToggle = useCallback(async (enabled: boolean) => {
    if (!config) return;
    setSaving(true);
    setSavedMessage('');
    try {
      const next = await patchWhatsappConfig(product, { enabled });
      setConfig(next);
      setSavedMessage(t('saved'));
    } catch (err) {
      setSavedMessage(err instanceof WhatsappAdapterError ? err.message : t('save_failed'));
    } finally {
      setSaving(false);
    }
  }, [config, product, t]);

  const submitClearTarget = useCallback(async (key: RoutingKey) => {
    if (!config) return;
    setSaving(true);
    setSavedMessage('');
    try {
      const patchKey = key === 'alerts' ? 'alertsTarget' : key === 'ops' ? 'opsTarget' : 'digestTarget';
      const next = await patchWhatsappConfig(product, { [patchKey]: null });
      setConfig(next);
      setSavedMessage(t('target_cleared'));
    } catch (err) {
      setSavedMessage(err instanceof WhatsappAdapterError ? err.message : t('save_failed'));
    } finally {
      setSaving(false);
    }
  }, [config, product, t]);

  const handleValidate = useCallback(async () => {
    setVerify({ phase: 'validating' });
    const e164 = toE164(draftNumber, draftCountryCode);
    if (!e164) {
      setVerify({ phase: 'error', message: t('invalid_number') });
      return;
    }
    try {
      const result = await validateWhatsappNumber(e164);
      if (!result.registered) {
        setVerify({
          phase: 'error',
          message: result.reason
            ? t('not_registered_with_reason', { number: formatWhatsappDisplay(e164), reason: result.reason })
            : t('not_registered', { number: formatWhatsappDisplay(e164) }),
        });
        return;
      }
      setVerify({ phase: 'validated', e164 });
    } catch (err) {
      const detail = err instanceof WhatsappAdapterError ? err.message : t('validate_failed');
      setVerify({ phase: 'error', message: detail });
    }
  }, [draftCountryCode, draftNumber, t]);

  const handleRequestOtp = useCallback(async () => {
    if (verify.phase !== 'validated') return;
    setVerify({ phase: 'sending_otp', e164: verify.e164 });
    try {
      const result = await requestWhatsappOtp(product, verify.e164);
      setVerify({
        phase: 'awaiting_otp',
        e164: verify.e164,
        verificationId: result.verificationId,
        expiresAt: result.expiresAt,
        via: result.via,
      });
      setOtpInput('');
    } catch (err) {
      const detail = err instanceof WhatsappAdapterError ? err.message : t('send_otp_failed');
      setVerify({ phase: 'error', message: detail });
    }
  }, [product, verify, t]);

  const handleConfirmOtp = useCallback(async () => {
    if (verify.phase !== 'awaiting_otp') return;
    if (!/^\d{6}$/.test(otpInput)) {
      setVerify({ phase: 'error', message: t('otp_must_be_six') });
      return;
    }
    setVerify({ phase: 'confirming', e164: verify.e164, verificationId: verify.verificationId, otp: otpInput });
    try {
      const result = await confirmWhatsappOtp(product, verify.verificationId, otpInput, routingFor);
      if (!result.verified) {
        setVerify({ phase: 'error', message: t('verification_failed') });
        return;
      }
      if (result.config) setConfig(result.config);
      setVerify({ phase: 'verified', e164: verify.e164 });
      setSavedMessage(t('verified_routing', { number: formatWhatsappDisplay(verify.e164), routing: routingLower(routingFor) }));
      setOtpInput('');
      setDraftNumber('');
    } catch (err) {
      const detail = err instanceof WhatsappAdapterError ? err.message : t('otp_invalid_or_expired');
      setVerify({ phase: 'error', message: detail });
    }
  }, [otpInput, product, routingFor, routingLower, verify, t]);

  if (loadStatus === 'loading') {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-6">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{t('loading')}</span>
      </div>
    );
  }

  if (loadStatus === 'unavailable') {
    return (
      <Banner tone="info" title={product === 'crypto' ? t('coming_soon') : t('temporarily_unavailable')} body={errorMessage} />
    );
  }

  if (loadStatus === 'forbidden') {
    return <Banner tone="warn" title={t('addon_inactive_title')} body={errorMessage} />;
  }

  if (loadStatus === 'error' || !config) {
    return (
      <div className="space-y-3">
        <Banner tone="error" title={t('load_failed_title')} body={errorMessage || t('try_again_body')} />
        <Button variant="outline" size="sm" onClick={() => void refresh()}>{t('try_again')}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!config.addonActive && (
        <Banner
          tone="warn"
          title={t('addon_inactive_title')}
          body={t('addon_inactive_body')}
        />
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-medium">{t('delivery_status')}</p>
          <p className="text-xs text-muted-foreground">
            {t('delivery_meta_provider')} <span className="font-mono">{config.provider}</span>
            {' · '}
            {t('delivery_meta_addon')} {config.addonActive ? <span className="text-emerald-400">{t('addon_active')}</span> : <span className="text-amber-400">{t('addon_pending')}</span>}
          </p>
        </div>
        <Button
          variant={config.enabled ? 'default' : 'outline'}
          onClick={() => void submitToggle(!config.enabled)}
          disabled={saving || !canConfigure}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : config.enabled ? <ShieldCheck className="h-4 w-4 mr-2" /> : <ShieldX className="h-4 w-4 mr-2" />}
          {config.enabled ? t('toggle_active') : t('toggle_inactive')}
        </Button>
      </div>

      {/* Routing targets */}
      <div className="grid gap-3 md:grid-cols-3">
        {ROUTING_KEYS.map((key) => {
          const value = key === 'alerts' ? config.alertsTarget : key === 'ops' ? config.opsTarget : config.digestTarget;
          return (
            <div key={key} className="rounded-lg border border-border bg-card p-3 space-y-2">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{routingLabel(key)}</p>
                <p className="text-[11px] text-muted-foreground/80 mt-0.5 leading-snug">{routingHint(key)}</p>
              </div>
              {value ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm truncate" title={value}>{maskWhatsappNumber(value)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void submitClearTarget(key)}
                    disabled={saving}
                  >
                    {t('delete')}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">{t('no_number_yet')}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Add new number */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-amber-400" />
          <p className="text-sm font-semibold">{t('add_number_title')}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[120px_1fr_auto]">
          <div>
            <label htmlFor={`cc-${product}`} className="text-[11px] uppercase tracking-wider text-muted-foreground">{t('country_label')}</label>
            <Input
              id={`cc-${product}`}
              value={draftCountryCode}
              inputMode="numeric"
              maxLength={4}
              onChange={(e) => setDraftCountryCode(e.target.value.replace(/\D+/g, ''))}
              disabled={!canConfigure || verify.phase === 'awaiting_otp' || verify.phase === 'confirming'}
            />
          </div>
          <div>
            <label htmlFor={`num-${product}`} className="text-[11px] uppercase tracking-wider text-muted-foreground">{t('number_label')}</label>
            <Input
              id={`num-${product}`}
              value={draftNumber}
              inputMode="tel"
              autoComplete="tel"
              placeholder={t('number_placeholder')}
              onChange={(e) => setDraftNumber(e.target.value)}
              disabled={!canConfigure || verify.phase === 'awaiting_otp' || verify.phase === 'confirming'}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={handleValidate}
              disabled={!canConfigure || draftNumber.trim() === '' || ['validating', 'sending_otp', 'awaiting_otp', 'confirming'].includes(verify.phase)}
            >
              {verify.phase === 'validating' ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t('check_number_loading')}</>
              ) : t('check_number_btn')}
            </Button>
          </div>
        </div>

        <div>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-2">{t('routing_section_label')}</span>
          <span className="inline-flex items-center gap-1 flex-wrap">
            {ROUTING_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setRoutingFor(key)}
                disabled={verify.phase === 'awaiting_otp' || verify.phase === 'confirming'}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs border transition-colors',
                  routingFor === key
                    ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
                aria-pressed={routingFor === key}
              >
                {routingLabel(key)}
              </button>
            ))}
          </span>
        </div>

        {/* Verify state machine UI */}
        {verify.phase === 'validated' && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
            <div className="flex items-center gap-2 text-sm text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              <span>{t('registered_confirm', { number: formatWhatsappDisplay(verify.e164) })}</span>
            </div>
            <Button size="sm" onClick={handleRequestOtp}>{t('send_otp')}</Button>
          </div>
        )}

        {verify.phase === 'sending_otp' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {t('sending_otp', { number: formatWhatsappDisplay(verify.e164) })}
          </div>
        )}

        {verify.phase === 'awaiting_otp' && (
          <OtpForm
            e164={verify.e164}
            expiresAt={verify.expiresAt}
            via={verify.via}
            otp={otpInput}
            onChange={setOtpInput}
            onConfirm={handleConfirmOtp}
            onCancel={() => { setVerify({ phase: 'idle' }); setOtpInput(''); }}
            confirming={false}
          />
        )}

        {verify.phase === 'confirming' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {t('verifying')}
          </div>
        )}

        {verify.phase === 'verified' && (
          <div className="flex items-center gap-2 text-sm text-emerald-300 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{t('verified_routing', { number: formatWhatsappDisplay(verify.e164), routing: routingLower(routingFor) })}</span>
          </div>
        )}

        {verify.phase === 'error' && (
          <Banner tone="error" title={t('verify_failed_title')} body={verify.message} action={
            <Button size="sm" variant="outline" onClick={() => setVerify({ phase: 'idle' })}>{t('try_again_btn')}</Button>
          } />
        )}

        {savedMessage && (
          <p className="text-xs text-muted-foreground" role="status" aria-live="polite">{savedMessage}</p>
        )}

        <p className="text-[11px] text-muted-foreground/80 flex items-start gap-1.5">
          <Lock className="h-3 w-3 mt-0.5 shrink-0" />
          {t('fonnte_note')}
        </p>
      </div>
    </div>
  );
}

function OtpForm(props: {
  e164: string;
  expiresAt: string;
  via: string | null;
  otp: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  confirming: boolean;
}) {
  const t = useTranslations('portal.whatsapp_section');
  const expiresAt = useMemo(() => new Date(props.expiresAt), [props.expiresAt]);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000)),
  );
  useEffect(() => {
    const tmr = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(tmr);
  }, [expiresAt]);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeStr = `${minutes}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="space-y-2 rounded-md border border-amber-400/30 bg-amber-400/5 p-3">
      <p className="text-sm">
        {t('otp_sent_to')} <span className="font-mono">{formatWhatsappDisplay(props.e164)}</span>
        {props.via === 'fonnte_direct' && <span className="ml-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">{t('via_gateway')}</span>}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          ref={inputRef}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={props.otp}
          onChange={(e) => props.onChange(e.target.value.replace(/\D+/g, '').slice(0, 6))}
          placeholder={t('otp_placeholder')}
          className="w-32 font-mono tracking-widest text-center"
          aria-label={t('otp_aria')}
        />
        <Button
          onClick={props.onConfirm}
          disabled={props.confirming || props.otp.length !== 6 || secondsLeft <= 0}
        >
          {t('verify')}
        </Button>
        <Button variant="ghost" onClick={props.onCancel}>{t('cancel')}</Button>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {t('expires_in', { time: timeStr })}
        </span>
      </div>
    </div>
  );
}

function Banner(props: { tone: 'info' | 'warn' | 'error'; title: string; body: string; action?: React.ReactNode }) {
  const palette =
    props.tone === 'error'
      ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
      : props.tone === 'warn'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
        : 'border-sky-500/30 bg-sky-500/10 text-sky-200';
  return (
    <div className={cn('rounded-md border px-3 py-2 flex items-start gap-2', palette)} role={props.tone === 'error' ? 'alert' : 'status'}>
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium">{props.title}</p>
        <p className="text-xs opacity-90 mt-0.5">{props.body}</p>
        {props.action && <div className="mt-2">{props.action}</div>}
      </div>
    </div>
  );
}

export function WhatsappSection() {
  const t = useTranslations('portal.whatsapp_section');
  const [activeProduct, setActiveProduct] = useState<WaProduct>('forex');
  const PRODUCTS: { id: WaProduct; label: string }[] = [
    { id: 'forex', label: t('product_forex') },
    { id: 'crypto', label: t('product_crypto') },
  ];
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{t('title')}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {t('subtitle')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="inline-flex rounded-md border border-border bg-background p-0.5">
          {PRODUCTS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveProduct(p.id)}
              className={cn(
                'px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded transition-colors',
                activeProduct === p.id ? 'bg-amber-400/15 text-amber-300' : 'text-muted-foreground hover:text-foreground',
              )}
              aria-pressed={activeProduct === p.id}
            >
              {p.label}
            </button>
          ))}
        </div>
        {activeProduct === 'forex' ? (
          <ProductPanel key="forex" product="forex" />
        ) : (
          <CryptoNotificationsSection />
        )}
      </CardContent>
    </Card>
  );
}

// Re-export so consumers can dynamically import this file ergonomically.
export { isValidWhatsappTarget };
