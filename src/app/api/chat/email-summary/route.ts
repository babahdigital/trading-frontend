/**
 * POST /api/chat/email-summary — kirim ringkasan chat session ke email user
 * setelah dia CLOSE chat (Pak Abdullah directive 2026-05-22).
 *
 * Body:
 *   {
 *     messages: Array<{ role: 'user' | 'assistant', content: string }>,
 *     email?: string,    // optional kalau user login (resolve dari cookie)
 *     name?: string,
 *     locale?: 'id' | 'en'
 *   }
 *
 * Behavior:
 *   - Resolve user identity:
 *       1. JWT cookie → user.email dari DB (highest priority)
 *       2. ChatLead localStorage payload → email dari body
 *       3. Kalau tidak ada email → 200 OK { ok: false, reason: 'no_email' }
 *          supaya FE tidak block close flow.
 *   - Generate concise summary via Gemini 3.1 Flash Lite (DEFAULT_MODEL).
 *   - Send via Brevo SMTP/API (sendEmail helper) dengan template inline.
 *
 * Fail-soft: error tidak block close flow di FE.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/db/prisma';
import { sendEmail } from '@/lib/notifier/email';
import { DEFAULT_MODEL } from '@/lib/ai/openrouter';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/chat/email-summary');
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  email?: string;
  name?: string;
  locale?: 'id' | 'en';
}

const COPY = {
  id: {
    subject: 'Ringkasan obrolan Anda dengan Babah — BabahAlgo',
    greeting: 'Halo',
    intro: 'Terima kasih sudah berbincang dengan Babah AI Assistant. Berikut ringkasan sesi obrolan Anda:',
    cta: 'Lanjutkan obrolan',
    footer: 'Email ini dikirim otomatis dari sesi chat Anda di babahalgo.com.',
    summary_label: 'Ringkasan',
    transcript_label: 'Transkrip Lengkap',
    you: 'Anda',
    babah: 'Babah',
  },
  en: {
    subject: 'Your chat summary with Babah — BabahAlgo',
    greeting: 'Hello',
    intro: 'Thank you for chatting with Babah AI Assistant. Here is a summary of your conversation:',
    cta: 'Continue chatting',
    footer: 'This email was sent automatically from your chat session on babahalgo.com.',
    summary_label: 'Summary',
    transcript_label: 'Full Transcript',
    you: 'You',
    babah: 'Babah',
  },
};

async function resolveUserEmail(req: NextRequest, fallbackEmail?: string): Promise<{ email: string | null; name: string | null }> {
  // 1) Try JWT cookie
  try {
    const token = req.cookies.get('access_token')?.value;
    if (token) {
      const { payload } = await jwtVerify(token, secret);
      const userId = payload.sub as string | undefined;
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true },
        });
        if (user?.email) return { email: user.email, name: user.name ?? null };
      }
    }
  } catch {
    /* invalid token — fall through */
  }
  // 2) Fallback body email (chat lead capture)
  if (fallbackEmail && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fallbackEmail)) {
    return { email: fallbackEmail, name: null };
  }
  return { email: null, name: null };
}

async function generateSummary(messages: ChatMessage[], locale: 'id' | 'en'): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return '';

  const transcript = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Babah'}: ${m.content}`)
    .join('\n');

  const prompt = locale === 'id'
    ? `Ringkas obrolan berikut dalam 3-5 bullet poin (max 80 kata), bahasa Indonesia natural. Fokus ke topik utama, pertanyaan user, dan jawaban kunci. Hilangkan basa-basi.\n\n${transcript}`
    : `Summarize this chat in 3-5 bullet points (max 80 words), natural English. Focus on main topics, user questions, and key answers. Skip pleasantries.\n\n${transcript}`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://babahalgo.com',
        'X-Title': 'BabahAlgo Chat Summary',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 250,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return '';
    const body = await res.json();
    return body.choices?.[0]?.message?.content?.toString().trim() ?? '';
  } catch {
    return '';
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildTranscriptHtml(messages: ChatMessage[], locale: 'id' | 'en'): string {
  const copy = COPY[locale];
  return messages
    .map((m) => {
      const label = m.role === 'user' ? copy.you : copy.babah;
      const bgColor = m.role === 'user' ? '#fef3c7' : '#f1f5f9';
      const labelColor = m.role === 'user' ? '#92400e' : '#475569';
      return `<div style="margin:8px 0;padding:10px 14px;background:${bgColor};border-radius:8px;">
        <div style="font-size:11px;font-weight:600;color:${labelColor};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">${label}</div>
        <div style="font-size:14px;color:#1f2937;line-height:1.5;white-space:pre-wrap;">${escapeHtml(m.content)}</div>
      </div>`;
    })
    .join('');
}

function buildEmail(
  summary: string,
  messages: ChatMessage[],
  name: string | null,
  locale: 'id' | 'en',
): string {
  const copy = COPY[locale];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://babahalgo.com';
  const transcript = buildTranscriptHtml(messages, locale);
  // Simple bullet list dari AI summary
  const summaryHtml = summary
    ? `<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:8px;padding:14px 18px;margin:16px 0;">
        <div style="font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">${copy.summary_label}</div>
        <div style="font-size:14px;color:#1f2937;line-height:1.6;white-space:pre-wrap;">${escapeHtml(summary)}</div>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(copy.subject)}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:12px;padding:28px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
      <div style="text-align:center;margin-bottom:20px;">
        <div style="display:inline-block;width:48px;height:48px;background:linear-gradient(135deg,#f59e0b,#fbbf24);border-radius:12px;line-height:48px;font-size:24px;">💬</div>
      </div>
      <h1 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 4px;text-align:center;">${escapeHtml(copy.subject)}</h1>
      <p style="font-size:14px;color:#475569;margin:8px 0 16px;text-align:center;">
        ${copy.greeting}${name ? ` ${escapeHtml(name)}` : ''}, ${copy.intro.toLowerCase()}
      </p>
      ${summaryHtml}
      <div style="margin:24px 0 8px;">
        <div style="font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">${copy.transcript_label}</div>
        ${transcript}
      </div>
      <div style="text-align:center;margin-top:24px;">
        <a href="${baseUrl}/${locale === 'en' ? 'en' : 'id'}" style="display:inline-block;padding:10px 20px;background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#451a03;font-weight:600;font-size:14px;border-radius:8px;text-decoration:none;">${copy.cta} →</a>
      </div>
    </div>
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:16px;line-height:1.5;">
      ${copy.footer}<br/>
      <a href="${baseUrl}/legal/privacy" style="color:#94a3b8;">Privacy</a> · CV Babah Digital · Indonesia
    </p>
  </div>
</body></html>`;
}

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_json' }, { status: 400 });
  }

  const { messages, email: fallbackEmail, locale = 'id' } = body;
  if (!Array.isArray(messages) || messages.length < 2) {
    // Minimum 2 messages (1 user + 1 assistant) untuk worth-summarizing
    return NextResponse.json({ ok: false, reason: 'too_short' });
  }

  const { email, name } = await resolveUserEmail(req, fallbackEmail);
  if (!email) {
    return NextResponse.json({ ok: false, reason: 'no_email' });
  }

  // Sanitize messages — content max 2000 char each, max 30 messages total
  const cleanMessages = messages.slice(-30).map((m) => ({
    role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
    content: String(m.content ?? '').slice(0, 2000),
  })).filter((m) => m.content.length > 0);

  if (cleanMessages.length < 2) {
    return NextResponse.json({ ok: false, reason: 'too_short' });
  }

  const summary = await generateSummary(cleanMessages, locale === 'en' ? 'en' : 'id');
  const html = buildEmail(summary, cleanMessages, name, locale === 'en' ? 'en' : 'id');
  const copy = COPY[locale === 'en' ? 'en' : 'id'];

  try {
    await sendEmail(email, copy.subject, html);
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.warn(`Send failed: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ ok: false, reason: 'send_failed' });
  }
}
