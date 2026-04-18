/**
 * Signal types used across the dispatch pipeline.
 * Extends the VPS1 signal shape for internal use.
 */

export interface Signal {
  id: number;
  emitted_at: string;
  pair: string;
  direction: 'BUY' | 'SELL';
  entry_type: string;
  confidence: number;
  market_condition: string | null;
  entry_price_hint: number | null;
  take_profit: number | null;
  stop_loss: number | null;
  reasoning: string;
  indicator_snapshot_summary: Record<string, unknown>;
}
