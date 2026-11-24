import { describe, expect, it } from 'vitest';
import { EXPORT_DPI, labelSizeWithBleedPx } from '../print/geometry';
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  MAX_IMAGE_MEGAPIXELS,
  MAX_IMAGE_SIDE_PX,
  MIN_RECOMMENDED_SIZE_PX,
} from './limits';

describe('upload limits', () => {
  it('allows files up to 10 MB', () => {
    expect(MAX_FILE_SIZE_MB).toBe(10);
    expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
  });

  it('limits images to 8000 px per side and 40 megapixels', () => {
    expect(MAX_IMAGE_SIDE_PX).toBe(8000);
    expect(MAX_IMAGE_MEGAPIXELS).toBe(40);
  });

  it('derives the recommended minimum size from the label geometry', () => {
    expect(MIN_RECOMMENDED_SIZE_PX).toEqual(labelSizeWithBleedPx(EXPORT_DPI));
  });
});
