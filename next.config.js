const createNextIntlPlugin = require('next-intl/plugin');
const { withSentryConfig } = require('@sentry/nextjs');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
  },
  async redirects() {
    return [
      // Locale-prefixed auth/admin/portal routes redirect to root
      // (these surfaces are locale-agnostic — they read locale from cookie/UI).
      { source: '/en/login', destination: '/login', permanent: false },
      { source: '/id/login', destination: '/login', permanent: false },
      { source: '/en/admin/:path*', destination: '/admin/:path*', permanent: false },
      { source: '/id/admin/:path*', destination: '/admin/:path*', permanent: false },
      { source: '/en/portal/:path*', destination: '/portal/:path*', permanent: false },
      { source: '/id/portal/:path*', destination: '/portal/:path*', permanent: false },
    ];
  },
};

const withIntl = withNextIntl(nextConfig);

// Wrap with Sentry only if DSN is configured
module.exports = process.env.SENTRY_DSN
  ? withSentryConfig(withIntl, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
    })
  : withIntl;
