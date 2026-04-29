import Image from 'next/image';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  /** Total rendered height in px. Width auto-derived from natural 4:1 ratio. */
  height?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
}

/**
 * Single source of truth for the BabahAlgo header logo.
 *
 * Source PNGs are non-square (~4:1 ratio: 699x175 dark, 714x173 light) so we
 * pass `style={{ height: 'auto' }}` to ensure Next/Image preserves intrinsic
 * aspect — Tailwind h-* classes alone can stretch the image when w/h attribs
 * disagree with the natural ratio.
 *
 * Renders both dark + light variant with `dark:hidden` / `hidden dark:block`
 * so a single component handles theme switching.
 */
export function BrandLogo({
  height = 36,
  className = '',
  priority = false,
  alt = 'BabahAlgo',
}: BrandLogoProps) {
  // Provide a consistent intrinsic ratio (~4:1) for layout shift prevention.
  // Browser will auto-scale to the actual height via style.height = auto.
  const intrinsicHeight = 60;
  const intrinsicWidth = 240;

  return (
    <>
      <Image
        src="/logo/babahalgo-header-dark.png"
        alt={alt}
        width={intrinsicWidth}
        height={intrinsicHeight}
        priority={priority}
        className={cn('w-auto hidden dark:block', className)}
        style={{ height: 'auto', maxHeight: height }}
      />
      <Image
        src="/logo/babahalgo-header-light.png"
        alt={alt}
        width={intrinsicWidth}
        height={intrinsicHeight}
        priority={priority}
        className={cn('w-auto dark:hidden', className)}
        style={{ height: 'auto', maxHeight: height }}
      />
    </>
  );
}
