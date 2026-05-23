'use client';

/* eslint-disable @next/next/no-html-link-for-pages -- global-error renders
   outside the root layout, so Next.js <Link> (which depends on router
   context from the layout) is unavailable. Raw <a> tags are intentional. */

import { useEffect, useState } from 'react';

/**
 * Global error boundary — catches errors in the ROOT layout itself.
 * Must include its own <html> and <body> tags since the root layout errored.
 * Minimal implementation: no imports from layout components (BrandLogo, etc.)
 * because the layout that provides them is the one that broke.
 */
function readClientLocale(): 'id' | 'en' {
  if (typeof document === 'undefined') return 'id';
  const m = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=(id|en)/);
  if (m) return m[1] as 'id' | 'en';
  const lang = navigator.language?.toLowerCase() ?? '';
  if (lang.startsWith('id')) return 'id';
  if (lang.startsWith('en')) return 'en';
  return 'id';
}

const COPY = {
  id: {
    title: 'Terjadi Kesalahan Sistem',
    body: 'Aplikasi mengalami gangguan kritis. Tim kami otomatis mendapat notifikasi dan sedang menangani masalah ini.',
    error_id_label: 'Error ID',
    cta_retry: 'Coba Lagi',
    cta_home: 'Kembali ke Beranda',
    support_pre: 'Hubungi',
    support_link: 'tim teknis',
    support_post: 'jika masalah berlanjut.',
  },
  en: {
    title: 'System Error',
    body: 'The application encountered a critical issue. Our team has been automatically notified and is working to resolve it.',
    error_id_label: 'Error ID',
    cta_retry: 'Try Again',
    cta_home: 'Back to Home',
    support_pre: 'Contact',
    support_link: 'technical support',
    support_post: 'if the issue persists.',
  },
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<'id' | 'en'>('id');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocale(readClientLocale());
    if (process.env.NODE_ENV !== 'production') {
      console.error('[global-error]', error);
    }
  }, [error]);

  const copy = COPY[locale];

  return (
    <html lang={locale} className="dark">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          textAlign: 'center',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          backgroundColor: '#09090b',
          color: '#fafafa',
        }}
      >
        {/* AlertOctagon icon — inline SVG to avoid any external dependency */}
        <div
          style={{
            display: 'inline-flex',
            height: 80,
            width: 80,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            marginBottom: 24,
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fb7185"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1
          style={{
            fontSize: '1.875rem',
            fontWeight: 700,
            letterSpacing: '-0.025em',
            marginBottom: 12,
            marginTop: 0,
          }}
        >
          {copy.title}
        </h1>

        <p
          style={{
            color: '#a1a1aa',
            maxWidth: 448,
            lineHeight: 1.6,
            marginBottom: error.digest ? 8 : 32,
            marginTop: 0,
          }}
        >
          {copy.body}
        </p>

        {error.digest && (
          <p
            style={{
              fontSize: 11,
              color: 'rgba(161, 161, 170, 0.7)',
              fontFamily: 'monospace',
              marginBottom: 32,
              marginTop: 0,
            }}
          >
            {copy.error_id_label}: {error.digest}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={reset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 20px',
              borderRadius: 6,
              backgroundColor: '#2563eb',
              color: '#fff',
              fontWeight: 500,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 4v6h6" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            {copy.cta_retry}
          </button>

          <a
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 20px',
              borderRadius: 6,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fafafa',
              fontWeight: 500,
              fontSize: 14,
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
              backgroundColor: 'transparent',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            {copy.cta_home}
          </a>
        </div>

        <p
          style={{
            fontSize: 12,
            color: 'rgba(161, 161, 170, 0.6)',
            marginTop: 48,
          }}
        >
          {copy.support_pre}{' '}
          <a
            href="/contact"
            style={{ color: '#fbbf24', textDecoration: 'none' }}
            onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            {copy.support_link}
          </a>{' '}
          {copy.support_post}
        </p>
      </body>
    </html>
  );
}
