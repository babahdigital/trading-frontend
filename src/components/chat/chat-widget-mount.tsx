'use client';

/**
 * Chat widget mount + state machine.
 *
 * Behavior model (Pak Abdullah 2026-05-21):
 *   - Footer "Chat AI" click → panel terbuka **sekali klik** (no intermediate icon)
 *   - Inside panel:
 *       MINIMIZE (−) → panel hide, floating icon muncul di pojok kanan-bawah
 *                      (user bisa expand lagi tanpa clear history)
 *       CLOSE (X)    → panel hide + hapus session history + sembunyikan icon
 *                      (kembali ke state awal — user harus klik footer lagi)
 *   - Floating icon click → panel expand lagi (same session)
 *
 * State machine (own di mount component, ChatWidget jadi controlled):
 *   - panelOpen: boolean — apakah panel terlihat
 *   - iconVisible: boolean — apakah floating icon di pojok terlihat
 *   - sessionKey: number — bump untuk reset ChatWidget instance (clear history)
 *
 * Initial state per route group:
 *   - Public marketing pages: panelOpen=false, iconVisible=false
 *     (entry hanya via footer "Chat AI" link)
 *   - Portal/admin/auth: panelOpen=false, iconVisible=true (idle mount after 5s)
 */
import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useParams } from 'next/navigation';
import { MessageCircle } from 'lucide-react';

const ChatWidget = dynamic(
  () => import('./chat-widget').then((mod) => ({ default: mod.ChatWidget })),
  { ssr: false, loading: () => null },
);

const HISTORY_STORAGE_KEY = 'babah.chat.history.v1';
const LEAD_STORAGE_KEY = 'babah.chat.lead';

interface PersistedHistory {
  locale?: string;
  messages?: Array<{ role?: string; parts?: Array<{ type?: string; text?: string }>; content?: string }>;
}

interface ChatLead {
  name?: string;
  email?: string;
}

/** Snapshot current chat history + lead from localStorage before clearing.
 *  Return clean message array siap kirim ke /api/chat/email-summary. */
function snapshotForEmail(): { messages: Array<{ role: 'user' | 'assistant'; content: string }>; email?: string; name?: string } | null {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedHistory;
    const arr = Array.isArray(parsed?.messages) ? parsed.messages : [];
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    for (const m of arr) {
      const role = m?.role === 'user' ? 'user' : 'assistant';
      // ai-sdk v5 menyimpan UIMessage dengan `parts: [{type:'text', text:'…'}]`
      let text = '';
      if (Array.isArray(m?.parts)) {
        text = m.parts
          .filter((p) => p?.type === 'text' && typeof p?.text === 'string')
          .map((p) => p.text ?? '')
          .join('\n');
      } else if (typeof m?.content === 'string') {
        text = m.content;
      }
      const trimmed = text.trim();
      if (trimmed) messages.push({ role, content: trimmed });
    }
    let email: string | undefined;
    let name: string | undefined;
    try {
      const leadRaw = localStorage.getItem(LEAD_STORAGE_KEY);
      if (leadRaw) {
        const lead = JSON.parse(leadRaw) as ChatLead;
        email = lead?.email;
        name = lead?.name;
      }
    } catch { /* ignore */ }
    return { messages, email, name };
  } catch {
    return null;
  }
}

export function ChatWidgetMount() {
  const pathname = usePathname();
  const params = useParams<{ locale?: string }>();
  const locale: 'id' | 'en' = params?.locale === 'en' ? 'en' : 'id';

  // Route detection — pages dengan footer chat link punya entry alternatif
  // (icon di pojok jadi tersembunyi by default).
  const isPortalOrAdmin = pathname?.startsWith('/portal')
    || pathname?.startsWith('/admin')
    || pathname?.startsWith('/login')
    || pathname?.startsWith('/register')
    || pathname?.startsWith('/checkout');
  const isPublicPage = !isPortalOrAdmin;

  const [mount, setMount] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  // Portal/admin: icon visible default (no footer entry alt). Public: hidden
  // sampai user click footer "Chat AI" link untuk first time.
  const [iconVisible, setIconVisible] = useState(!isPublicPage);
  // Bump key untuk reset ChatWidget instance setelah CLOSE (clear history).
  const [sessionKey, setSessionKey] = useState(0);

  // Footer event handler — 1 click langsung open panel (mount + open + show
  // icon supaya minimize bisa re-expand).
  useEffect(() => {
    const open = () => {
      setMount(true);
      setIconVisible(true);
      setPanelOpen(true);
    };
    window.addEventListener('babahalgo:open-chat', open);
    return () => window.removeEventListener('babahalgo:open-chat', open);
  }, []);

  // Broadcast chat icon visibility ke listener lain (TickerBar reserve space
  // kanan saat icon visible supaya tidak overlap di mode floating-bottom).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Visible kalau iconVisible=true DAN panel sedang tutup (panel buka =
    // overlay menutupi icon, tidak perlu reserve space)
    const visible = iconVisible && !panelOpen;
    window.dispatchEvent(new CustomEvent('babahalgo:chat-icon-state', { detail: { visible } }));
  }, [iconVisible, panelOpen]);

  // Idle-mount untuk portal/admin (icon visible default). Public pages skip
  // idle-mount — load on-demand saat user klik footer.
  useEffect(() => {
    if (mount || isPublicPage) return;
    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const w = window as IdleWindow;
    const idleHandle = w.requestIdleCallback
      ? w.requestIdleCallback(() => setMount(true), { timeout: 5000 })
      : window.setTimeout(() => setMount(true), 5000);
    return () => {
      if (w.cancelIdleCallback) w.cancelIdleCallback(idleHandle as number);
      else window.clearTimeout(idleHandle as number);
    };
  }, [mount, isPublicPage]);

  // Handle open state changes dari panel.
  // - 'minimize' → tutup panel, icon tetap visible
  // - 'close'    → tutup panel + clear history + sembunyikan icon (untuk public)
  // - 'user-toggle' (dari external open event atau internal handler) → propagate
  const handleOpenChange = useCallback((next: boolean, reason: 'close' | 'minimize' | 'user-toggle') => {
    if (next === true) {
      setPanelOpen(true);
      setIconVisible(true);
      return;
    }
    // Closing — branch by reason
    if (reason === 'close') {
      // Snapshot dulu SEBELUM clear, untuk send email summary
      const snap = snapshotForEmail();
      if (snap && snap.messages.length >= 2) {
        // Fire-and-forget POST — never block UI close flow. sendBeacon kalau
        // available (survive page navigation), else regular fetch keepalive.
        const payload = JSON.stringify({
          messages: snap.messages,
          email: snap.email,
          name: snap.name,
          locale,
        });
        try {
          const blob = new Blob([payload], { type: 'application/json' });
          const sent = typeof navigator !== 'undefined' && navigator.sendBeacon
            ? navigator.sendBeacon('/api/chat/email-summary', blob)
            : false;
          if (!sent) {
            void fetch('/api/chat/email-summary', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: payload,
              keepalive: true,
              credentials: 'same-origin',
            }).catch(() => undefined);
          }
        } catch { /* non-fatal */ }
      }

      setPanelOpen(false);
      // Public pages: hide icon balik ke awal (user perlu klik footer lagi)
      // Portal/admin: keep icon visible (entry primer)
      if (isPublicPage) setIconVisible(false);
      // Clear history + reset chat instance via sessionKey bump
      try { localStorage.removeItem(HISTORY_STORAGE_KEY); } catch { /* storage disabled */ }
      setSessionKey((k) => k + 1);
    } else {
      // minimize / user-toggle → just tutup panel, icon tetap
      setPanelOpen(false);
    }
  }, [isPublicPage, locale]);

  // Floating icon — render saat iconVisible=true, panel tertutup, dan widget
  // belum mount (placeholder lightweight) atau mounted (real button).
  const handleIconClick = useCallback(() => {
    setMount(true);
    setPanelOpen(true);
  }, []);

  return (
    <>
      {/* Floating icon — visible sesuai state machine, hide saat panel buka */}
      {iconVisible && !panelOpen && (
        <button
          type="button"
          onClick={handleIconClick}
          onMouseEnter={() => setMount(true)}
          onTouchStart={() => setMount(true)}
          aria-label="Open chat assistant"
          className={
            'fixed bottom-[max(env(safe-area-inset-bottom),1rem)] right-4 sm:bottom-6 sm:right-6 ' +
            'z-[100] inline-flex h-14 w-14 items-center justify-center rounded-full ' +
            'bg-amber-500 text-black shadow-lg shadow-amber-500/25 ' +
            'hover:bg-amber-400 hover:shadow-xl active:scale-95 transition-all'
          }
        >
          <MessageCircle className="h-6 w-6" strokeWidth={2.25} />
        </button>
      )}

      {/* Real widget — controlled via panelOpen, hideFab=true supaya internal
          FAB tidak duplicate dengan icon di atas. */}
      {mount && (
        <ChatWidget
          key={sessionKey}
          open={panelOpen}
          onOpenChange={handleOpenChange}
          hideFab
        />
      )}
    </>
  );
}
