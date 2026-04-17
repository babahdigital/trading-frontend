'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'admin' | 'license'>('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [mt5Account, setMt5Account] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const body = mode === 'admin'
        ? { email, password }
        : { licenseKey, mt5Account, password };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      localStorage.setItem('access_token', data.accessToken);
      localStorage.setItem('refresh_token', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      document.cookie = `access_token=${data.accessToken}; path=/; max-age=${15 * 60}; SameSite=Lax`;

      if (data.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/portal');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-5">
      {/* Left — Form (60%) */}
      <div className="col-span-3 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12">
        <div className="w-full max-w-md mx-auto lg:mx-0">
          {/* Logo */}
          <Image
            src="/logo/babahalgo-horizontal-inverse.png"
            alt="BabahAlgo"
            width={140}
            height={28}
            className="h-7 w-auto mb-12 hidden dark:block"
          />
          <Image
            src="/logo/babahalgo-horizontal-dual.png"
            alt="BabahAlgo"
            width={140}
            height={28}
            className="h-7 w-auto mb-12 dark:hidden"
          />

          <h1 className="t-display-sub mb-2">Welcome back.</h1>
          <p className="t-body text-foreground/60 mb-10">Sign in to continue.</p>

          {/* Mode toggle */}
          <div className="tab-bar mb-8">
            <button
              type="button"
              onClick={() => setMode('admin')}
              className={`tab-btn ${mode === 'admin' ? 'active' : ''}`}
            >
              Admin / PAMM
            </button>
            <button
              type="button"
              onClick={() => setMode('license')}
              className={`tab-btn ${mode === 'license' ? 'active' : ''}`}
            >
              License Key
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'admin' ? (
              <div>
                <label className="t-eyebrow mb-2 block">Email</label>
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="font-mono"
                  required
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="t-eyebrow mb-2 block">License Key</label>
                  <Input
                    placeholder="TRAD-XXXX-XXXX-XXXX-XXXX"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    className="font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="t-eyebrow mb-2 block">MT5 Account</label>
                  <Input
                    placeholder="12345678"
                    value={mt5Account}
                    onChange={(e) => setMt5Account(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </>
            )}

            <div>
              <label className="t-eyebrow mb-2 block">Password</label>
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="btn-primary w-full h-12 text-sm font-medium" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <a href="/contact" className="text-foreground/50 hover:text-amber-400 transition-colors">
                Forgot password?
              </a>
              <a href="/contact" className="text-foreground/50 hover:text-amber-400 transition-colors">
                Need access? Contact us
              </a>
            </div>
          </form>
        </div>
      </div>

      {/* Right — Editorial panel (40%) */}
      <div
        className="hidden lg:flex col-span-2 flex-col justify-center items-center px-12 relative"
        style={{ background: 'var(--brand-midnight)' }}
      >
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }} />

        <div className="relative max-w-sm text-center">
          <div className="w-12 h-px bg-amber-500/40 mx-auto mb-8" />
          <blockquote className="font-display text-[28px] leading-snug italic text-foreground/80 mb-8">
            &ldquo;Discipline isn&rsquo;t a strategy. It&rsquo;s the substrate every strategy must run on.&rdquo;
          </blockquote>
          <p className="t-body-sm text-foreground/40 tracking-wide">
            From the BabahAlgo manifesto
          </p>
          <div className="w-12 h-px bg-amber-500/40 mx-auto mt-8" />
        </div>
      </div>
    </div>
  );
}
