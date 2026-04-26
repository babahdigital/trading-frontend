const createNextIntlPlugin = require('next-intl/plugin');
const { withSentryConfig } = require('@sentry/nextjs');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [
      // Article cover images yang di-upload via admin CMS atau dari external host
      { protocol: 'https', hostname: 'babahalgo.com' },
      { protocol: 'https', hostname: 'cdn.babahalgo.com' },
      // AI image generators (Pollinations.ai sering dipakai untuk article images)
      { protocol: 'https', hostname: 'image.pollinations.ai' },
      // Default Cloudflare Image Optimization passthrough
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '**.cloudflare-ipfs.com' },
    ],
    // Buffer size limit untuk avoid OOM dari oversize uploads
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
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
