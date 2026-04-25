'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CmsPageHeader } from '@/components/cms/page-header';
import { useAuth } from '@/lib/auth/auth-context';
import { Save, Plus, Trash2 } from 'lucide-react';

interface SiteSetting {
  id: string;
  key: string;
  value: string;
  type: string;
  updatedAt: string;
}

const KNOWN_SETTINGS: Record<string, { label: string; description: string; placeholder?: string }> = {
  exness_affiliate_url: {
    label: 'Exness Affiliate URL',
    description: 'Setiap kata "Exness" di artikel blog otomatis di-wrap menjadi link ke URL ini. Default fallback: # (no-op).',
    placeholder: 'https://one.exnesstrack.org/intl/en/a/...',
  },
  vps1_affiliate_url: {
    label: 'VPS Provider Affiliate URL',
    description: 'URL referral untuk VPS provider yang direkomendasikan customer (Hostinger, Vultr, dll).',
    placeholder: 'https://example.com/?ref=babahalgo',
  },
  brevo_unsubscribe_url: {
    label: 'Newsletter Unsubscribe URL',
    description: 'Link unsubscribe untuk email yang dikirim Brevo. Wajib untuk compliance CAN-SPAM.',
    placeholder: 'https://babahalgo.com/unsubscribe',
  },
};

export default function SiteSettingsPage() {
  const { getAuthHeaders } = useAuth();
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/cms/site-settings', { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      setSettings(data);
      setEdits({});
    }
    setLoading(false);
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function handleSave(key: string) {
    const value = edits[key];
    if (value === undefined) return;
    setSaving(key);
    await fetch('/api/admin/cms/site-settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ key, value, type: 'string' }),
    });
    setSaving(null);
    fetchSettings();
  }

  async function handleAddNew() {
    if (!newKey.trim() || !newValue.trim()) return;
    await fetch('/api/admin/cms/site-settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ key: newKey.trim(), value: newValue.trim(), type: 'string' }),
    });
    setNewKey('');
    setNewValue('');
    fetchSettings();
  }

  async function handleApplyAffiliateLinks() {
    if (!confirm('Apply affiliate + internal links ke semua artikel published? Ini menulis ulang body — tidak destructive tapi sebaiknya backup dulu.')) return;
    const res = await fetch('/api/admin/articles/apply-links', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    alert(`Applied to ${data.affected ?? 0} articles. ${data.linkedTotal ?? 0} internal links + ${data.affiliatesTotal ?? 0} affiliate replacements added.`);
  }

  // Display known settings first, then any custom ones
  const knownEntries = Object.entries(KNOWN_SETTINGS);
  const knownKeys = new Set(knownEntries.map(([k]) => k));
  const customSettings = settings.filter((s) => !knownKeys.has(s.key));
  const settingsByKey = new Map(settings.map((s) => [s.key, s]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <CmsPageHeader
          title="Site Settings"
          description="Key-value config global — affiliate URLs, integration tokens, feature toggles. Read by content workers + components."
        />
        <Button variant="outline" onClick={handleApplyAffiliateLinks}>
          Apply links to all articles
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading settings...</div>
      ) : (
        <>
          {/* Known/curated settings (always shown, even if not in DB yet) */}
          <Card>
            <CardHeader>
              <CardTitle>Affiliate &amp; integrations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {knownEntries.map(([key, meta]) => {
                const existing = settingsByKey.get(key);
                const editValue = edits[key] ?? existing?.value ?? '';
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="text-sm font-mono font-medium">{key}</div>
                        <div className="text-sm">{meta.label}</div>
                      </div>
                      {existing && (
                        <span className="text-xs text-muted-foreground font-mono">
                          updated {new Date(existing.updatedAt).toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{meta.description}</p>
                    <div className="flex gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEdits({ ...edits, [key]: e.target.value })}
                        placeholder={meta.placeholder ?? 'Enter value...'}
                        className="font-mono text-xs"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSave(key)}
                        disabled={saving === key || edits[key] === undefined || edits[key] === existing?.value}
                      >
                        <Save className="h-3.5 w-3.5 mr-1" />
                        {saving === key ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Custom settings */}
          {customSettings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Custom settings ({customSettings.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {customSettings.map((s) => {
                  const editValue = edits[s.key] ?? s.value;
                  return (
                    <div key={s.id} className="space-y-1.5">
                      <div className="text-sm font-mono font-medium">{s.key}</div>
                      <div className="flex gap-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEdits({ ...edits, [s.key]: e.target.value })}
                          className="font-mono text-xs"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSave(s.key)}
                          disabled={saving === s.key || edits[s.key] === undefined || edits[s.key] === s.value}
                        >
                          <Save className="h-3.5 w-3.5 mr-1" />
                          {saving === s.key ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Add new */}
          <Card>
            <CardHeader>
              <CardTitle>Add custom setting</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-[1fr_2fr_auto] gap-2">
                <Input
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="key_name"
                  className="font-mono text-xs"
                />
                <Input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="value..."
                  className="font-mono text-xs"
                />
                <Button onClick={handleAddNew} disabled={!newKey.trim() || !newValue.trim()}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
