import { prisma } from '@/lib/db/prisma';
import { getPageMetadata } from '@/lib/seo';
import Link from 'next/link';
import { FaqClient } from './faq-client';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return getPageMetadata('/faq', {
    title: 'FAQ — BabahAlgo',
    description: 'Frequently asked questions about BabahAlgo trading platform',
  });
}

export default async function FaqPage() {
  let faqs: Array<{ id: string; question: string; answer: string; category: string }> = [];

  try {
    const raw = await prisma.faq.findMany({ where: { isVisible: true }, orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] });
    faqs = raw.map((f: { id: string; question: string; answer: string; category: string }) => ({ id: f.id, question: f.question, answer: f.answer, category: f.category }));
  } catch {}

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary">BabahAlgo</Link>
          <div className="flex items-center gap-4">
            <Link href="/features" className="text-sm text-muted-foreground hover:text-foreground">Features</Link>
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</Link>
            <Link href="/faq" className="text-sm text-foreground font-medium">FAQ</Link>
            <Link href="/login" className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground">Login</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-lg text-muted-foreground">Everything you need to know about BabahAlgo</p>
        </div>
        <FaqClient faqs={faqs} />
      </main>
    </div>
  );
}
