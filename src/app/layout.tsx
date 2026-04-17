import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { ChatWidget } from '@/components/chat/chat-widget';
import './globals.css';

export const metadata: Metadata = {
  title: 'BabahAlgo — Quantitative Trading Infrastructure',
  description: 'Institutional-grade quantitative trading infrastructure. AI-powered strategies, systematic execution, institutional risk management.',
  icons: {
    icon: [
      { url: '/logo/babahalgo-favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/logo/babahalgo-icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo/babahalgo-icon-64.png', sizes: '64x64', type: 'image/png' },
    ],
    apple: { url: '/logo/babahalgo-icon-256.png', sizes: '256x256', type: 'image/png' },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html lang={locale} className="dark">
      <body className="font-body">
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
