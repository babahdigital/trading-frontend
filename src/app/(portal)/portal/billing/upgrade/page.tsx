import type { Metadata } from 'next';

import { UpgradePanel } from '@/components/portal/billing/upgrade-panel';

export const metadata: Metadata = {
  title: 'Upgrade Plan — Portal',
  robots: { index: false, follow: false },
};

export default function PortalUpgradePage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <UpgradePanel />
    </div>
  );
}
