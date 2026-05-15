'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';

/**
 * Reusable image upload field — text input untuk URL manual + file picker
 * yang upload ke POST /api/admin/upload + auto-fill URL.
 *
 * Dipakai di:
 * - admin/cms/popups (popup image)
 * - admin/cms/banners (banner image)
 * - admin/settings (company logo)
 * - admin/cms/landing-sections (section media)
 *
 * Props:
 * - value: current image URL (controlled)
 * - onChange: callback saat URL berubah (manual atau hasil upload)
 * - label: field label
 * - preview: show inline preview dari URL (default: true)
 */
export interface ImageUploadFieldProps {
  value: string | null | undefined;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  preview?: boolean;
  disabled?: boolean;
}

export function ImageUploadField({
  value,
  onChange,
  label = 'Image URL',
  placeholder = 'https://... atau upload file',
  preview = true,
  disabled,
}: ImageUploadFieldProps) {
  const { getAuthHeaders } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);

    try {
      // Validate file size (5MB max sesuai API)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File terlalu besar — max 5 MB');
      }

      const formData = new FormData();
      formData.append('file', file);

      const headers = { ...getAuthHeaders() } as Record<string, string>;
      // FormData auto-sets Content-Type with boundary; remove our explicit header.
      delete headers['Content-Type'];

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Upload failed (${res.status})`);
      }

      const data = await res.json();
      if (!data.url) {
        throw new Error('Upload response missing URL');
      }

      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown upload error');
    } finally {
      setUploading(false);
      // Reset file input supaya bisa upload file sama lagi kalau perlu
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium block">{label}</label>

      {/* URL input + Upload button row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || uploading}
          className="flex-1"
        />
        <div className="flex gap-2 shrink-0">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            onChange={handleFileSelect}
            disabled={disabled || uploading}
            className="hidden"
            aria-label="Pilih file gambar"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className="shrink-0"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Upload…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" /> Upload
              </>
            )}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange('')}
              disabled={disabled || uploading}
              aria-label="Clear image"
              className="shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-rose-400 flex items-center gap-1.5">
          <X className="w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      )}

      {/* Preview thumbnail */}
      {preview && value && !error && (
        <div className="mt-2 flex items-center gap-3 p-2 rounded-md border border-border/60 bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Preview"
            className="w-16 h-16 object-cover rounded border border-border/40"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-foreground/70 break-all line-clamp-2">{value}</p>
          </div>
          <ImageIcon className="w-4 h-4 text-foreground/40 shrink-0" />
        </div>
      )}

      <p className="text-xs text-foreground/50">
        Upload file (max 5 MB, JPEG/PNG/WebP/GIF/SVG) atau paste URL eksternal.
      </p>
    </div>
  );
}
