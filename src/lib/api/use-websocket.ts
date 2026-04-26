'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BabahalgoWS, type WSMessage, type WSTopic } from './websocket';

interface UseBabahalgoWSInput {
  /** JWT for first-message handshake. Empty string disables connect. */
  token: string;
  /** Toggle without unmount (e.g. tab hidden). Default true. */
  enabled?: boolean;
  /** Override URL. Defaults to NEXT_PUBLIC_WS_URL + /ws/forex/stream. */
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
  const { token, enabled = true, url } = input;
  const wsRef = useRef<BabahalgoWS | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);

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
