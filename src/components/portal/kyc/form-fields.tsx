'use client';

/**
 * Shared form primitives for KYC wizard steps.
 * Field, Select, UploadField — extracted from page.tsx verbatim.
 */
import { useRef } from 'react';
import Image from 'next/image';
import {
  AlertCircle, Loader2, CheckCircle2, Upload, Camera, FileText, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/format-locale';
import type { DocKind, DocUploadState, KycSummary } from './types';

// ─── Field ───────────────────────────────────────────────────────────────
export function Field({
  label, value, onChange, type = 'text', required, textarea, rows, hint, error, autoComplete, min, max, inputMode, mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  textarea?: boolean;
  rows?: number;
  hint?: string;
  error?: string;
  autoComplete?: string;
  min?: string;
  max?: string;
  inputMode?: 'numeric' | 'text';
  mono?: boolean;
}) {
  const baseInputCls = cn(
    'w-full text-sm rounded-md border bg-background px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2',
    error
      ? 'border-rose-500/50 focus-visible:ring-rose-500/50'
      : 'border-input focus-visible:ring-ring',
    mono && 'font-mono',
  );
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label}{required && <span className="text-rose-600 dark:text-rose-400 ml-0.5">*</span>}
      </label>
      {textarea ? (
        <textarea
          required={required}
          rows={rows ?? 3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(baseInputCls, 'resize-y')}
        />
      ) : (
        <input
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputCls}
          autoComplete={autoComplete}
          min={min}
          max={max}
          inputMode={inputMode}
        />
      )}
      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

// ─── Select ──────────────────────────────────────────────────────────────
export function Select({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-card">{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── UploadField ─────────────────────────────────────────────────────────
export function UploadField({
  kind, label, hint, state, summary, onUpload, showError, locale,
}: {
  kind: DocKind;
  label: string;
  hint: string;
  state: DocUploadState;
  summary: KycSummary | null;
  onUpload: (file: File) => Promise<void>;
  showError?: string;
  locale: Locale;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isEn = locale === 'en';
  const previewSrc = state.uploaded && summary?.docVersion
    ? `/api/kyc/document?kind=${kind}&v=${encodeURIComponent(summary.docVersion)}`
    : null;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    void onUpload(file);
    // Reset input so user bisa re-upload file dengan nama sama
    e.target.value = '';
  }

  const showErr = showError ?? state.error;

  return (
    <div className="rounded-md border border-input bg-background/50 p-4">
      <div className="flex items-start gap-4">
        {/* Preview thumbnail */}
        <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded border border-border/60 bg-muted/40 overflow-hidden flex items-center justify-center relative">
          {previewSrc ? (
            <Image
              src={previewSrc}
              alt={label}
              fill
              unoptimized
              className="object-cover"
              sizes="96px"
            />
          ) : kind === 'selfie' ? (
            <Camera className="w-8 h-8 text-muted-foreground/40" />
          ) : (
            <FileText className="w-8 h-8 text-muted-foreground/40" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{hint}</p>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture={kind === 'selfie' ? 'user' : undefined}
              onChange={handleFile}
              className="hidden"
            />
            <Button
              type="button"
              variant={state.uploaded ? 'outline' : 'default'}
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={state.uploading}
            >
              {state.uploading ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> {isEn ? 'Uploading…' : 'Mengupload…'}</>
              ) : state.uploaded ? (
                <><CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600 dark:text-emerald-400" /> {isEn ? 'Replace' : 'Ganti foto'}</>
              ) : (
                <><Upload className="w-4 h-4 mr-1.5" /> {isEn ? 'Choose file' : 'Pilih file'}</>
              )}
            </Button>
            {state.uploaded && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isEn ? 'Uploaded' : 'Terupload'}
              </span>
            )}
          </div>

          {showErr && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span className="break-words">{showErr}</span>
            </p>
          )}
        </div>

        {state.uploaded && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="shrink-0 p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label={isEn ? 'Replace photo' : 'Ganti foto'}
            title={isEn ? 'Replace photo' : 'Ganti foto'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── SummaryRow ──────────────────────────────────────────────────────────
export function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2 py-1 border-b border-border/40 last:border-0">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className={cn('text-foreground text-right truncate ml-2', mono && 'font-mono')}>
        {value || '—'}
      </dd>
    </div>
  );
}
