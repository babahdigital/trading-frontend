'use client';

import { useState, useRef, useEffect, useCallback, useMemo, type FormEvent } from 'react';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from 'next-intl';
import {
  MessageCircle, X, Send, Bot, User as UserIcon, AlertTriangle, RotateCcw, ArrowDown,
  Sparkles, ShieldCheck,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ChatLeadForm } from './chat-lead-form';

const LEAD_STORAGE_KEY = 'babah.chat.lead';

interface QuickReply {
  label: string;
  message: string;
}

interface CopyBundle {
  title: string;
  subtitle: string;
  status_online: string;
  status_offline: string;
  greeting: string;
  placeholder: string;
  send_aria: string;
  close_aria: string;
  open_aria: string;
  scroll_to_latest: string;
  retry: string;
  footer: string;
  error_generic: string;
  unavailable_title: string;
  unavailable_desc: string;
  rate_limit_title: string;
  rate_limit_desc: string;
  contact_link: string;
  quick_replies: QuickReply[];
}

const COPY: Record<'id' | 'en', CopyBundle> = {
  id: {
    title: 'Babah AI',
    subtitle: 'Asisten institusional · Forex & Crypto',
    status_online: 'Online',
    status_offline: 'Offline',
    greeting:
      'Halo! Saya Babah — asisten AI BabahAlgo. Saya bisa bantu jelaskan layanan Robot Meta (Forex MT5), Robot Crypto (Binance), pricing tier, konsep SMC/Wyckoff, kerangka risiko institusional (vol-target + 6-layer exit + multi-stage kill-switch), atau alur onboarding KYC. Ada yang ingin ditanyakan?',
    placeholder: 'Tulis pertanyaan…',
    send_aria: 'Kirim pesan',
    close_aria: 'Tutup chat',
    open_aria: 'Buka asisten Babah AI',
    scroll_to_latest: 'Pesan terbaru',
    retry: 'Coba lagi',
    footer: 'Powered by BabahAlgo AI · Bukan saran investasi',
    error_generic: 'Maaf, terjadi gangguan. Silakan coba lagi.',
    unavailable_title: 'Asisten Sedang Tidak Tersedia',
    unavailable_desc:
      'Asisten AI sementara tidak bisa diakses. Tim kami siap membantu Anda secara langsung.',
    rate_limit_title: 'Terlalu banyak pesan',
    rate_limit_desc: 'Tunggu sebentar lalu kirim pesan lagi (maksimal 20 pesan per menit).',
    contact_link: 'Hubungi tim kami →',
    quick_replies: [
      { label: 'Harga Paket', message: 'Berapa harga paket Robot Meta dan Robot Crypto?' },
      { label: 'SMC vs Wyckoff', message: 'Apa beda strategi SMC dengan Wyckoff di Robot Meta?' },
      { label: 'Crypto Bot', message: 'Bagaimana cara kerja Robot Crypto Binance? Modal saya tetap aman?' },
      { label: 'Kerangka Risiko', message: 'Jelaskan kerangka risiko Robot Meta: vol-target sizing, 6-layer exit engine, multi-stage kill-switch (NORMAL → fast 1h → PROBATION → NORMAL).' },
      { label: 'Cara Daftar', message: 'Bagaimana cara mendaftar dan onboarding KYC?' },
    ],
  },
  en: {
    title: 'Babah AI',
    subtitle: 'Institutional concierge · Forex & Crypto',
    status_online: 'Online',
    status_offline: 'Offline',
    greeting:
      "Hi! I'm Babah — BabahAlgo's AI assistant. I can walk you through Robot Meta (Forex MT5), Robot Crypto (Binance), pricing tiers, SMC/Wyckoff concepts, the institutional risk framework (vol-target sizing + 6-layer exit + multi-stage kill-switch), or our KYC onboarding flow. What would you like to know?",
    placeholder: 'Type a question…',
    send_aria: 'Send message',
    close_aria: 'Close chat',
    open_aria: 'Open Babah AI assistant',
    scroll_to_latest: 'Latest',
    retry: 'Retry',
    footer: 'Powered by BabahAlgo AI · Not investment advice',
    error_generic: 'Sorry, something went wrong. Please try again.',
    unavailable_title: 'Assistant Unavailable',
    unavailable_desc: 'The AI assistant is temporarily unreachable. Our team is ready to help you directly.',
    rate_limit_title: 'Too many messages',
    rate_limit_desc: 'Please wait a moment before sending another message (max 20 messages per minute).',
    contact_link: 'Contact our team →',
    quick_replies: [
      { label: 'Pricing', message: 'What are the prices for Robot Meta and Robot Crypto?' },
      { label: 'SMC vs Wyckoff', message: 'How do SMC and Wyckoff strategies differ inside Robot Meta?' },
      { label: 'Crypto Bot', message: 'How does the Binance Crypto Bot work? Does my capital stay safe?' },
      { label: 'Risk Framework', message: "Explain Robot Meta's risk framework: vol-target sizing, 6-layer exit engine, multi-stage kill-switch (NORMAL → fast 1h → PROBATION → NORMAL)." },
      { label: 'Get Started', message: 'How do I sign up and complete KYC?' },
    ],
  },
};

function getTextContent(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

const SCROLL_THRESHOLD_PX = 80;

export function ChatWidget() {
  const pathname = usePathname();
  const locale = useLocale() as 'id' | 'en';
  const copy = COPY[locale === 'id' ? 'id' : 'en'];

  const [isOpen, setIsOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [input, setInput] = useState('');
  const [showJumpButton, setShowJumpButton] = useState(false);
  // Lead gate: true = sudah submit nama/email/telpon (atau logged-in).
  // Initial null = belum hydrate dari localStorage; render skeleton supaya
  // tidak flash form ke user yang sudah pernah submit.
  const [leadCleared, setLeadCleared] = useState<boolean | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lockedScrollY = useRef(0);

  const initialMessages = useMemo<UIMessage[]>(
    () => [
      {
        id: 'greeting',
        role: 'assistant',
        parts: [{ type: 'text', text: copy.greeting }],
      },
    ],
    [copy.greeting],
  );

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: '/api/chat',
      // Auto-attach AbortSignal supaya request hang lebih dari 45s otomatis
      // di-abort — mencegah UI stuck di "loading" tanpa feedback.
      fetch: (input, init) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(new Error('chat_timeout')), 45_000);
        return fetch(input, {
          ...init,
          signal: init?.signal ?? controller.signal,
        }).finally(() => clearTimeout(timeoutId));
      },
    }),
    [],
  );

  const { messages, sendMessage, status, error, setMessages } = useChat({
    messages: initialMessages,
    transport,
    onError: (err) => {
      // Surface actual error context ke browser console untuk debugging real
      // user issue. Pesan generic di UI tetap, tapi developer/operator yang
      // dipanggil customer bisa tanya "buka DevTools, kirim screenshot
      // console" — dan dapat root cause langsung.
      console.error('[chat] error:', err);
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    if (messages.length <= 1) {
      setMessages(initialMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const isNearBottom = useCallback((): boolean => {
    const c = messagesContainerRef.current;
    if (!c) return true;
    return c.scrollHeight - c.scrollTop - c.clientHeight < SCROLL_THRESHOLD_PX;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    setShowJumpButton(false);
  }, []);

  // Track total characters of last assistant message — fires effect on every
  // streaming chunk, not just when message array length changes. Tanpa ini
  // scroll cuma fire saat pesan baru ditambahkan, bukan saat token mengalir.
  const streamingFingerprint = useMemo(() => {
    if (messages.length === 0) return '';
    const last = messages[messages.length - 1];
    return `${messages.length}:${last.id}:${getTextContent(last).length}`;
  }, [messages]);

  // Auto-scroll: force scroll on EVERY new message + every streaming chunk.
  // Per user spec: zero-touch UX, jangan biarkan user kebingungan ke mana
  // jawaban AI muncul. Smooth scroll saat baru, instant saat streaming
  // supaya tidak laggy di chunk per chunk.
  useEffect(() => {
    if (!isOpen) return;
    if (!streamingFingerprint) return;
    const behavior: ScrollBehavior = isLoading ? 'auto' : 'smooth';
    scrollToBottom(behavior);
  }, [streamingFingerprint, isOpen, isLoading, scrollToBottom]);

  useEffect(() => {
    const c = messagesContainerRef.current;
    if (!c || !isOpen) return;
    // Jump button hanya muncul kalau user manual scroll up DAN AI sedang
    // tidak streaming (kalau streaming, kita force scroll terus jadi user
    // tidak akan jauh dari bottom).
    const onScroll = () => {
      if (isLoading) return;
      setShowJumpButton(!isNearBottom() && messages.length > 1);
    };
    c.addEventListener('scroll', onScroll, { passive: true });
    return () => c.removeEventListener('scroll', onScroll);
  }, [isOpen, isNearBottom, messages.length, isLoading]);

  useEffect(() => {
    if (!isOpen && messages.length > 1 && messages[messages.length - 1].role === 'assistant') {
      setHasNewMessage(true);
    }
  }, [messages, isOpen]);

  // iOS-safe body scroll lock when chat is fullscreen on mobile
  useEffect(() => {
    if (!isOpen) return;
    if (typeof window === 'undefined') return;
    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    if (!isMobile) return;
    lockedScrollY.current = window.scrollY;
    const body = document.body;
    body.style.position = 'fixed';
    body.style.top = `-${lockedScrollY.current}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    return () => {
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
      window.scrollTo(0, lockedScrollY.current);
    };
  }, [isOpen]);

  // Auto-focus input on open (after animation lands)
  useEffect(() => {
    if (!isOpen) return;
    if (leadCleared !== true) return;
    const t = setTimeout(() => inputRef.current?.focus(), 220);
    return () => clearTimeout(t);
  }, [isOpen, leadCleared]);

  // Hydrate lead-cleared status. Logged-in user (cookie session) di-bypass:
  // /api/chat/lead/status return { authenticated: true } → skip gate.
  // Otherwise: cek localStorage, kalau ada record < 30 hari, anggap cleared.
  useEffect(() => {
    if (!isOpen) return;
    if (leadCleared !== null) return;
    let cancelled = false;
    (async () => {
      // Fast path — localStorage record (anonymous lead di mesin yang sama)
      try {
        const raw = localStorage.getItem(LEAD_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { id?: string; email?: string; createdAt?: number };
          const age = Date.now() - (parsed.createdAt ?? 0);
          if (parsed.email && age < 30 * 24 * 60 * 60 * 1000) {
            if (!cancelled) setLeadCleared(true);
            return;
          }
        }
      } catch {
        // localStorage may be disabled — fall through to auth probe
      }
      // Auth probe: kalau session valid, skip gate
      try {
        const res = await fetch('/api/chat/lead/status', { credentials: 'include' });
        if (res.ok) {
          const data = (await res.json().catch(() => null)) as { authenticated?: boolean } | null;
          if (!cancelled) setLeadCleared(Boolean(data?.authenticated));
          return;
        }
      } catch {
        // network error — render gate
      }
      if (!cancelled) setLeadCleared(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, leadCleared]);

  // Hide on admin paths
  if (pathname.startsWith('/admin')) return null;

  const handleOpen = () => {
    setIsOpen(true);
    setHasNewMessage(false);
  };

  const sendWithLocale = (text: string) => {
    if (!text.trim()) return;
    sendMessage({ text }, { body: { locale } });
  };

  const handleQuickReply = (qr: QuickReply) => {
    sendWithLocale(qr.message);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendWithLocale(input);
    setInput('');
  };

  const handleRetry = () => {
    if (messages.length === 0) return;
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    const text = getTextContent(lastUser);
    if (text) sendWithLocale(text);
  };

  const errorText = error?.message ?? '';
  const isServiceDown = /503|unavailable|unreachable|tidak tersedia|tidak bisa diakses|ai_unconfigured|chat_timeout/i.test(errorText);
  const isRateLimited = /429|rate.?limit|too many/i.test(errorText);

  return (
    <>
      {/* Bubble button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpen}
            aria-label={copy.open_aria}
            className={cn(
              // z-[100]: harus di ATAS sticky nav (z-80) dan portal mobile menu (z-90)
              'fixed z-[100] inline-flex items-center justify-center',
              'bottom-[max(env(safe-area-inset-bottom),1rem)] right-4 sm:bottom-6 sm:right-6',
              'h-14 w-14 rounded-full bg-primary text-primary-foreground',
              'shadow-lg shadow-amber-500/25',
              'hover:shadow-[0_0_28px_-4px_hsl(var(--primary)/0.55)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'transition-shadow',
            )}
          >
            <MessageCircle className="h-6 w-6" strokeWidth={2.25} />
            {hasNewMessage && (
              <span
                aria-label="new message"
                className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-[hsl(var(--destructive))] border-2 border-background"
              />
            )}
            <Sparkles
              className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 text-amber-300 animate-pulse opacity-80"
              strokeWidth={2.25}
              aria-hidden
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={copy.title}
            className={cn(
              // z-[100]: panel chat harus selalu di atas nav (z-80) dan
              // portal mobile menu (z-90) — kalau lebih rendah, panel tampak
              // ke-clip atau hilang di belakang nav
              'fixed z-[100] flex flex-col overflow-hidden border border-border bg-card shadow-2xl',
              // Mobile: full-screen + safe-area aware (notch / status bar)
              'inset-0 rounded-none',
              // Tablet+: floating panel
              'sm:inset-auto sm:bottom-6 sm:right-6 sm:left-auto sm:top-auto',
              'sm:w-[420px] sm:h-[calc(100dvh-3rem)] sm:max-h-[640px] sm:rounded-2xl',
              // Desktop: pin width slightly larger
              'lg:w-[440px]',
            )}
            style={{
              // iOS safe-area: jangan tertutup notch / status bar
              paddingTop: 'env(safe-area-inset-top)',
            }}
          >
            {/* Header — sticky di top dengan close button yang besar & kontras */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card shrink-0 relative z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                  <Bot className="h-5 w-5 text-[hsl(var(--primary))]" strokeWidth={2.25} />
                  <span
                    aria-hidden
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card',
                      isServiceDown ? 'bg-amber-500' : 'bg-[hsl(var(--profit))]',
                    )}
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{copy.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-[hsl(var(--profit))]" strokeWidth={2.25} aria-hidden />
                    <span className="truncate">{copy.subtitle}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={cn(
                  // Close button harus selalu kontras: di mobile fullscreen
                  // sering miss-tap kalau cuma h-9. h-11 = 44px (Apple HIG)
                  // dengan ring + bg-muted untuk kontras tinggi.
                  'inline-flex items-center justify-center h-11 w-11 shrink-0',
                  'rounded-full border border-border bg-muted/60',
                  'text-foreground hover:bg-muted hover:border-foreground/40',
                  'active:scale-95 transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
                aria-label={copy.close_aria}
              >
                <X className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>

            {/* Lead capture gate — block chat sampai user submit nama/email/telpon.
                Logged-in user di-bypass via /api/chat/lead/status probe. */}
            {leadCleared === false && (
              <ChatLeadForm
                locale={locale === 'id' ? 'id' : 'en'}
                referrerPath={pathname}
                onSubmitted={() => setLeadCleared(true)}
              />
            )}

            {leadCleared === null && (
              <div className="flex-1 flex items-center justify-center px-4 py-8">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0.12s]" />
                  <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0.24s]" />
                </div>
              </div>
            )}

            {/* Messages — hanya render setelah gate cleared */}
            {leadCleared === true && <>
            <div
              ref={messagesContainerRef}
              role="log"
              aria-live="polite"
              aria-atomic="false"
              aria-relevant="additions text"
              aria-label={copy.title}
              className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 space-y-4 relative"
            >
              {messages.map((msg) => {
                const isUser = (msg.role as string) === 'user';
                const text = getTextContent(msg);
                if (!text && !isLoading) return null;
                return (
                  <div
                    key={msg.id}
                    className={cn('flex gap-2.5 items-end', isUser ? 'justify-end' : 'justify-start')}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 flex-shrink-0 flex items-center justify-center mb-0.5">
                        <Bot className="h-3.5 w-3.5 text-[hsl(var(--primary))]" strokeWidth={2.25} />
                      </div>
                    )}
                    <div
                      className={cn(
                        'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed max-w-[82%]',
                        isUser
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-muted text-foreground rounded-bl-sm border border-border',
                      )}
                    >
                      <div className="whitespace-pre-wrap break-words">{text}</div>
                    </div>
                    {isUser && (
                      <div className="w-7 h-7 rounded-full bg-muted border border-border flex-shrink-0 flex items-center justify-center mb-0.5">
                        <UserIcon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex gap-2.5 items-end">
                  <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 flex-shrink-0 flex items-center justify-center mb-0.5">
                    <Bot className="h-3.5 w-3.5 text-[hsl(var(--primary))]" strokeWidth={2.25} />
                  </div>
                  <div className="bg-muted border border-border rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-muted-foreground/70 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/70 rounded-full animate-bounce [animation-delay:0.12s]" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/70 rounded-full animate-bounce [animation-delay:0.24s]" />
                    </div>
                  </div>
                </div>
              )}

              {/* Error / unavailable banner */}
              {error && (
                <div className="flex gap-2.5 items-start">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mb-0.5 border',
                      isServiceDown
                        ? 'bg-amber-500/15 border-amber-500/40'
                        : 'bg-destructive/15 border-destructive/40',
                    )}
                  >
                    <AlertTriangle
                      className={cn(
                        'h-3.5 w-3.5',
                        isServiceDown ? 'text-amber-500' : 'text-destructive',
                      )}
                      strokeWidth={2.25}
                    />
                  </div>
                  <div
                    className={cn(
                      'rounded-2xl rounded-bl-sm px-3.5 py-3 text-sm max-w-[82%] space-y-2',
                      isServiceDown
                        ? 'bg-amber-500/10 border border-amber-500/30 text-foreground'
                        : 'bg-destructive/10 border border-destructive/30 text-foreground',
                    )}
                  >
                    {isServiceDown ? (
                      <>
                        <p className="font-semibold">{copy.unavailable_title}</p>
                        <p className="text-foreground/75 text-xs leading-relaxed">{copy.unavailable_desc}</p>
                        <a
                          href="/contact"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[hsl(var(--primary))] hover:underline"
                        >
                          {copy.contact_link}
                        </a>
                      </>
                    ) : isRateLimited ? (
                      <>
                        <p className="font-semibold">{copy.rate_limit_title}</p>
                        <p className="text-foreground/75 text-xs leading-relaxed">{copy.rate_limit_desc}</p>
                        <button
                          type="button"
                          onClick={handleRetry}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--primary))] hover:underline"
                        >
                          <RotateCcw className="h-3 w-3" strokeWidth={2.25} /> {copy.retry}
                        </button>
                      </>
                    ) : (
                      <>
                        <p>{copy.error_generic}</p>
                        {errorText ? (
                          <p className="text-foreground/55 text-[11px] leading-relaxed font-mono break-words">
                            {errorText.length > 160 ? errorText.slice(0, 160) + '…' : errorText}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          onClick={handleRetry}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--primary))] hover:underline"
                        >
                          <RotateCcw className="h-3 w-3" strokeWidth={2.25} /> {copy.retry}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Jump-to-latest button */}
            <AnimatePresence>
              {showJumpButton && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  onClick={() => scrollToBottom('smooth')}
                  aria-label={copy.scroll_to_latest}
                  className="absolute right-4 bottom-[120px] sm:bottom-[110px] z-10 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-card border border-primary/40 text-[hsl(var(--primary))] text-xs font-semibold shadow-lg hover:bg-primary/10"
                >
                  <ArrowDown className="h-3 w-3" strokeWidth={2.25} /> {copy.scroll_to_latest}
                </motion.button>
              )}
            </AnimatePresence>

            {/* Quick replies (only before user input + when service up) */}
            {messages.length <= 1 && !isServiceDown && (
              <div className="px-3 pb-2 pt-1 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                {copy.quick_replies.map((qr) => (
                  <button
                    type="button"
                    key={qr.label}
                    onClick={() => handleQuickReply(qr)}
                    disabled={isLoading}
                    aria-label={qr.message}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full border border-border bg-muted/40 text-xs font-medium text-foreground/85 hover:bg-primary/10 hover:border-primary/40 hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input form */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 px-3 py-3 border-t border-border bg-card/95 backdrop-blur shrink-0"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={copy.placeholder}
                disabled={isLoading || isServiceDown}
                aria-label={copy.placeholder}
                className={cn(
                  'flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5',
                  'text-base sm:text-sm text-foreground placeholder:text-muted-foreground/70',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                  'disabled:opacity-50',
                )}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim() || isServiceDown}
                className={cn(
                  'inline-flex items-center justify-center h-11 w-11 rounded-xl bg-primary text-primary-foreground',
                  'hover:bg-primary/90 active:scale-95 transition-all',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                )}
                aria-label={copy.send_aria}
              >
                <Send className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </form>
            </>}

            {/* Footer */}
            <div className="px-4 py-2 text-center border-t border-border bg-muted/20 shrink-0 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
              <p className="text-[10px] text-muted-foreground">{copy.footer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
