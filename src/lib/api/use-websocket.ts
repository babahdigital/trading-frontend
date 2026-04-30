'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BabahalgoWS, type WSMessage, type WSTopic } from './websocket';

interface UseBabahalgoWSInput {
  /**
   * Tenant API token for first-message handshake. Empty string disables
   * connect. If `autoFetchToken: true`, this is ignored and the hook
   * fetches its own token from /api/auth/ws-token (using the session
   * cookie). Prefer auto-fetch in portal pages.
   */
  token?: string;
  /**
   * When true, hook calls GET /api/auth/ws-token on mount to obtain the
   * tenant API token (server-side bridge, session-authed). Refetches every
   * `tokenRefreshMs` (default 30 min) to handle admin token rotation.
   */
  autoFetchToken?: boolean;
  /** Token refresh interval when autoFetchToken=true. Default 30 min. */
  tokenRefreshMs?: number;
  /** Toggle without unmount (e.g. tab hidden). Default true. */
  enabled?: boolean;
  /** Override URL. Defaults to NEXT_PUBLIC_WS_URL + /api/forex/ws. */
  url?: string;
}

interface UseBabahalgoWSReturn {
  /** Reactive connection state. Probed every 2s. */
  connected: boolean;
  /** Subscribe to a topic for the lifetime of caller's effect. Returns cleanup. */
  subscribe: (topic: WSTopic) => () => void;
  /** Listen for typed messages. Returns cleanup. */
  on: <T extends WSMessage['type']>(
    type: T,
    listener: (msg: Extract<WSMessage, { type: T }>) => void,
  ) => () => void;
  /** Timestamp ms of most recent message of any type. */
  lastMessageAt: number | null;
}

/**
 * React hook that connects a `BabahalgoWS` lifecycle to a component.
 * Auto-reconnects via exponential backoff (delegated to BabahalgoWS).
 * Auto-closes on unmount.
 *
 * Usage:
 *   const { connected, subscribe, on } = useBabahalgoWS({ token });
 *   useEffect(() => subscribe({ type: 'tick', symbol: 'EURUSD' }), [subscribe]);
 *   useEffect(() => on('tick', (m) => setPrice(m.bid)), [on]);
 *
 * Why primitive `token` dep instead of object: caller usually constructs the
 * options object inline; primitive deps avoid spurious reconnects on every
 * render without forcing memoization upstream.
 */
export function useBabahalgoWS(input: UseBabahalgoWSInput): UseBabahalgoWSReturn {
  const { token: explicitToken, autoFetchToken = false, tokenRefreshMs = 30 * 60_000, enabled = true, url } = input;
  const wsRef = useRef<BabahalgoWS | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);
  const [fetchedToken, setFetchedToken] = useState<string>('');

  // Auto-fetch tenant API token from server bridge when enabled. Refresh
  // periodically — backend tenant token can be rotated by admin.
  useEffect(() => {
    if (!autoFetchToken || !enabled) return;
    let cancelled = false;
    const fetchToken = async () => {
      try {
        const res = await fetch('/api/auth/ws-token', { credentials: 'same-origin', cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) setFetchedToken('');
          return;
        }
        const body = await res.json();
        if (!cancelled && typeof body.token === 'string') {
          setFetchedToken(body.token);
        }
      } catch {
        if (!cancelled) setFetchedToken('');
      }
    };
    void fetchToken();
    const id = setInterval(fetchToken, tokenRefreshMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [autoFetchToken, enabled, tokenRefreshMs]);

  const token = autoFetchToken ? fetchedToken : (explicitToken ?? '');

  useEffect(() => {
    if (!enabled || !token) {
      return undefined;
    }

    const instance = new BabahalgoWS({
      token,
      url,
      logger: (level, message) => {
        if (level === 'error') console.error(`[ws] ${message}`);
      },
    });
    wsRef.current = instance;
    instance.connect();

    const interval = setInterval(() => setConnected(instance.isConnected()), 2000);

    return () => {
      clearInterval(interval);
      instance.close();
      if (wsRef.current === instance) {
        wsRef.current = null;
      }
      setConnected(false);
    };
  }, [token, enabled, url]);

  const subscribe = useCallback<UseBabahalgoWSReturn['subscribe']>((topic) => {
    return wsRef.current?.subscribe(topic) ?? (() => undefined);
  }, []);

  const on = useCallback<UseBabahalgoWSReturn['on']>((type, listener) => {
    const wrapped = (msg: Parameters<typeof listener>[0]) => {
      setLastMessageAt(Date.now());
      listener(msg);
    };
    return wsRef.current?.on(type, wrapped) ?? (() => undefined);
  }, []);

  return { connected, subscribe, on, lastMessageAt };
}
