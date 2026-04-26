import type { Metadata } from 'next';
import { getLocale, getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { ChatWidget } from '@/components/chat/chat-widget';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'BabahAlgo — Quantitative Trading Infrastructure',
  description: 'Institutional-grade quantitative trading infrastructure. AI-powered strategies, systematic execution, institutional risk management.',
  icons: {
    icon: [
      { url: '/logo/babahalgo-favicon-new.png', type: 'image/png' },
    ],
    apple: { url: '/logo/babahalgo-favicon-new.png', type: 'image/png' },
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'BabahAlgo',
  legalName: 'CV Babah Digital',
  url: 'https://babahalgo.com',
  logo: 'https://babahalgo.com/logo/babahalgo-icon-256.png',
  description: 'Institutional-grade quantitative trading infrastructure powered by AI.',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'ID',
  },
  contactPoint: [
    {
      '@type': 'ContactPoint',
      email: 'hello@babahalgo.com',
      contactType: 'customer service',
    },
    {
      '@type': 'ContactPoint',
      email: 'ir@babahalgo.com',
      contactType: 'institutional inquiries',
    },
  ],
  sameAs: [
    'https://t.me/babahalgo',
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-body">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <ToastProvider>
              <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-amber-500 focus:text-black focus:px-4 focus:py-2 focus:rounded-md focus:text-sm">
                Skip to main content
              </a>
              {children}
              <ChatWidget />
            </ToastProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
