'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Loader2, Lock, MessageSquare, ShieldCheck, ShieldX } from 'lucide-react';
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

const PRODUCTS: { id: WaProduct; label: string }[] = [
  { id: 'forex', label: 'Forex' },
  { id: 'crypto', label: 'Crypto' },
];

const ROUTING_LABELS: Record<RoutingKey, { label: string; hint: string }> = {
  alerts: { label: 'Alerts', hint: 'Signal & kill-switch — kirim ke nomor ini saat ada sinyal trading atau emergency stop.' },
  ops: { label: 'Operations', hint: 'Pemberitahuan deploy, pause, status — biasanya untuk admin/owner.' },
  digest: { label: 'Digest harian', hint: 'Ringkasan harian P&L + posisi tertutup.' },
};

type RoutingKey = 'alerts' | 'ops' | 'digest';

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
              ? 'WhatsApp untuk Crypto belum tersedia — backend sedang dalam pengembangan.'
              : 'Backend forex tidak dapat dijangkau saat ini.',
          );
          return;
        }
        if (err.status === 403) {
          setLoadStatus('forbidden');
          setErrorMessage('Add-on WhatsApp belum aktif untuk akun Anda. Hubungi support untuk mengaktifkan.');
          return;
        }
        setLoadStatus('error');
        setErrorMessage(err.message);
        return;
      }
      setLoadStatus('error');
      setErrorMessage('Gagal memuat konfigurasi.');
    }
  }, [product]);

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
      setSavedMessage('Disimpan.');
    } catch (err) {
      setSavedMessage(err instanceof WhatsappAdapterError ? err.message : 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  }, [config, product]);

  const submitClearTarget = useCallback(async (key: RoutingKey) => {
    if (!config) return;
    setSaving(true);
    setSavedMessage('');
    try {
      const patchKey = key === 'alerts' ? 'alertsTarget' : key === 'ops' ? 'opsTarget' : 'digestTarget';
      const next = await patchWhatsappConfig(product, { [patchKey]: null });
      setConfig(next);
      setSavedMessage('Target dihapus.');
    } catch (err) {
      setSavedMessage(err instanceof WhatsappAdapterError ? err.message : 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  }, [config, product]);

  const handleValidate = useCallback(async () => {
    setVerify({ phase: 'validating' });
    const e164 = toE164(draftNumber, draftCountryCode);
    if (!e164) {
      setVerify({ phase: 'error', message: 'Nomor tidak valid. Gunakan format E.164 (cth +6281234567890).' });
      return;
    }
    try {
      const result = await validateWhatsappNumber(e164);
      if (!result.registered) {
        setVerify({
          phase: 'error',
          message: result.reason
            ? `Nomor ${formatWhatsappDisplay(e164)} tidak terdaftar di WhatsApp (${result.reason}).`
            : `Nomor ${formatWhatsappDisplay(e164)} tidak terdaftar di WhatsApp.`,
        });
        return;
      }
      setVerify({ phase: 'validated', e164 });
    } catch (err) {
      const detail = err instanceof WhatsappAdapterError ? err.message : 'Gagal memverifikasi nomor.';
      setVerify({ phase: 'error', message: detail });
    }
  }, [draftCountryCode, draftNumber]);

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
      const detail = err instanceof WhatsappAdapterError ? err.message : 'Gagal mengirim OTP.';
      setVerify({ phase: 'error', message: detail });
    }
  }, [product, verify]);

  const handleConfirmOtp = useCallback(async () => {
    if (verify.phase !== 'awaiting_otp') return;
    if (!/^\d{6}$/.test(otpInput)) {
      setVerify({ phase: 'error', message: 'OTP harus 6 digit angka.' });
      return;
    }
    setVerify({ phase: 'confirming', e164: verify.e164, verificationId: verify.verificationId, otp: otpInput });
    try {
      const result = await confirmWhatsappOtp(product, verify.verificationId, otpInput, routingFor);
      if (!result.verified) {
        setVerify({ phase: 'error', message: 'Verifikasi gagal.' });
        return;
      }
      if (result.config) setConfig(result.config);
      setVerify({ phase: 'verified', e164: verify.e164 });
      setSavedMessage(`Nomor ${formatWhatsappDisplay(verify.e164)} terverifikasi sebagai ${ROUTING_LABELS[routingFor].label.toLowerCase()}.`);
      setOtpInput('');
      setDraftNumber('');
    } catch (err) {
      const detail = err instanceof WhatsappAdapterError ? err.message : 'OTP salah atau kadaluarsa.';
      setVerify({ phase: 'error', message: detail });
    }
  }, [otpInput, product, routingFor, verify]);

  if (loadStatus === 'loading') {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-6">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Memuat konfigurasi…</span>
      </div>
    );
  }

  if (loadStatus === 'unavailable') {
    return (
      <Banner tone="info" title={product === 'crypto' ? 'Coming Soon' : 'Sementara tidak tersedia'} body={errorMessage} />
    );
  }

  if (loadStatus === 'forbidden') {
    return <Banner tone="warn" title="Add-on belum aktif" body={errorMessage} />;
  }

  if (loadStatus === 'error' || !config) {
    return (
      <div className="space-y-3">
        <Banner tone="error" title="Gagal memuat" body={errorMessage || 'Silakan coba lagi.'} />
        <Button variant="outline" size="sm" onClick={() => void refresh()}>Coba Lagi</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!config.addonActive && (
        <Banner
          tone="warn"
          title="Add-on belum aktif"
          body="Add-on WhatsApp belum aktif untuk akun Anda. Pengaturan di bawah disimpan tetapi pesan tidak akan dikirim sampai admin mengaktifkan."
        />
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-medium">Status delivery</p>
          <p className="text-xs text-muted-foreground">
            Provider: <span className="font-mono">{config.provider}</span>
            {' · '}
            Add-on: {config.addonActive ? <span className="text-emerald-400">aktif</span> : <span className="text-amber-400">belum</span>}
          </p>
        </div>
        <Button
          variant={config.enabled ? 'default' : 'outline'}
          onClick={() => void submitToggle(!config.enabled)}
          disabled={saving || !canConfigure}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : config.enabled ? <ShieldCheck className="h-4 w-4 mr-2" /> : <ShieldX className="h-4 w-4 mr-2" />}
          {config.enabled ? 'Aktif — klik untuk mematikan' : 'Nonaktif — klik untuk aktifkan'}
        </Button>
      </div>

      {/* Routing targets */}
      <div className="grid gap-3 md:grid-cols-3">
        {(Object.keys(ROUTING_LABELS) as RoutingKey[]).map((key) => {
          const value = key === 'alerts' ? config.alertsTarget : key === 'ops' ? config.opsTarget : config.digestTarget;
          return (
            <div key={key} className="rounded-lg border border-border bg-card p-3 space-y-2">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{ROUTING_LABELS[key].label}</p>
                <p className="text-[11px] text-muted-foreground/80 mt-0.5 leading-snug">{ROUTING_LABELS[key].hint}</p>
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
                    Hapus
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Belum ada nomor</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Add new number */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-amber-400" />
          <p className="text-sm font-semibold">Tambah / verifikasi nomor</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[120px_1fr_auto]">
          <div>
            <label htmlFor={`cc-${product}`} className="text-[11px] uppercase tracking-wider text-muted-foreground">Country</label>
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
            <label htmlFor={`num-${product}`} className="text-[11px] uppercase tracking-wider text-muted-foreground">Nomor WhatsApp</label>
            <Input
              id={`num-${product}`}
              value={draftNumber}
              inputMode="tel"
              autoComplete="tel"
              placeholder="0812 3456 7890"
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
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Cek</>
              ) : 'Cek nomor'}
            </Button>
          </div>
        </div>

        <div>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-2">Routing</span>
          <span className="inline-flex items-center gap-1 flex-wrap">
            {(Object.keys(ROUTING_LABELS) as RoutingKey[]).map((key) => (
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
                {ROUTING_LABELS[key].label}
              </button>
            ))}
          </span>
        </div>

        {/* Verify state machine UI */}
        {verify.phase === 'validated' && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
            <div className="flex items-center gap-2 text-sm text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              <span>Nomor {formatWhatsappDisplay(verify.e164)} terdaftar di WhatsApp.</span>
            </div>
            <Button size="sm" onClick={handleRequestOtp}>Kirim OTP</Button>
          </div>
        )}

        {verify.phase === 'sending_otp' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Mengirim OTP ke {formatWhatsappDisplay(verify.e164)}…
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
            <Loader2 className="h-4 w-4 animate-spin" /> Memverifikasi…
          </div>
        )}

        {verify.phase === 'verified' && (
          <div className="flex items-center gap-2 text-sm text-emerald-300 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{formatWhatsappDisplay(verify.e164)} terverifikasi sebagai {ROUTING_LABELS[routingFor].label.toLowerCase()}.</span>
          </div>
        )}

        {verify.phase === 'error' && (
          <Banner tone="error" title="Verifikasi gagal" body={verify.message} action={
            <Button size="sm" variant="outline" onClick={() => setVerify({ phase: 'idle' })}>Coba lagi</Button>
          } />
        )}

        {savedMessage && (
          <p className="text-xs text-muted-foreground" role="status" aria-live="polite">{savedMessage}</p>
        )}

        <p className="text-[11px] text-muted-foreground/80 flex items-start gap-1.5">
          <Lock className="h-3 w-3 mt-0.5 shrink-0" />
          Token Fonnte tidak pernah masuk ke browser — semua call ke gateway dilakukan dari server.
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
  const expiresAt = useMemo(() => new Date(props.expiresAt), [props.expiresAt]);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000)),
  );
  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="space-y-2 rounded-md border border-amber-400/30 bg-amber-400/5 p-3">
      <p className="text-sm">
        Kode 6 digit dikirim ke <span className="font-mono">{formatWhatsappDisplay(props.e164)}</span>
        {props.via === 'fonnte_direct' && <span className="ml-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">via gateway</span>}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          ref={inputRef}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={props.otp}
          onChange={(e) => props.onChange(e.target.value.replace(/\D+/g, '').slice(0, 6))}
          placeholder="123456"
          className="w-32 font-mono tracking-widest text-center"
          aria-label="OTP code"
        />
        <Button
          onClick={props.onConfirm}
          disabled={props.confirming || props.otp.length !== 6 || secondsLeft <= 0}
        >
          Verifikasi
        </Button>
        <Button variant="ghost" onClick={props.onCancel}>Batal</Button>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          Kadaluarsa {minutes}:{String(seconds).padStart(2, '0')}
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
  const [activeProduct, setActiveProduct] = useState<WaProduct>('forex');
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">WhatsApp Notification</CardTitle>
        <p className="text-xs text-muted-foreground">
          Verifikasi nomor sekali, kemudian terima sinyal trading + alert kill-switch real-time. Backend yang kirim — bukan browser Anda.
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
        <ProductPanel key={activeProduct} product={activeProduct} />
      </CardContent>
    </Card>
  );
}

// Re-export so consumers can dynamically import this file ergonomically.
export { isValidWhatsappTarget };
