/**
 * Thumbnail generator — converts base64 data URI images to small thumbnails.
 *
 * Uses sharp for server-side resize + WebP compression.
 * Input: base64 data URI (~1MB PNG from AI image gen)
 * Output: base64 data URI (~15-25KB WebP thumbnail)
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('thumbnail');

const THUMB_WIDTH = 400;
const THUMB_QUALITY = 70;

export async function generateThumbnail(
  dataUri: string,
): Promise<string | null> {
  try {
    const match = dataUri.match(/^data:image\/\w+;base64,(.+)$/);
    if (!match) return null;

    const inputBuffer = Buffer.from(match[1], 'base64');

    const sharp = (await import('sharp')).default;
    const outputBuffer = await sharp(inputBuffer)
      .trim({ threshold: 20 })
      .resize(THUMB_WIDTH, undefined, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: THUMB_QUALITY })
      .toBuffer();

    const thumbUri = `data:image/webp;base64,${outputBuffer.toString('base64')}`;
    const ratio = Math.round((1 - outputBuffer.length / inputBuffer.length) * 100);
    log.info(`Thumbnail: ${inputBuffer.length} → ${outputBuffer.length} bytes (-${ratio}%)`);

    return thumbUri;
  } catch (err) {
    log.warn(`Thumbnail generation failed: ${err instanceof Error ? err.message : 'unknown'}`);
    return null;
  }
}
