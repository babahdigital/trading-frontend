import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { getLocale } from 'next-intl/server';
import { ChatWidget } from '@/components/chat/chat-widget';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BabahAlgo — Autonomous Intelligence. Institutional Precision.',
  description: 'AI-Powered Quantitative Trading Platform by BabahAlgo',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html lang={locale} className="dark">
      <body className={inter.className}>
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
