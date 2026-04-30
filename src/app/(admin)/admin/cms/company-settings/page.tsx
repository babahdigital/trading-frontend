'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CmsPageHeader } from '@/components/cms/page-header';
import { useAuth } from '@/lib/auth/auth-context';
import { Save, Loader2, AlertCircle, CheckCircle2, Building2, Mail, Globe, Phone } from 'lucide-react';

interface CompanySettings {
  name: string;
  legalEntity: string;
  tagline: string;
  taglineEn: string;
  logoUrl: string;
  logoDarkUrl: string;
  address: string;
  phone: string;
  whatsappDigits: string;
  emailGeneral: string;
  emailCompliance: string;
  emailSupport: string;
  country: string;
  foundedYear: string;
  twitterUrl: string;
  linkedinUrl: string;
  telegramUrl: string;
  instagramUrl: string;
  exnessAffiliateUrl: string;
}

const EMPTY: CompanySettings = {
  name: '', legalEntity: '', tagline: '', taglineEn: '', logoUrl: '', logoDarkUrl: '',
  address: '', phone: '', whatsappDigits: '', emailGeneral: '', emailCompliance: '',
  emailSupport: '', country: '', foundedYear: '', twitterUrl: '', linkedinUrl: '',
  telegramUrl: '', instagramUrl: '', exnessAffiliateUrl: '',
};

export default function CompanySettingsPage() {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState<CompanySettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/cms/company-settings', { headers: getAuthHeaders() });
    if (res.ok) {
      const body = await res.json();
      setData(body.settings);
    }
    setLoading(false);
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function set<K extends keyof CompanySettings>(field: K, value: CompanySettings[K]) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  async function save() {
    setSaving(true);
    setFeedback(null);
    const res = await fetch('/api/admin/cms/company-settings', {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setSaving(false);
    if (res.ok) {
      setFeedback({ kind: 'ok', text: 'Pengaturan perusahaan tersimpan. Cache dipublikasikan dalam 60 detik.' });
      fetchData();
    } else {
      const err = await res.json().catch(() => null);
      setFeedback({ kind: 'err', text: err?.message ?? 'Gagal menyimpan pengaturan.' });
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <CmsPageHeader title="Company Settings" description="Memuat..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Company Settings"
        description="Identitas perusahaan terpusat. Nilai di sini dipakai di footer, halaman /contact, halaman /legal/*, email templates, dan SEO meta. Edit sekali, terpakai di banyak tempat."
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Identitas
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <Field label="Brand Name" value={data.name} onChange={(v) => set('name', v)} placeholder="BabahAlgo" />
          <Field label="Legal Entity" value={data.legalEntity} onChange={(v) => set('legalEntity', v)} placeholder="CV Babah Digital" />
          <Field label="Tagline (ID)" value={data.tagline} onChange={(v) => set('tagline', v)} placeholder="Inteligensi Otonom · Presisi Institusional" />
          <Field label="Tagline (EN)" value={data.taglineEn} onChange={(v) => set('taglineEn', v)} placeholder="Autonomous Intelligence · Institutional Precision" />
          <Field label="Country (ISO 2)" value={data.country} onChange={(v) => set('country', v)} placeholder="ID" />
          <Field label="Founded Year" value={data.foundedYear} onChange={(v) => set('foundedYear', v)} placeholder="2024" />
          <Field label="Logo URL (light bg)" value={data.logoUrl} onChange={(v) => set('logoUrl', v)} placeholder="/logo/babahalgo-header-light.png" />
          <Field label="Logo URL (dark bg)" value={data.logoDarkUrl} onChange={(v) => set('logoDarkUrl', v)} placeholder="/logo/babahalgo-header-dark.png" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4" /> Kontak
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Alamat" value={data.address} onChange={(v) => set('address', v)} placeholder="Jl. Sudirman No. 1, Jakarta" full />
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Telpon (display)" value={data.phone} onChange={(v) => set('phone', v)} placeholder="+62 21 1234 5678" />
            <Field
              label="WhatsApp digits (no plus)"
              value={data.whatsappDigits}
              onChange={(v) => set('whatsappDigits', v.replace(/[^0-9]/g, ''))}
              placeholder="6281234567890"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" /> Email
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <Field label="Email Umum" value={data.emailGeneral} onChange={(v) => set('emailGeneral', v)} placeholder="hello@babahalgo.com" type="email" />
          <Field label="Email Compliance" value={data.emailCompliance} onChange={(v) => set('emailCompliance', v)} placeholder="compliance@babahalgo.com" type="email" />
          <Field label="Email Support" value={data.emailSupport} onChange={(v) => set('emailSupport', v)} placeholder="support@babahalgo.com" type="email" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" /> Social & Affiliate
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <Field label="Twitter URL" value={data.twitterUrl} onChange={(v) => set('twitterUrl', v)} placeholder="https://twitter.com/..." />
          <Field label="LinkedIn URL" value={data.linkedinUrl} onChange={(v) => set('linkedinUrl', v)} placeholder="https://linkedin.com/company/..." />
          <Field label="Telegram URL" value={data.telegramUrl} onChange={(v) => set('telegramUrl', v)} placeholder="https://t.me/babahalgo" />
          <Field label="Instagram URL" value={data.instagramUrl} onChange={(v) => set('instagramUrl', v)} placeholder="https://instagram.com/..." />
          <Field label="Exness Affiliate URL" value={data.exnessAffiliateUrl} onChange={(v) => set('exnessAffiliateUrl', v)} placeholder="https://one.exnesstrack.org/..." full />
        </CardContent>
      </Card>

      <div className="flex gap-2 pt-2">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Simpan Pengaturan
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  full?: boolean;
}) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="text-sm font-medium block mb-1">{label}</label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
