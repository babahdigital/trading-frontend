'use client';

import { AuthProvider } from '@/lib/auth/auth-context';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AuthProvider>
  );
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  // Sidebar fixed di kiri (lg+) dengan width 248px expanded atau 68px collapsed.
  // Main content shift via lg:pl-{248|68}; default 248 — collapsed handled lewat
  // localStorage di komponen sidebar (transition smooth). Pakai container internal
  // supaya max-width tetap respected dan padding konsisten.
  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="lg:pl-[248px] data-[sidebar-collapsed=true]:lg:pl-[68px] transition-[padding] duration-200">
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
