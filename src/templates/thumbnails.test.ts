import { describe, expect, it } from 'vitest';
import { readImageDimensions } from '../upload/sniff';
import { TEMPLATES } from './catalog';
import checksums from './thumbnails/checksums.json';
import { THUMBNAIL_PX, templateChecksum, thumbnailUrl } from './thumbnails';

const pngFiles = import.meta.glob<string>('./thumbnails/*.png', {
  query: '?inline',
  import: 'default',
  eager: true,
});

const RERUN = 'Run "npm run thumbnails" after changing a template.';

function pngSize(dataUrl: string) {
  const bytes = Uint8Array.from(atob(dataUrl.split(',')[1] ?? ''), (char) => char.charCodeAt(0));
  return readImageDimensions(bytes, 'image/png');
}

describe('template thumbnails', () => {
  for (const template of TEMPLATES) {
    describe(template.id, () => {
      it('has a PNG thumbnail with the label proportions, longest side THUMBNAIL_PX', () => {
        const file = pngFiles[`./thumbnails/${template.id}.png`];
        expect(file, `${template.id}.png missing. ${RERUN}`).toBeDefined();
        const size = pngSize(file ?? '');
        const { widthMm, heightMm } = template.design.labelSize;
        expect(Math.max(size?.width ?? 0, size?.height ?? 0)).toBe(THUMBNAIL_PX);
        expect((size?.width ?? 0) / (size?.height ?? 1)).toBeCloseTo(widthMm / heightMm, 1);
      });

      it('was rendered from the current version of the template', async () => {
        const recorded = (checksums as Record<string, string>)[template.id];
        expect(recorded, RERUN).toBe(await templateChecksum(template.design));
      });

      it('has a URL for the gallery', () => {
        expect(thumbnailUrl(template.id)).toMatch(/\.png$|^data:image\/png/);
      });
    });
  }

  it('has no thumbnails for templates that no longer exist', () => {
    const ids = TEMPLATES.map((template) => template.id).sort();
    expect(
      Object.keys(pngFiles)
        .map((path) => path.replace('./thumbnails/', '').replace('.png', ''))
        .sort(),
    ).toEqual(ids);
    expect(Object.keys(checksums).sort()).toEqual(ids);
  });

  it('changes the checksum when a template changes', async () => {
    const design = TEMPLATES[1]?.design;
    if (!design) throw new Error('template missing');
    const changed = { ...design, elements: design.elements.slice(1) };
    expect(await templateChecksum(changed)).not.toBe(await templateChecksum(design));
  });
});
