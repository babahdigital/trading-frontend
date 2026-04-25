'use client';

import { useState, useRef, useEffect, useCallback, useMemo, type FormEvent } from 'react';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from 'next-intl';
import { MessageCircle, X, Send, Bot, User, AlertCircle, RotateCcw, ArrowDown } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface QuickReply {
  label: string;
  message: string;
}

interface CopyBundle {
  title: string;
  status_online: string;
  status_offline: string;
  greeting: string;
  placeholder: string;
  send_aria: string;
  close_aria: string;
  scroll_to_latest: string;
  retry: string;
  footer: string;
  error_generic: string;
  unavailable_title: string;
  unavailable_desc: string;
  contact_link: string;
  quick_replies: QuickReply[];
}

const COPY: Record<'id' | 'en', CopyBundle> = {
  id: {
    title: 'Babah AI Assistant',
    status_online: 'Online',
    status_offline: 'Offline',
    greeting:
      'Halo! Saya Babah, asisten AI BabahAlgo. Saya bisa bantu Anda soal layanan Forex, Crypto Bot, harga, atau cara mendaftar. Ada yang ingin ditanyakan?',
    placeholder: 'Ketik pertanyaan Anda…',
    send_aria: 'Kirim pesan',
    close_aria: 'Tutup chat',
    scroll_to_latest: 'Scroll ke pesan terbaru',
    retry: 'Coba lagi',
    footer: 'Powered by BabahAlgo AI · Bukan saran investasi',
    error_generic: 'Maaf, terjadi gangguan. Silakan coba lagi.',
    unavailable_title: 'Asisten Sedang Tidak Tersedia',
    unavailable_desc:
      'Asisten AI sementara tidak bisa diakses. Hubungi tim kami langsung untuk bantuan.',
    contact_link: 'Hubungi support →',
    quick_replies: [
      { label: 'Harga Paket', message: 'Berapa harga paket yang tersedia untuk Forex dan Crypto?' },
      { label: 'Crypto Bot', message: 'Bagaimana cara kerja Crypto Bot Binance?' },
      { label: 'Cara Daftar', message: 'Bagaimana cara mendaftar dan onboarding KYC?' },
      { label: 'Risk Management', message: 'Bagaimana sistem risk management 12-layer?' },
    ],
  },
  en: {
    title: 'Babah AI Assistant',
    status_online: 'Online',
    status_offline: 'Offline',
    greeting:
      "Hi! I'm Babah, BabahAlgo's AI assistant. I can help with our Forex services, Crypto Bot, pricing, or sign-up flow. What would you like to know?",
    placeholder: 'Type your question…',
    send_aria: 'Send message',
    close_aria: 'Close chat',
    scroll_to_latest: 'Scroll to latest',
    retry: 'Retry',
    footer: 'Powered by BabahAlgo AI · Not investment advice',
    error_generic: 'Sorry, something went wrong. Please try again.',
    unavailable_title: 'Assistant Unavailable',
    unavailable_desc: 'The AI assistant is temporarily unreachable. Please contact our team directly for help.',
    contact_link: 'Contact support →',
    quick_replies: [
      { label: 'Pricing', message: 'What are the available pricing tiers for Forex and Crypto?' },
      { label: 'Crypto Bot', message: 'How does the Binance Crypto Bot work?' },
      { label: 'Get Started', message: 'How do I sign up and complete KYC?' },
      { label: 'Risk Management', message: 'How does the 12-layer risk framework work?' },
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const { messages, sendMessage, status, error, setMessages } = useChat({
    messages: initialMessages,
    transport: undefined,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Reset greeting when locale changes (only if user hasn't sent anything yet)
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
    messagesEndRef.current?.scrollIntoView({ behavior });
    setShowJumpButton(false);
  }, []);

  // Smart auto-scroll: only when user is near bottom (don't yank them up while reading older messages)
  useEffect(() => {
    if (!isOpen) return;
    if (isNearBottom()) {
      scrollToBottom();
    } else if (messages.length > 1) {
      setShowJumpButton(true);
    }
  }, [messages, isOpen, isNearBottom, scrollToBottom]);

  // Track scroll to toggle jump-button
  useEffect(() => {
    const c = messagesContainerRef.current;
    if (!c || !isOpen) return;
    const onScroll = () => setShowJumpButton(!isNearBottom() && messages.length > 1);
    c.addEventListener('scroll', onScroll, { passive: true });
    return () => c.removeEventListener('scroll', onScroll);
  }, [isOpen, isNearBottom, messages.length]);

  // Badge notification when chat is closed and new assistant message arrived
  useEffect(() => {
    if (!isOpen && messages.length > 1 && messages[messages.length - 1].role === 'assistant') {
      setHasNewMessage(true);
    }
  }, [messages, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Body scroll lock on mobile when chat is open
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    if (isOpen && isMobile) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [isOpen]);

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

  const handleQuickReply = (message: string) => {
    sendWithLocale(message);
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

  // Detect "service unavailable" — render a degraded-state UI instead of error toast
  const errorText = error?.message ?? '';
  const isServiceDown = /503|unavailable|unreachable|tidak tersedia|tidak bisa diakses/i.test(errorText);

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
            aria-label={copy.title}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-14 h-14 rounded-full
                       bg-primary text-primary-foreground shadow-2xl
                       flex items-center justify-center
                       hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.4)]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                       transition-shadow"
          >
            <MessageCircle className="w-6 h-6" />
            {hasNewMessage && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                aria-label="new message"
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500
                           rounded-full border-2 border-background"
              />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={copy.title}
            className={cn(
              'fixed z-50 bg-background border border-white/10 rounded-2xl shadow-2xl',
              'flex flex-col overflow-hidden',
              'bottom-4 right-4 sm:bottom-6 sm:right-6',
              'w-[calc(100vw-2rem)] sm:w-[400px]',
              'h-[calc(100dvh-2rem)] sm:h-[560px] sm:max-h-[calc(100dvh-3rem)]',
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-card/80 backdrop-blur">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{copy.title}</p>
                  <p className={cn(
                    'text-[11px] flex items-center gap-1.5',
                    isServiceDown ? 'text-amber-400' : 'text-green-400',
                  )}>
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      isServiceDown ? 'bg-amber-400' : 'bg-green-400 animate-pulse',
                    )} />
                    {isServiceDown ? copy.status_offline : copy.status_online}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={copy.close_aria}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3 relative"
            >
              {messages.map((msg) => {
                const isUser = (msg.role as string) === 'user';
                const text = getTextContent(msg);
                if (!text && !isLoading) return null;
                return (
                  <div
                    key={msg.id}
                    className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/30 flex-shrink-0 flex items-center justify-center mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed max-w-[85%]',
                        isUser
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted text-foreground/90 rounded-bl-md border border-white/5',
                      )}
                    >
                      <div className="whitespace-pre-wrap break-words">{text}</div>
                    </div>
                    {isUser && (
                      <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center mt-0.5">
                        <User className="w-3.5 h-3.5 text-foreground/70" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/30 flex-shrink-0 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="bg-muted border border-white/5 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0.1s]" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0.2s]" />
                    </div>
                  </div>
                </div>
              )}

              {/* Error / unavailable state */}
              {error && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-red-500/10 border border-red-500/30 flex-shrink-0 flex items-center justify-center mt-0.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md px-3.5 py-3 text-sm bg-red-500/10 border border-red-500/30 text-red-300 max-w-[85%] space-y-2.5">
                    {isServiceDown ? (
                      <>
                        <p className="font-semibold text-red-200">{copy.unavailable_title}</p>
                        <p className="text-red-200/80 text-xs leading-relaxed">{copy.unavailable_desc}</p>
                        <a
                          href="/contact"
                          className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300"
                        >
                          {copy.contact_link}
                        </a>
                      </>
                    ) : (
                      <>
                        <p>{copy.error_generic}</p>
                        <button
                          type="button"
                          onClick={handleRetry}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300"
                        >
                          <RotateCcw className="w-3 h-3" /> {copy.retry}
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
                  className="absolute right-4 bottom-[120px] sm:bottom-[110px] z-10 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-card border border-amber-500/30 text-amber-300 text-xs font-medium shadow-lg hover:bg-amber-500/10"
                >
                  <ArrowDown className="h-3 w-3" /> {copy.scroll_to_latest}
                </motion.button>
              )}
            </AnimatePresence>

            {/* Quick replies (only before user input) */}
            {messages.length <= 1 && !isServiceDown && (
              <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
                {copy.quick_replies.map((qr) => (
                  <button
                    type="button"
                    key={qr.label}
                    onClick={() => handleQuickReply(qr.message)}
                    disabled={isLoading}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full border border-white/15 bg-white/[0.02] text-xs font-medium hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-300 transition-colors disabled:opacity-50"
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input form */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 px-3 py-3 border-t border-white/10 bg-card/80 backdrop-blur"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={copy.placeholder}
                disabled={isLoading || isServiceDown}
                aria-label={copy.placeholder}
                className="flex-1 rounded-xl border border-white/10 bg-background px-3.5 py-2.5
                           text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40
                           disabled:opacity-50 placeholder:text-muted-foreground/70"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim() || isServiceDown}
                className="p-2.5 rounded-xl bg-primary text-primary-foreground
                           hover:bg-primary/90 transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed
                           active:scale-[0.98]
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={copy.send_aria}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* Footer */}
            <div className="px-4 py-2 text-center border-t border-white/10 bg-card/40">
              <p className="text-[10px] text-muted-foreground/70">{copy.footer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
