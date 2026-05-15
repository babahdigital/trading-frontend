import Image from 'next/image';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  /** Max rendered height in px. Width auto-derived from natural 4:1 ratio. */
  height?: number;
  /** Max rendered width in px. Default derived dari height × 4 (intrinsic ratio).
   *  Pakai ini untuk cegah logo "kegencet" di container dengan flex justify
   *  yang membatasi width — img akan tetap respect width:auto + maxWidth. */
  maxWidth?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
}

/**
 * Single source of truth for the BabahAlgo header logo.
 *
 * Source PNGs non-square (~4:1 ratio: 699x175 dark, 714x173 light). Pakai
 * `height: auto` + `max-height` + `max-width` (proportional ke intrinsic
 * 4:1) supaya Next/Image preserve aspect:
 *   - height max-cap → cegah logo terlalu tinggi
 *   - width max-cap → cegah logo terlalu lebar (jadi "kegencet" jadi tipis)
 *
 * Renders both dark + light variant dengan `dark:hidden` / `hidden dark:block`
 * untuk theme switching.
 */
export function BrandLogo({
  height = 36,
  maxWidth,
  className = '',
  priority = false,
  alt = 'BabahAlgo',
}: BrandLogoProps) {
  // Intrinsic 4:1 — derive maxWidth otomatis kalau caller tidak set explicit.
  // Browser scale ke height target + jaga aspect.
  const intrinsicHeight = 60;
  const intrinsicWidth = 240;
  const effectiveMaxWidth = maxWidth ?? Math.round(height * (intrinsicWidth / intrinsicHeight));

  const style: React.CSSProperties = {
    height: 'auto',
    maxHeight: height,
    maxWidth: effectiveMaxWidth,
    width: 'auto',
  };

  return (
    <>
      <Image
        src="/logo/babahalgo-header-dark.png"
        alt={alt}
        width={intrinsicWidth}
        height={intrinsicHeight}
        priority={priority}
        className={cn('hidden dark:block', className)}
        style={style}
      />
      <Image
        src="/logo/babahalgo-header-light.png"
        alt={alt}
        width={intrinsicWidth}
        height={intrinsicHeight}
        priority={priority}
        className={cn('dark:hidden', className)}
        style={style}
      />
    </>
  );
}
