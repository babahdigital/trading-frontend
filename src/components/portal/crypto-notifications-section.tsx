'use client';

import { useCallback, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Send,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import {
  confirmCryptoWhatsappOtp,
  getCryptoNotificationPrefs,
  patchCryptoNotificationPrefs,
  requestCryptoWhatsappOtp,
  type CryptoNotificationPrefs,
  WhatsappAdapterError,
} from '@/lib/whatsapp/client';
import { formatWhatsappDisplay, isValidWhatsappTarget, maskWhatsappNumber, toE164 } from '@/lib/whatsapp/format';

const KNOWN_EVENTS: { id: string; label: string; hint: string }[] = [
  { id: 'signal.emitted', label: 'Signal baru', hint: 'Saat bot emit sinyal trading.' },
  { id: 'position.opened', label: 'Posisi terbuka', hint: 'Saat order entry tereksekusi.' },
  { id: 'position.closed', label: 'Posisi tertutup', hint: 'Saat TP/SL/manual close.' },
  { id: 'kill_switch.activated', label: 'Kill-switch', hint: 'Emergency stop. Selalu disarankan ON.' },
  { id: 'risk.limit_hit', label: 'Limit risk tercapai', hint: 'Daily loss / drawdown threshold.' },
  { id: 'funding.alert', label: 'Funding alert', hint: 'Funding rate ekstrem.' },
];

type VerifyState =
  | { phase: 'idle' }
  | { phase: 'requesting'; via?: string | null; message?: string }
  | { phase: 'awaiting_otp'; via: string | null; message?: string }
  | { phase: 'confirming' }
  | { phase: 'verified' }
  | { phase: 'error'; message: string };

export function CryptoNotificationsSection() {
  const [prefs, setPrefs] = useState<CryptoNotificationPrefs | null>(null);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'unavailable' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  const [draftCountryCode, setDraftCountryCode] = useState('62');
  const [draftNumber, setDraftNumber] = useState('');
  const [verify, setVerify] = useState<VerifyState>({ phase: 'idle' });
  const [otpInput, setOtpInput] = useState('');

  const refresh = useCallback(async () => {
    setLoadStatus('loading');
    setErrorMessage('');
    try {
      const p = await getCryptoNotificationPrefs();
      setPrefs(p);
      setLoadStatus('ready');
    } catch (err) {
      if (err instanceof WhatsappAdapterError) {
        if (err.status === 503 || err.status === 404) {
          setLoadStatus('unavailable');
          setErrorMessage('Backend crypto notification preferences belum dapat dijangkau.');
          return;
        }
        if (err.status === 403) {
          setLoadStatus('unavailable');
          setErrorMessage('Subscription crypto belum aktif untuk akun Anda.');
          return;
        }
        setLoadStatus('error');
        setErrorMessage(err.message);
        return;
      }
      setLoadStatus('error');
      setErrorMessage('Gagal memuat preferensi.');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submitPatch = useCallback(async (patch: Parameters<typeof patchCryptoNotificationPrefs>[0]) => {
    setSaving(true);
    setSavedMessage('');
    try {
      const next = await patchCryptoNotificationPrefs(patch);
      setPrefs(next);
      setSavedMessage('Disimpan.');
    } catch (err) {
      if (err instanceof WhatsappAdapterError) {
        setSavedMessage(humanizeCryptoError(err.message));
      } else {
        setSavedMessage('Gagal menyimpan.');
      }
    } finally {
      setSaving(false);
    }
  }, []);

  const handleSetNumber = useCallback(async () => {
    const e164 = toE164(draftNumber, draftCountryCode);
    if (!e164 || !isValidWhatsappTarget(e164)) {
      setVerify({ phase: 'error', message: 'Nomor tidak valid. Gunakan format internasional (cth +6281234567890).' });
      return;
    }
    setVerify({ phase: 'idle' });
    await submitPatch({ whatsappNumber: e164 });
    setDraftNumber('');
  }, [draftCountryCode, draftNumber, submitPatch]);

  const handleRequestOtp = useCallback(async () => {
    setVerify({ phase: 'requesting' });
    try {
      const result = await requestCryptoWhatsappOtp();
      setVerify({
        phase: 'awaiting_otp',
        via: result.status === 'otp_send_stub' ? 'stub' : null,
        message: result.message ?? result.detail,
      });
      setOtpInput('');
    } catch (err) {
      const detail = err instanceof WhatsappAdapterError ? humanizeCryptoError(err.message) : 'Gagal mengirim OTP.';
      setVerify({ phase: 'error', message: detail });
    }
  }, []);

  const handleConfirmOtp = useCallback(async () => {
    if (verify.phase !== 'awaiting_otp') return;
    if (!otpInput.trim()) {
      setVerify({ phase: 'error', message: 'OTP tidak boleh kosong.' });
      return;
    }
    setVerify({ phase: 'confirming' });
    try {
      const result = await confirmCryptoWhatsappOtp(otpInput.trim());
      if (result.status !== 'verified') {
        setVerify({ phase: 'error', message: 'Verifikasi gagal.' });
        return;
      }
      setVerify({ phase: 'verified' });
      setOtpInput('');
      // Refresh prefs to pick up new whatsappVerified flag.
      await refresh();
    } catch (err) {
      const detail = err instanceof WhatsappAdapterError ? humanizeCryptoError(err.message) : 'OTP salah atau kadaluarsa.';
      setVerify({ phase: 'error', message: detail });
    }
  }, [otpInput, refresh, verify]);

  if (loadStatus === 'loading') {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-6">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Memuat preferensi crypto…</span>
      </div>
    );
  }

  if (loadStatus === 'unavailable') {
    return <Banner tone="info" title="Belum tersedia" body={errorMessage} />;
  }

  if (loadStatus === 'error' || !prefs) {
    return (
      <div className="space-y-3">
        <Banner tone="error" title="Gagal memuat" body={errorMessage || 'Silakan coba lagi.'} />
        <Button variant="outline" size="sm" onClick={() => void refresh()}>Coba Lagi</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Telegram channel */}
      <ChannelCard
        title="Telegram"
        enabled={prefs.telegramEnabled}
        onToggle={(enabled) => submitPatch({ telegramEnabled: enabled })}
        disabled={saving || !prefs.telegramChatId}
        helperText={
          prefs.telegramChatId
            ? `Terhubung ke chat ${prefs.telegramChatId.slice(-6)}…`
            : 'Bind Telegram dulu lewat /portal/account → Telegram bot.'
        }
        statusBadge={
          prefs.telegramChatId ? (
            <Badge tone="emerald">Connected</Badge>
          ) : (
            <Badge tone="amber">Not bound</Badge>
          )
        }
      />

      {/* WhatsApp channel */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-300" />
            <p className="text-sm font-semibold">WhatsApp</p>
            {prefs.whatsappVerified ? <Badge tone="emerald">Verified</Badge> : prefs.whatsappNumber ? <Badge tone="amber">Pending verify</Badge> : <Badge tone="muted">No number</Badge>}
          </div>
          <Button
            variant={prefs.whatsappEnabled ? 'default' : 'outline'}
            size="sm"
            disabled={saving || !prefs.whatsappVerified}
            onClick={() => submitPatch({ whatsappEnabled: !prefs.whatsappEnabled })}
          >
            {prefs.whatsappEnabled ? <ShieldCheck className="h-4 w-4 mr-2" /> : <ShieldX className="h-4 w-4 mr-2" />}
            {prefs.whatsappEnabled ? 'Aktif' : 'Nonaktif'}
          </Button>
        </div>

        {prefs.whatsappNumber && (
          <p className="text-xs text-muted-foreground">
            Nomor terikat: <span className="font-mono">{maskWhatsappNumber(prefs.whatsappNumber)}</span>
            {prefs.whatsappVerifiedAt && (
              <> · diverifikasi {new Date(prefs.whatsappVerifiedAt).toLocaleDateString('id-ID')}</>
            )}
            <button
              type="button"
              className="ml-2 text-rose-300 hover:text-rose-200"
              onClick={() => submitPatch({ whatsappNumber: null, whatsappEnabled: false })}
              disabled={saving}
            >
              Hapus
            </button>
          </p>
        )}

        {/* Add / change number */}
        <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto]">
          <div>
            <label htmlFor="crypto-cc" className="text-[11px] uppercase tracking-wider text-muted-foreground">Country</label>
            <Input
              id="crypto-cc"
              value={draftCountryCode}
              inputMode="numeric"
              maxLength={4}
              onChange={(e) => setDraftCountryCode(e.target.value.replace(/\D+/g, ''))}
            />
          </div>
          <div>
            <label htmlFor="crypto-num" className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {prefs.whatsappNumber ? 'Ganti nomor' : 'Tambah nomor'}
            </label>
            <Input
              id="crypto-num"
              value={draftNumber}
              inputMode="tel"
              autoComplete="tel"
              placeholder="0812 3456 7890"
              onChange={(e) => setDraftNumber(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={handleSetNumber}
              disabled={saving || draftNumber.trim() === ''}
            >
              <Send className="h-4 w-4 mr-2" />
              Simpan nomor
            </Button>
          </div>
        </div>

        {/* OTP flow */}
        {prefs.whatsappNumber && !prefs.whatsappVerified && (
          <div className="space-y-2 rounded-md border border-amber-400/30 bg-amber-400/5 p-3">
            <p className="text-sm">Verifikasi nomor <span className="font-mono">{formatWhatsappDisplay(prefs.whatsappNumber)}</span></p>
            {verify.phase === 'idle' && (
              <Button size="sm" onClick={handleRequestOtp} disabled={saving}>Kirim OTP</Button>
            )}
            {verify.phase === 'requesting' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Mengirim OTP…</div>
            )}
            {verify.phase === 'awaiting_otp' && (
              <div className="space-y-2">
                {verify.via === 'stub' && (
                  <Banner tone="info" title="Phase 2 stub" body={verify.message ?? 'Backend belum kirim OTP nyata. Masukkan kode "000000" untuk testing.'} />
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D+/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-32 font-mono tracking-widest text-center"
                    aria-label="OTP code"
                  />
                  <Button onClick={handleConfirmOtp} disabled={saving || otpInput.length === 0}>Verifikasi</Button>
                  <Button variant="ghost" onClick={() => { setVerify({ phase: 'idle' }); setOtpInput(''); }}>Batal</Button>
                </div>
              </div>
            )}
            {verify.phase === 'confirming' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memverifikasi…</div>
            )}
            {verify.phase === 'verified' && (
              <div className="flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Nomor terverifikasi.</div>
            )}
            {verify.phase === 'error' && (
              <Banner tone="error" title="Verifikasi gagal" body={verify.message} action={
                <Button size="sm" variant="outline" onClick={() => setVerify({ phase: 'idle' })}>Coba lagi</Button>
              } />
            )}
          </div>
        )}
      </div>

      {/* Event opt-out matrix */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold">Event yang ingin Anda terima</p>
          <p className="text-xs text-muted-foreground/80 mt-0.5">Toggle OFF untuk meredam jenis event tertentu di semua channel aktif.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {KNOWN_EVENTS.map((evt) => {
            const muted = prefs.eventOptouts[evt.id] === true;
            return (
              <label
                key={evt.id}
                className={cn(
                  'flex items-start gap-3 rounded-md border p-2.5 cursor-pointer transition-colors',
                  muted ? 'border-border bg-white/[0.02] opacity-70' : 'border-emerald-500/20 bg-emerald-500/[0.04]',
                )}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-border accent-amber-400"
                  checked={!muted}
                  onChange={(e) => submitPatch({ eventOptouts: { [evt.id]: !e.target.checked } })}
                  disabled={saving}
                  aria-label={`Toggle event ${evt.label}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-tight">{evt.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{evt.hint}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {savedMessage && (
        <p className="text-xs text-muted-foreground" role="status" aria-live="polite">{savedMessage}</p>
      )}
    </div>
  );
}

function ChannelCard(props: {
  title: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  helperText: string;
  statusBadge: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{props.title}</p>
          {props.statusBadge}
        </div>
        <Button
          variant={props.enabled ? 'default' : 'outline'}
          size="sm"
          disabled={props.disabled}
          onClick={() => props.onToggle(!props.enabled)}
        >
          {props.enabled ? <ShieldCheck className="h-4 w-4 mr-2" /> : <ShieldX className="h-4 w-4 mr-2" />}
          {props.enabled ? 'Aktif' : 'Nonaktif'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{props.helperText}</p>
    </div>
  );
}

function Badge(props: { tone: 'emerald' | 'amber' | 'rose' | 'muted'; children: React.ReactNode }) {
  const palette =
    props.tone === 'emerald'
      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
      : props.tone === 'amber'
        ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
        : props.tone === 'rose'
          ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
          : 'bg-white/5 border-white/10 text-muted-foreground';
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border', palette)}>
      {props.children}
    </span>
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

function humanizeCryptoError(code: string): string {
  switch (code) {
    case 'cannot_enable_telegram_no_chat_id':
      return 'Bind Telegram bot dulu sebelum mengaktifkan channel.';
    case 'cannot_enable_whatsapp_no_number':
      return 'Tambah nomor WhatsApp dulu.';
    case 'cannot_enable_whatsapp_unverified':
      return 'Verifikasi nomor lewat OTP dulu sebelum mengaktifkan.';
    case 'invalid_whatsapp_number':
    case 'invalid_e164':
      return 'Format nomor tidak valid.';
    case 'crypto_endpoint_not_found':
      return 'Endpoint backend belum tersedia.';
    case 'crypto_backend_unconfigured':
      return 'Backend crypto belum dikonfigurasi.';
    case 'otp_invalid':
      return 'Kode OTP salah atau kadaluarsa.';
    default:
      return code;
  }
}
