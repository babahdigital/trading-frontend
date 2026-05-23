'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/admin/page-header';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth/auth-context';

export default function AdminProfilePage() {
  const t = useTranslations('admin.profile');
  const { getAuthHeaders } = useAuth();
  const router = useRouter();

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');

    if (newPw.length < 8) {
      setError(t('error_min_length'));
      return;
    }
    if (newPw !== confirmPw) {
      setError(t('error_mismatch'));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/client/password', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === 'wrong_current_password') {
          setError(t('error_wrong_current'));
        } else if (data.code === 'same_as_old') {
          setError(t('error_same_as_old'));
        } else if (data.code === 'validation_failed') {
          setError(t('error_validation'));
        } else {
          setError(data.error || t('error_generic'));
        }
        return;
      }
      setMessage(t('success'));
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={t('title')}
        description={t('description')}
      />

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('change_password')}</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {t('change_password_note')}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-4 max-w-md">
            <div>
              <label htmlFor="current-pw" className="text-xs text-muted-foreground mb-1 block">
                {t('label_current')}
              </label>
              <Input
                id="current-pw"
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <div>
              <label htmlFor="new-pw" className="text-xs text-muted-foreground mb-1 block">
                {t('label_new')}
              </label>
              <Input
                id="new-pw"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div>
              <label htmlFor="confirm-pw" className="text-xs text-muted-foreground mb-1 block">
                {t('label_confirm')}
              </label>
              <Input
                id="confirm-pw"
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            {error && (
              <div className="text-sm text-rose-700 dark:text-rose-300 bg-rose-500/10 border border-rose-500/30 p-3 rounded-md" role="alert">
                {error}
              </div>
            )}
            {message && (
              <div className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-md" role="status">
                {message}
              </div>
            )}

            <Button type="submit" disabled={saving || !currentPw || !newPw || !confirmPw}>
              {saving ? t('btn_saving') : t('btn_save')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
