'use client';

import { useEffect, useRef, useState } from 'react';
import { BabahalgoWS, type WSMessage, type WSTopic, type BabahalgoWSOptions } from './websocket';

/**
 * React hook that connects a `BabahalgoWS` lifecycle to a component.
 * Returns connection state + a stable subscribe helper. Auto-closes
 * on unmount.
 *
 * Usage:
 *   const { connected, subscribe, on } = useBabahalgoWS({ token });
 *   useEffect(() => subscribe({ type: 'tick', symbol: 'EURUSD' }), []);
 *   useEffect(() => on('tick', (m) => setPrice(m.bid)), [on]);
 */
export function useBabahalgoWS(options: BabahalgoWSOptions | null) {
  const wsRef = useRef<BabahalgoWS | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);

  useEffect(() => {
    if (!options) return;
    const instance = new BabahalgoWS({
      ...options,
      logger: options.logger ?? ((level, message) => {
        if (level === 'error') console.error(`[ws] ${message}`);
      }),
    });
    wsRef.current = instance;
    instance.connect();

    const interval = setInterval(() => setConnected(instance.isConnected()), 2000);

    return () => {
      clearInterval(interval);
      instance.close();
      wsRef.current = null;
      setConnected(false);
    };
  }, [options]);

  function subscribe(topic: WSTopic): () => void {
    return wsRef.current?.subscribe(topic) ?? (() => undefined);
  }

  function on<T extends WSMessage['type']>(
    type: T,
    listener: (msg: Extract<WSMessage, { type: T }>) => void,
  ): () => void {
    const wrapped = (msg: Extract<WSMessage, { type: T }>) => {
      setLastMessageAt(Date.now());
      listener(msg);
    };
    return wsRef.current?.on(type, wrapped) ?? (() => undefined);
  }

  return { connected, subscribe, on, lastMessageAt };
}
