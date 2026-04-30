'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Coins, Search, X } from 'lucide-react';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

const SYMBOL_COPY = {
  id: {
    placeholder: 'Pilih simbol trading…',
    loading: 'Memuat simbol…',
    search: 'Cari simbol atau deskripsi…',
    no_match: 'Tidak ada simbol yang cocok.',
    clear: 'Hapus pilihan',
  },
  en: {
    placeholder: 'Select trading symbol…',
    loading: 'Loading symbols…',
    search: 'Search symbol or description…',
    no_match: 'No matching symbol.',
    clear: 'Clear selection',
  },
} as const;
import {
  STATIC_SYMBOL_CATALOG,
  fetchSymbols,
  formatSymbolLabel,
  resolveCanonicalSymbol,
  type SymbolAssetClass,
  type TradingSymbol,
} from '@/lib/trading/symbols';

/**
 * Multi-broker-aware symbol selector per ADR-013.
 *
 * Customers MUST NOT type symbols manually — component fetches the
 * broker-canonical catalog from the backend and renders a filterable
 * dropdown. Emits the canonical form via onChange so order submission
 * is broker-agnostic.
 *
 * Fallback: if backend unreachable, component renders the static seed
 * catalog so the UI is always usable.
 */
export interface SymbolSelectorProps {
  /** Controlled selected symbol (canonical). If omitted, internal state is used. */
  value?: string;
  /** Callback emitting canonical symbol when user picks from dropdown */
  onChange: (canonicalSymbol: string, symbol: TradingSymbol) => void;
  /** Optional MT5 login for VPS_INSTALLATION customer broker-canonical mapping */
  mt5Login?: string;
  /** Filter to specific asset classes. Default: all. */
  assetClass?: SymbolAssetClass | SymbolAssetClass[];
  /** Force use of static catalog (dev / offline mode) */
  forceStatic?: boolean;
  /** Disable the component */
  disabled?: boolean;
  /** Placeholder when no symbol selected */
  placeholder?: string;
  className?: string;
}

export function SymbolSelector({
  value,
  onChange,
  mt5Login,
  assetClass,
  forceStatic,
  disabled,
  placeholder,
  className,
}: SymbolSelectorProps) {
  const localeRaw = useLocale();
  const locale: 'id' | 'en' = localeRaw === 'en' ? 'en' : 'id';
  const t = SYMBOL_COPY[locale];
  const effectivePlaceholder = placeholder ?? t.placeholder;

  const [symbols, setSymbols] = useState<TradingSymbol[]>(() => [...STATIC_SYMBOL_CATALOG]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'backend' | 'static'>('static');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (forceStatic) {
      setSymbols([...STATIC_SYMBOL_CATALOG]);
      setSource('static');
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    fetchSymbols({ mt5Login, assetClass, signal: ac.signal })
      .then((list) => {
        setSymbols(list);
        setSource(list[0]?.source ?? 'static');
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [mt5Login, assetClass, forceStatic]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return symbols;
    return symbols.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        (s.canonical ?? '').toLowerCase().includes(q),
    );
  }, [symbols, query]);

  const grouped = useMemo(() => {
    const byClass = new Map<SymbolAssetClass, TradingSymbol[]>();
    for (const s of filtered) {
      const arr = byClass.get(s.assetClass) ?? [];
      arr.push(s);
      byClass.set(s.assetClass, arr);
    }
    return Array.from(byClass.entries());
  }, [filtered]);

  const selected = useMemo(
    () => symbols.find((s) => resolveCanonicalSymbol(s) === value) ?? null,
    [symbols, value],
  );

  const handleSelect = useCallback(
    (s: TradingSymbol) => {
      onChange(resolveCanonicalSymbol(s), s);
      setOpen(false);
      setQuery('');
    },
    [onChange],
  );

  return (
    <div className={cn('relative inline-block w-full max-w-md', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background text-left text-sm',
          'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Coins className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
        {selected ? (
          <>
            <span className="font-semibold">{selected.symbol}</span>
            <span className="text-xs text-muted-foreground truncate">— {selected.description}</span>
            {selected.tradeMode !== 'full' && (
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 font-mono uppercase">
                {selected.tradeMode.replace('_', ' ')}
              </span>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">{loading ? t.loading : effectivePlaceholder}</span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-xl max-h-[60vh] overflow-hidden flex flex-col">
          <div className="p-2 border-b border-border flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.search}
              className="flex-1 bg-transparent text-sm outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label={t.clear}>
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {source}
            </span>
          </div>

          <div className="overflow-y-auto flex-1">
            {grouped.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">{t.no_match}</div>
            ) : (
              grouped.map(([cls, list]) => (
                <div key={cls}>
                  <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30 font-mono">
                    {cls}
                  </div>
                  {list.map((s) => {
                    const isSelected = resolveCanonicalSymbol(s) === value;
                    const disabledRow = s.tradeMode === 'disabled';
                    return (
                      <button
                        key={s.symbol}
                        type="button"
                        disabled={disabledRow}
                        onClick={() => handleSelect(s)}
                        className={cn(
                          'w-full px-3 py-2 flex items-center gap-2 text-sm text-left',
                          'hover:bg-accent hover:text-accent-foreground',
                          isSelected && 'bg-primary/10 text-primary font-medium',
                          disabledRow && 'opacity-40 cursor-not-allowed',
                        )}
                      >
                        <span className="font-mono font-semibold w-20 shrink-0">{s.symbol}</span>
                        <span className="text-xs text-muted-foreground truncate flex-1">{s.description}</span>
                        {typeof s.spreadPips === 'number' && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            spread {s.spreadPips.toFixed(1)}p
                          </span>
                        )}
                        {s.tradeMode !== 'full' && (
                          <span className="text-[10px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-200 font-mono uppercase">
                            {s.tradeMode.replace('_', ' ')}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="p-2 border-t border-border text-[10px] text-muted-foreground text-center">
            {formatSymbolLabel.length > 0 && `${filtered.length} simbol — `}
            broker-canonical resolver {source === 'backend' ? 'live' : 'fallback'}
          </div>
        </div>
      )}
    </div>
  );
}
