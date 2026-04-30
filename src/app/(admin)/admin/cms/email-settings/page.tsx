'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CmsPageHeader } from '@/components/cms/page-header';
import { useAuth } from '@/lib/auth/auth-context';
import { Save, Send, Mail, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface EmailSettings {
  apiKey: string;          // masked
  apiKeySet: boolean;
  smtpUser: string;
  smtpPassword: string;    // masked
  smtpPasswordSet: boolean;
  fromAddress: string;
  fromName: string;
  replyTo: string;
  enabled: boolean;
}

export default function EmailSettingsPage() {
  const { getAuthHeaders } = useAuth();
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [smtpUserInput, setSmtpUserInput] = useState('');
  const [smtpPwInput, setSmtpPwInput] = useState('');
  const [fromAddress, setFromAddress] = useState('');
  const [fromName, setFromName] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [testTo, setTestTo] = useState('abdullahst.id@gmail.com');

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/cms/email-settings', { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      const s: EmailSettings = data.settings;
      setSettings(s);
      setSmtpUserInput(s.smtpUser);
      setFromAddress(s.fromAddress || 'noreply@babahalgo.com');
      setFromName(s.fromName || 'BabahAlgo');
      setReplyTo(s.replyTo);
      setEnabled(s.enabled);
    }
    setLoading(false);
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function save() {
    setSaving(true);
    setFeedback(null);
    const payload: Record<string, unknown> = {
      smtpUser: smtpUserInput,
      fromAddress,
      fromName,
      replyTo,
      enabled,
    };
    // Hanya kirim secret kalau user input baru — kalau kosong, preserve existing.
    if (apiKeyInput.trim()) payload.apiKey = apiKeyInput.trim();
    if (smtpPwInput.trim()) payload.smtpPassword = smtpPwInput.trim();

    const res = await fetch('/api/admin/cms/email-settings', {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      setFeedback({ kind: 'ok', text: 'Pengaturan email tersimpan.' });
      setApiKeyInput('');
      setSmtpPwInput('');
      fetchSettings();
    } else {
      const err = await res.json().catch(() => null);
      setFeedback({ kind: 'err', text: err?.message ?? 'Gagal menyimpan pengaturan.' });
    }
  }

  async function sendTest() {
    if (!testTo.trim()) return;
    setSending(true);
    setFeedback(null);
    const res = await fetch('/api/admin/cms/email-settings/test', {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: testTo.trim() }),
    });
    setSending(false);
    if (res.ok) {
      const data = await res.json();
      setFeedback({
        kind: 'ok',
        text: `Email test terkirim ke ${testTo} (messageId: ${data.messageId || '-'}). Cek inbox.`,
      });
    } else {
      const err = await res.json().catch(() => null);
      setFeedback({
        kind: 'err',
        text: `Gagal kirim: ${err?.message ?? 'unknown error'}`,
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <CmsPageHeader title="Email Settings" description="Konfigurasi Brevo SMTP/API." />
        <div className="text-muted-foreground">Memuat…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Email Settings (Brevo)"
        description="Konfigurasi Brevo Transactional API + SMTP. Sensitive value di-encrypt sebelum disimpan ke database. Setting ini override env vars (BREVO_API_KEY, SMTP_FROM)."
      />

      {feedback && (
        <div
          className={
            feedback.kind === 'ok'
              ? 'flex items-start gap-2 p-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'flex items-start gap-2 p-3 rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-300'
          }
        >
          {feedback.kind === 'ok' ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          <span className="text-sm">{feedback.text}</span>
        </div>
      )}

      {/* Brevo API */}
      <Card>
        <CardHeader>
          <CardTitle>Brevo Transactional API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">
              API Key{' '}
              <span className="text-xs text-muted-foreground">
                {settings?.apiKeySet ? `(saat ini: ${settings.apiKey})` : '(belum diset)'}
              </span>
            </label>
            <Input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={settings?.apiKeySet ? 'Kosongkan untuk pertahankan nilai saat ini' : 'xkeysib-…'}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Dari Brevo dashboard → SMTP &amp; API → API Keys. Disimpan ter-enkripsi (AES-256-GCM).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Brevo SMTP (alternative — bukan prioritas, tapi disediakan) */}
      <Card>
        <CardHeader>
          <CardTitle>Brevo SMTP (alternatif)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Opsional. Saat ini sender pakai Transactional API (lebih reliable). SMTP useful untuk
            integrasi tools lain (third-party CRM, dll) yang butuh kredensial SMTP.
          </p>
          <div>
            <label className="text-sm font-medium block mb-1">SMTP User (login)</label>
            <Input
              value={smtpUserInput}
              onChange={(e) => setSmtpUserInput(e.target.value)}
              placeholder="9xxxxxx@smtp-brevo.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">
              SMTP Master Password{' '}
              <span className="text-xs text-muted-foreground">
                {settings?.smtpPasswordSet ? `(saat ini: ${settings.smtpPassword})` : '(belum diset)'}
              </span>
            </label>
            <Input
              type="password"
              value={smtpPwInput}
              onChange={(e) => setSmtpPwInput(e.target.value)}
              placeholder={settings?.smtpPasswordSet ? 'Kosongkan untuk pertahankan' : 'xsmtpsib-…'}
              autoComplete="new-password"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sender identity */}
      <Card>
        <CardHeader>
          <CardTitle>Sender Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">From Address</label>
            <Input
              type="email"
              value={fromAddress}
              onChange={(e) => setFromAddress(e.target.value)}
              placeholder="noreply@babahalgo.com"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Domain harus sudah verified di Brevo + DNS SPF/DKIM/DMARC.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">From Name</label>
            <Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="BabahAlgo" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Reply-To (opsional)</label>
            <Input
              type="email"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              placeholder="hello@babahalgo.com"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span>Aktifkan pengiriman email</span>
            </label>
            <p className="text-xs text-muted-foreground mt-1 ml-6">
              Off = sendEmail() throw &quot;email_disabled&quot;. Berguna untuk pause sementara saat ada masalah.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Simpan Pengaturan
        </Button>
      </div>

      {/* Test send */}
      <Card>
        <CardHeader>
          <CardTitle>Uji Coba Kirim Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Kirim email tes untuk verifikasi konfigurasi. Sender + API key sudah harus disimpan
            sebelumnya. Tidak terpotong rate-limit publik (admin scope).
          </p>
          <div>
            <label className="text-sm font-medium block mb-1">Kirim ke</label>
            <Input
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="penerima@email.com"
            />
          </div>
          <Button onClick={sendTest} disabled={sending || !testTo.trim()}>
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Kirim Email Test
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
