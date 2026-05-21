'use client';

/**
 * Defer mount + smart hide untuk ChatWidget.
 *
 * - Lazy mount: load full widget saat idle / hover / 5s elapsed. -45KB initial JS.
 * - Footer-aware (Pak Abdullah 2026-05-21): public pages punya footer dengan
 *   chat icon explicit — hide floating button keseluruhan di pages itu supaya
 *   tidak duplicate entry point. Chat tetap available via footer icon dispatch
 *   `babahalgo:open-chat` event.
 * - Portal/admin pages (yang tidak punya footer): chat floating tetap show,
 *   karena tidak ada alternatif entry point.
 *
 * Chat panel sendiri tetap render kalau di-open via event — cuma placeholder
 * floating button yang di-hide selectively.
 */
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { MessageCircle } from 'lucide-react';

const ChatWidget = dynamic(
  () => import('./chat-widget').then((mod) => ({ default: mod.ChatWidget })),
  { ssr: false, loading: () => null },
);

export function ChatWidgetMount() {
  const [mount, setMount] = useState(false);
  const [hidden, setHidden] = useState(false);
  const pathname = usePathname();

  // Public pages punya footer dengan chat icon explicit. Portal/admin tidak
  // punya footer — chat floating tetap muncul sebagai entry point.
  // Path detection liberal: anything yang TIDAK /portal, /admin, /login,
  // /register, /checkout dianggap "public with footer".
  const isPortalOrAdmin = pathname?.startsWith('/portal')
    || pathname?.startsWith('/admin')
    || pathname?.startsWith('/login')
    || pathname?.startsWith('/register')
    || pathname?.startsWith('/checkout');
  const hideFloatingButton = !isPortalOrAdmin;

  // Idle-mount untuk portal/admin only (floating button user). Public pages
  // skip auto-mount — load on-demand saat user click footer chat icon (lighter
  // initial bundle untuk halaman SEO/marketing yang biasanya bounce tanpa chat).
  useEffect(() => {
    if (mount || hideFloatingButton) return;
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
  }, [mount, hideFloatingButton]);

  // Observe #enterprise-footer — fade chat saat footer dalam viewport.
  // IntersectionObserver is best-effort; jika footer tidak ada (mis. portal
  // pages tidak punya footer), chat tetap visible normal.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const footer = document.getElementById('enterprise-footer');
    if (!footer) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setHidden(entry.isIntersecting);
        }
      },
      // Trigger sebelum footer fully visible — pas top edge masuk viewport.
      { threshold: 0, rootMargin: '0px 0px -80px 0px' },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, [mount]);

  // Smooth opacity + translate ke bawah saat hidden — tidak unmount supaya
  // state chat (pesan, lead, etc.) survive footer overlap.
  const wrapperClass = hidden
    ? 'opacity-0 translate-y-4 pointer-events-none transition-all duration-300'
    : 'opacity-100 translate-y-0 transition-all duration-300';

  // Public pages dengan footer icon: lazy-mount on user click footer chat.
  // Tidak render floating button — chat icon di footer adalah satu-satunya
  // entry. ChatWidget self-listen event setelah mount.
  useEffect(() => {
    if (!hideFloatingButton) return;
    const handle = () => setMount(true);
    window.addEventListener('babahalgo:open-chat', handle);
    return () => window.removeEventListener('babahalgo:open-chat', handle);
  }, [hideFloatingButton]);

  if (hideFloatingButton) {
    return mount ? <ChatWidget /> : null;
  }

  if (!mount) {
    return (
      <div className={wrapperClass}>
        <button
          type="button"
          onClick={() => setMount(true)}
          onMouseEnter={() => setMount(true)}
          onTouchStart={() => setMount(true)}
          aria-label="Open chat assistant"
          aria-hidden={hidden}
          tabIndex={hidden ? -1 : 0}
          className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-black shadow-lg hover:bg-amber-400 transition-colors"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      </div>
    );
  }

  return (
    <div className={wrapperClass} aria-hidden={hidden}>
      <ChatWidget />
    </div>
  );
}

