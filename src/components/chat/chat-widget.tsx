'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface QuickReply {
  label: string;
  message: string;
}

const QUICK_REPLIES: QuickReply[] = [
  { label: 'Harga Paket', message: 'Berapa harga paket yang tersedia?' },
  { label: 'Fitur Utama', message: 'Apa saja fitur utama BabahAlgo?' },
  { label: 'Cara Daftar', message: 'Bagaimana cara mendaftar?' },
  { label: 'Risk Management', message: 'Bagaimana sistem risk management-nya?' },
];

function getTextContent(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

export function ChatWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    messages: [
      {
        id: 'greeting',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Halo! Saya Babah, asisten AI BabahAlgo. Ada yang bisa saya bantu tentang layanan kami? 🤖' }],
      },
    ],
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Badge notification when chat is closed and there's a new response
  useEffect(() => {
    if (!isOpen && messages.length > 1) {
      setHasNewMessage(true);
    }
  }, [messages, isOpen]);

  // Hide on admin paths
  if (pathname.startsWith('/admin')) return null;

  const handleOpen = () => {
    setIsOpen(true);
    setHasNewMessage(false);
  };

  const handleQuickReply = (message: string) => {
    sendMessage({ text: message });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };

  return (
    <>
      {/* Bubble Button (Minimized) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpen}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full
                       bg-primary text-primary-foreground shadow-2xl
                       flex items-center justify-center
                       hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.4)]
                       transition-shadow"
          >
            <MessageCircle className="w-6 h-6" />
            {hasNewMessage && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500
                           rounded-full border-2 border-background"
              />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel (Expanded) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className={cn(
              'fixed z-50 bg-background border rounded-2xl shadow-2xl',
              'flex flex-col overflow-hidden',
              'bottom-6 right-6 w-[380px] h-[520px]',
              'max-sm:inset-0 max-sm:w-full max-sm:h-full max-sm:rounded-none'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Babah AI Assistant</p>
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Online
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                aria-label="Tutup chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((msg) => {
                const isUser = (msg.role as string) === 'user';
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-2',
                      isUser ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {!isUser && (
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex-shrink-0
                                      flex items-center justify-center mt-1">
                        <Bot className="w-3 h-3 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed max-w-[85%]',
                        isUser
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted rounded-bl-md'
                      )}
                    >
                      <div className="whitespace-pre-wrap">{getTextContent(msg)}</div>
                    </div>
                    {isUser && (
                      <div className="w-6 h-6 rounded-full bg-accent flex-shrink-0
                                      flex items-center justify-center mt-1">
                        <User className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex-shrink-0
                                  flex items-center justify-center">
                    <Bot className="w-3 h-3 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.1s]" />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                    </div>
                  </div>
                </div>
              )}

              {/* Error display */}
              {error && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-red-500/10 flex-shrink-0
                                  flex items-center justify-center mt-1">
                    <Bot className="w-3 h-3 text-red-500" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 max-w-[85%]">
                    Maaf, terjadi kesalahan. Silakan coba lagi.
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies (only shown before user input) */}
            {messages.length <= 1 && (
              <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
                {QUICK_REPLIES.map((qr) => (
                  <button
                    type="button"
                    key={qr.label}
                    onClick={() => handleQuickReply(qr.message)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full border
                               text-xs font-medium hover:bg-accent transition-colors"
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 px-4 py-3 border-t bg-card"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ketik pertanyaan Anda..."
                disabled={isLoading}
                className="flex-1 rounded-xl border bg-background px-3.5 py-2.5
                           text-sm focus:outline-none focus:ring-2 focus:ring-primary/50
                           disabled:opacity-50 placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="p-2.5 rounded-xl bg-primary text-primary-foreground
                           hover:bg-primary/90 transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed
                           active:scale-[0.98]"
                aria-label="Kirim pesan"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* Footer */}
            <div className="px-4 py-1.5 text-center border-t">
              <p className="text-[10px] text-muted-foreground">
                Powered by BabahAlgo AI · Respons bukan saran investasi
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
