'use client';

import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';

interface JsonTextareaProps {
  value: unknown;
  onChange: (parsed: unknown) => void;
  rows?: number;
  /** Reset the local draft when this changes (e.g. the edited item's id). */
  resetKey?: string | number;
}

/**
 * JSON editor that reflects every keystroke — even transiently-invalid JSON —
 * instead of snapping back to the last valid value, and surfaces an inline parse
 * error. Commits the parsed value to the parent only when the JSON is valid, so
 * the field never feels frozen and structural errors aren't silently lost.
 * Centralized so the landing + pages CMS editors share one implementation. (P2-BUG-5)
 */
export function JsonTextarea({ value, onChange, rows = 6, resetKey }: JsonTextareaProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setDraft(null); setError(null); }, [resetKey]);

  const text = draft ?? JSON.stringify(value, null, 2);

  return (
    <div>
      <Textarea
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          try {
            const parsed: unknown = JSON.parse(v);
            setError(null);
            onChange(parsed);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Invalid JSON');
          }
        }}
        rows={rows}
        className="font-mono text-xs"
      />
      {error && <p className="mt-1 text-xs text-rose-500">JSON tidak valid: {error}</p>}
    </div>
  );
}
