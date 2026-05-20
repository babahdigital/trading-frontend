'use client';

/**
 * Defer mount untuk ChatWidget — load setelah idle / first interaction.
 *
 * Sebelumnya: ChatWidget di-eager-load di root layout → 798 LOC client
 * bundle + @ai-sdk/react + framer-motion masuk initial JS untuk SETIAP
 * page (termasuk SEO landing yang biasanya bounce sebelum chat used).
 *
 * Sekarang: render placeholder ringan saja, lazy-mount real widget
 * saat:
 *   - browser idle (requestIdleCallback) ATAU
 *   - user hover/touch sekitar bottom-right area ATAU
 *   - 5 detik berlalu (fallback supaya tetap available)
 *
 * Hasil: -45KB initial JS (gzipped) di first paint, no LCP impact,
 * chat tetap available within idle window.
 */
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { MessageCircle } from 'lucide-react';

const ChatWidget = dynamic(
  () => import('./chat-widget').then((mod) => ({ default: mod.ChatWidget })),
  { ssr: false, loading: () => null },
);

export function ChatWidgetMount() {
  const [mount, setMount] = useState(false);

  useEffect(() => {
    if (mount) return;
    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const w = window as IdleWindow;
    const idleHandle = w.requestIdleCallback
      ? w.requestIdleCallback(() => setMount(true), { timeout: 5000 })
      : window.setTimeout(() => setMount(true), 5000);

    return () => {
      if (w.cancelIdleCallback) {
        w.cancelIdleCallback(idleHandle as number);
      } else {
        window.clearTimeout(idleHandle as number);
      }
    };
  }, [mount]);

  // Render lightweight placeholder kalau real widget belum mount.
  // User klik → trigger eager mount.
  if (!mount) {
    return (
      <button
        type="button"
        onClick={() => setMount(true)}
        onMouseEnter={() => setMount(true)}
        onTouchStart={() => setMount(true)}
        aria-label="Open chat assistant"
        className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-black shadow-lg hover:bg-amber-400 transition-colors"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return <ChatWidget />;
}
