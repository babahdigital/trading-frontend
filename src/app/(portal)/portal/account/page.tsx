'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { ProfileTab } from './tabs/profile';
import { TwoFaTab } from './tabs/two-fa';
import { NotificationsTab } from './tabs/notifications';
import { BillingTab } from './tabs/billing';

const TABS = [
  { id: 'profile', labelKey: 'tab_profile' },
  { id: 'security', labelKey: 'tab_security' },
  { id: 'notifications', labelKey: 'tab_notifications' },
  { id: 'billing', labelKey: 'tab_billing' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function AccountPage() {
  const t = useTranslations('portal.account');
  const [tab, setTab] = useState<TabId>('profile');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      <div role="tablist" aria-label={t('tablist_aria')} className="border-b border-border overflow-x-auto">
        <div className="flex min-w-max gap-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={tab === item.id}
              aria-controls={`panel-${item.id}`}
              id={`tab-${item.id}`}
              tabIndex={tab === item.id ? 0 : -1}
              onClick={() => setTab(item.id)}
              className={cn(
                'px-4 py-2 text-sm transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60',
                tab === item.id
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <section role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'profile' && <ProfileTab />}
        {tab === 'security' && <TwoFaTab />}
        {tab === 'notifications' && <NotificationsTab />}
        {tab === 'billing' && <BillingTab />}
      </section>
    </div>
  );
}
