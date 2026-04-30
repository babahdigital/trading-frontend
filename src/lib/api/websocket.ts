/**
 * WebSocket client infrastructure per FRONTEND_DEVELOPMENT_GUIDE §4.6.
 *
 * Responsibilities:
 *   - Connect + authenticate via first-message handshake (NOT query
 *     param — avoids token leaking into access logs).
 *   - Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, 16s max).
 *   - Topic-based subscribe/unsubscribe (price ticks, signals, position
 *     updates, kill-switch events).
 *   - Event-emitter pattern — consumers subscribe to typed event names.
 *   - Clean shutdown (`close()`) on component unmount.
 *
 * Modular: lives in lib/api/ alongside rate-limit-bus + client-fetch.
 * No UI dependency — pure TypeScript, safe for server components too
 * (class is browser-only by default since it uses WebSocket global).
 */

export type WSTopic =
  | { type: 'tick'; symbol: string }
  | { type: 'signal' }
  | { type: 'position.update' }
  | { type: 'kill_switch' };

export type WSMessage =
  | { type: 'tick'; symbol: string; bid: number; ask: number; ts: number }
  | { type: 'signal'; id: string; pair: string; direction: 'BUY' | 'SELL'; confidence: number; emittedAt: string }
  | { type: 'position.update'; id: string; status: string; pnl?: number }
  | { type: 'kill_switch'; reason: string; triggeredAt: string }
  | { type: 'ack'; echo?: unknown }
  | { type: 'error'; code: string; message: string };

export interface BabahalgoWSOptions {
  /** Full wss:// URL. Defaults to NEXT_PUBLIC_WS_URL + /api/forex/ws */
  url?: string;
  /**
   * TENANT API TOKEN (X-API-Token plaintext) for first-message auth handshake.
   * NOT a JWT session cookie — backend rejects JWT on WS endpoint with
   * close code 1008. Fetch from /api/auth/ws-token before connecting.
   */
  token: string;
  /** Backoff ceiling in ms (default 16000) */
  maxBackoffMs?: number;
  /** Logger for debug tracing */
  logger?: (level: 'info' | 'warn' | 'error', message: string, data?: unknown) => void;
}

type Listener<T extends WSMessage = WSMessage> = (msg: T) => void;

// Per backend `dev/jawaban-bf.md` Wave-29T closure, the canonical path is
// `/api/forex/ws` (dual-mode auth: query param `?token=` legacy + first-message
// handshake `{"type":"auth","token":"..."}` preferred — we use handshake B).
//
// `NEXT_PUBLIC_WS_URL` should be set to e.g. `wss://api.babahalgo.com` (without
// trailing path); the path is appended here so the env var reflects the host
// only. Legacy fallback `/ws/forex/stream` removed.
const DEFAULT_URL = (process.env.NEXT_PUBLIC_WS_URL ?? 'wss://api.babahalgo.com') + '/api/forex/ws';

export class BabahalgoWS {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private authFailures = 0;
  private closedByUser = false;
  private subscriptions = new Set<string>(); // serialized topic strings for replay on reconnect
  private listeners = new Map<string, Set<Listener>>();
  private readonly url: string;
  private readonly token: string;
  private readonly maxBackoffMs: number;
  private readonly log: NonNullable<BabahalgoWSOptions['logger']>;

  constructor(options: BabahalgoWSOptions) {
    this.url = options.url ?? DEFAULT_URL;
    this.token = options.token;
    this.maxBackoffMs = options.maxBackoffMs ?? 16_000;
    this.log = options.logger ?? (() => undefined);
  }

  connect(): void {
    if (typeof window === 'undefined') {
      this.log('warn', 'BabahalgoWS.connect called on server — no-op');
      return;
    }
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.log('info', 'connect() ignored — already open/connecting');
      return;
    }

    this.closedByUser = false;
    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      this.log('error', 'WebSocket constructor failed', err);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.log('info', 'WebSocket open');
      this.reconnectAttempts = 0;
      // First message is auth handshake — never in the URL
      this.send({ type: 'auth', token: this.token });
      // Replay subscriptions after reconnect
      for (const sub of this.subscriptions) {
        this.ws?.send(sub);
      }
    };

    this.ws.onmessage = (event) => {
      let msg: WSMessage;
      try {
        msg = JSON.parse(event.data) as WSMessage;
      } catch (err) {
        this.log('warn', 'Failed to parse WS message', err);
        return;
      }
      this.dispatch(msg);
    };

    this.ws.onclose = (event) => {
      this.log('info', `WebSocket close code=${event.code} wasClean=${event.wasClean}`);
      // Backend uses close code 1008 untuk auth failure (token expired/rotated/
      // mismatch). Setelah 3 percobaan auth-fail beruntun, stop loop reconnect
      // dan biarkan caller refetch token via /api/auth/ws-token.
      if (event.code === 1008) {
        this.authFailures += 1;
        if (this.authFailures >= 3) {
          this.log('error', 'WebSocket auth failed 3x — stopping reconnect, token refetch needed');
          this.closedByUser = true;
          return;
        }
      } else {
        this.authFailures = 0;
      }
      if (!this.closedByUser) this.scheduleReconnect();
    };

    this.ws.onerror = (err) => {
      this.log('error', 'WebSocket error', err);
      // Let onclose handle reconnect
    };
  }

  subscribe(topic: WSTopic): () => void {
    const payload = JSON.stringify({ type: 'subscribe', topic });
    this.subscriptions.add(payload);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    }
    return () => {
      this.subscriptions.delete(payload);
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'unsubscribe', topic }));
      }
    };
  }

  on<T extends WSMessage['type']>(
    type: T,
    listener: Listener<Extract<WSMessage, { type: T }>>,
  ): () => void {
    const set = this.listeners.get(type) ?? new Set<Listener>();
    set.add(listener as Listener);
    this.listeners.set(type, set);
    return () => {
      const current = this.listeners.get(type);
      current?.delete(listener as Listener);
    };
  }

  close(): void {
    this.closedByUser = true;
    if (this.ws) {
      this.ws.close(1000, 'client closing');
      this.ws = null;
    }
    this.subscriptions.clear();
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private dispatch(msg: WSMessage): void {
    const listeners = this.listeners.get(msg.type);
    if (!listeners) return;
    for (const l of listeners) {
      try {
        l(msg);
      } catch (err) {
        this.log('error', 'listener threw', err);
      }
    }
  }

  private send(payload: unknown): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(payload));
  }

  private scheduleReconnect(): void {
    if (this.closedByUser) return;
    const backoff = Math.min(1000 * 2 ** this.reconnectAttempts, this.maxBackoffMs);
    this.reconnectAttempts += 1;
    this.log('info', `Reconnecting in ${backoff}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), backoff);
  }
}

/**
 * Helper to create the singleton most pages need. Pass fresh token on
 * every call — component owns its own instance.
 */
export function createBabahalgoWS(token: string, options: Partial<BabahalgoWSOptions> = {}): BabahalgoWS {
  return new BabahalgoWS({ ...options, token });
}
