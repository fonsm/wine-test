// Pre-rendered template thumbnails (thumbnails/*.png), made by `npm run thumbnails`. Static
// images keep the first page load small: live thumbnails would load every bundled font at once.
import type { Design } from '../model/schema';

/** Longer side of a thumbnail in pixels (sharp on 2× screens at about 70 CSS pixels). */
export const THUMBNAIL_PX = 160;

const urls = import.meta.glob<string>('./thumbnails/*.png', {
  query: '?url',
  import: 'default',
  eager: true,
});

/** URL of a template's thumbnail (an image file of the app itself), or null if there is none. */
export function thumbnailUrl(templateId: string): string | null {
  return urls[`./thumbnails/${templateId}.png`] ?? null;
}

/** SHA-256 of a template's content: shows whether its thumbnail is still up to date. */
export async function templateChecksum(design: Design): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(design));
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(hash, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
