'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';

interface UserData {
  name?: string;
  email?: string;
  role?: string;
  license_key?: string;
}

interface StatusData {
  license_status?: string;
  license_expiry?: string;
  license_key?: string;
}

export default function AccountPage() {
  const { getAuthHeaders } = useAuth();
  const [user, setUser] = useState<UserData | null>(null);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(stored);
    } catch {
      setUser({});
    }

    async function fetchStatus() {
      try {
        const res = await fetch('/api/client/status', { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Failed to fetch account status');
        const data = await res.json();
        setStatus(data);
        setError('');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Connection error');
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, []);

  function expiryCountdown() {
    const expiry = status?.license_expiry;
    if (!expiry) return null;
    const expiryTime = new Date(expiry).getTime();
    const now = Date.now();
    const diff = expiryTime - now;
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h remaining`;
  }

  const licenseKey = status?.license_key || user?.license_key;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Account</h1>

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="text-sm font-medium text-foreground">{user?.name || '-'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium text-foreground">{user?.email || '-'}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Role</span>
              <span className="text-sm font-medium text-foreground capitalize">
                {user?.role || '-'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* License Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">License</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading license info...</p>
            ) : (
              <>
                {licenseKey && (
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">License Key</span>
                    <span className="text-sm font-mono text-foreground">{licenseKey}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      status?.license_status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    )}
                  >
                    {status?.license_status || 'Unknown'}
                  </span>
                </div>
                {status?.license_expiry && (
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Expiry Date</span>
                    <span className="text-sm text-foreground">
                      {new Date(status.license_expiry).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {expiryCountdown() && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">Time Left</span>
                    <span
                      className={cn(
                        'text-sm font-medium',
                        expiryCountdown() === 'Expired' ? 'text-red-400' : 'text-green-400'
                      )}
                    >
                      {expiryCountdown()}
                    </span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Support Card */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Support</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Need help? Contact us at{' '}
              <a
                href="mailto:support@babahdigital.com"
                className="text-primary hover:underline"
              >
                support@babahdigital.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
