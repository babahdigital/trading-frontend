'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ProfileTab } from './tabs/profile';
import { TwoFaTab } from './tabs/two-fa';
import { NotificationsTab } from './tabs/notifications';
import { BillingTab } from './tabs/billing';

const TABS = [
  { id: 'profile', label: 'Profil' },
  { id: 'security', label: 'Keamanan (2FA)' },
  { id: 'notifications', label: 'Notifikasi' },
  { id: 'billing', label: 'Billing & Invoice' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function AccountPage() {
  const [tab, setTab] = useState<TabId>('profile');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Account</h1>
        <p className="text-sm text-muted-foreground mt-1">Kelola profil, keamanan, notifikasi, dan billing Anda.</p>
      </div>

      <div role="tablist" aria-label="Account sections" className="border-b border-border overflow-x-auto">
        <div className="flex min-w-max gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              id={`tab-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-2 text-sm transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60',
                tab === t.id
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
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
