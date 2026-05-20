/**
 * NotificationBellCount — small badge yang tampil pas Bell icon di nav sidebar.
 * Self-fetching via useUnreadNotifications. Hide saat count == 0.
 */
'use client';

import { useUnreadNotifications } from '@/lib/hooks/use-unread-notifications';

export function NotificationBellCount() {
  const { count } = useUnreadNotifications();
  if (count === 0) return null;
  const display = count > 99 ? '99+' : String(count);
  return (
    <span
      aria-label={`${count} notifikasi baru`}
      className="ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-semibold bg-rose-500 text-rose-50 tabular-nums shadow-sm"
    >
      {display}
    </span>
  );
}
