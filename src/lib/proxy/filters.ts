// Response filters — strip sensitive fields before sending to clients

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function omitKeys(obj: Record<string, JsonValue>, keys: string[]): Record<string, JsonValue> {
  const result: Record<string, JsonValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!keys.includes(k)) {
      result[k] = v;
    }
  }
  return result;
}

// /api/scalping/status — hide internal strategy IP
export function filterScalpingStatus(data: Record<string, JsonValue>): Record<string, JsonValue> {
  const filtered = { ...data };

  // Remove strategy_mode.entry_matrix (internal IP)
  if (filtered.strategy_mode && typeof filtered.strategy_mode === 'object' && !Array.isArray(filtered.strategy_mode)) {
    filtered.strategy_mode = omitKeys(
      filtered.strategy_mode as Record<string, JsonValue>,
      ['entry_matrix']
    );
  }

  // Remove ai_state.last_reasoning (prompt engineering IP)
  if (filtered.ai_state && typeof filtered.ai_state === 'object' && !Array.isArray(filtered.ai_state)) {
    filtered.ai_state = omitKeys(
      filtered.ai_state as Record<string, JsonValue>,
      ['last_reasoning', 'prompt_tokens', 'model_config']
    );
  }

  return filtered;
}

// /api/positions — hide lot_audit, commission breakdown
export function filterPositions(
  positions: Record<string, JsonValue>[]
): Record<string, JsonValue>[] {
  return positions.map((pos) =>
    omitKeys(pos, ['lot_audit', 'entry_commission_usd', 'confluence_score', 'signal_data'])
  );
}

// /api/trades/history — hide signal_data, merge commission into net_pnl
export function filterTradeHistory(
  trades: Record<string, JsonValue>[]
): Record<string, JsonValue>[] {
  return trades.map((trade) => {
    const filtered = omitKeys(trade, ['signal_data', 'commission_usd', 'confluence_detail']);
    return filtered;
  });
}

// /api/scanner/status — replace raw scores with labels
export function filterScannerStatus(data: Record<string, JsonValue>): Record<string, JsonValue> {
  if (!data || typeof data !== 'object') return data;

  const filtered = { ...data };

  // Replace raw score breakdowns with simplified labels
  if (filtered.pairs && Array.isArray(filtered.pairs)) {
    filtered.pairs = (filtered.pairs as Record<string, JsonValue>[]).map((pair) => {
      const simplified = omitKeys(pair, [
        'smc_score', 'wyckoff_score', 'qm_score', 'ao_score',
        'confluence_detail', 'raw_indicators'
      ]);
      // Add simplified label based on overall score
      const score = pair.total_score as number || 0;
      simplified.status_label = score >= 70 ? 'AKTIF' : score >= 40 ? 'STANDBY' : 'OFF';
      return simplified;
    });
  }

  return filtered;
}
