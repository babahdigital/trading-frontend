import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { ChatWidget } from '@/components/chat/chat-widget';
import './globals.css';

export const metadata: Metadata = {
  title: 'BabahAlgo — Quantitative Trading Infrastructure',
  description: 'Institutional-grade quantitative trading infrastructure. AI-powered strategies, systematic execution, institutional risk management.',
  icons: {
    icon: '/logo/babahalgo-B-darkbg-clean.png',
    apple: '/logo/babahalgo-B-darkbg-clean.png',
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
