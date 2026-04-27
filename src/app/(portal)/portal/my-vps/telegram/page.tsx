'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { ArrowLeft, Bot, CheckCircle2, ExternalLink, MessageCircle, XCircle } from 'lucide-react';

interface Profile {
  telegramChatId?: string | null;
}

export default function MyVpsTelegramPage() {
  const t = useTranslations('portal.vps.telegram');
  const { getAuthHeaders } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/client/profile', { headers: getAuthHeaders() });
        if (res.status === 401) { window.location.href = '/login'; return; }
        if (res.ok) setProfile(await res.json());
      } catch { /* handled */ }
      finally { setLoading(false); }
    }
    fetchProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isConnected = !!profile?.telegramChatId;

  const NOTIF_TYPES = [
    { icon: '📈', titleKey: 'notif_open_title', descKey: 'notif_open_desc' },
    { icon: '📉', titleKey: 'notif_close_title', descKey: 'notif_close_desc' },
    { icon: '📊', titleKey: 'notif_daily_title', descKey: 'notif_daily_desc' },
    { icon: '⚠️', titleKey: 'notif_alert_title', descKey: 'notif_alert_desc' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/portal/my-vps">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> {t('back')}
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t('heading')}</h1>
          <p className="text-sm text-muted-foreground">{t('tagline')}</p>
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageCircle className="w-4 h-4" /> {t('connection_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">{t('loading')}</p>
          ) : (
            <div className="flex items-center gap-3">
              {isConnected ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-green-400">{t('connected')}</p>
                    <p className="text-xs text-muted-foreground">{t('chat_id_label', { value: profile?.telegramChatId ?? '' })}</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-sm font-medium text-red-400">{t('not_connected')}</p>
                    <p className="text-xs text-muted-foreground">{t('not_connected_hint')}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bot className="w-4 h-4" /> {t('setup_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Step number={1} title={t('step1_title')}>
              <p className="text-sm text-muted-foreground">
                {t('step1_body_pre')} <span className="font-mono font-medium text-foreground">@BabahAlgoBot</span> {t('step1_body_post')}
              </p>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <a href="https://t.me/BabahAlgoBot" target="_blank" rel="noopener noreferrer">
                  {t('step1_cta')} <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Button>
            </Step>

            <Step number={2} title={t('step2_title')}>
              <p className="text-sm text-muted-foreground">
                {t('step2_body_pre')} <span className="font-mono font-medium text-foreground">/start</span> {t('step2_body_post')}
              </p>
            </Step>

            <Step number={3} title={t('step3_title')}>
              <p className="text-sm text-muted-foreground">
                {t('step3_body')}
              </p>
            </Step>

            <Step number={4} title={t('step4_title')}>
              <p className="text-sm text-muted-foreground">
                {t('step4_body')}
              </p>
            </Step>
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('notif_types_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {NOTIF_TYPES.map((nt) => (
              <NotifType key={nt.titleKey} icon={nt.icon} title={t(nt.titleKey)} desc={t(nt.descKey)} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Link to Account */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">
              {t('account_link_text')}
            </p>
            <Link href="/portal/account">
              <Button variant="outline" size="sm">{t('account_link_cta')}</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex gap-4 p-4 rounded-lg border')}>
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <div>
        <p className="text-sm font-medium mb-1">{title}</p>
        {children}
      </div>
    </div>
  );
}

function NotifType({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border">
      <span className="text-lg">{icon}</span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
