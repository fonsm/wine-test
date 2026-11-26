import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleDesign } from '../model/testing/fixtures';
import type { TextElement } from '../model/schema';
import { designFontSpecs, loadFonts, setFontPreparer } from './fonts';

describe('designFontSpecs', () => {
  it('lists each font used by text elements once, sorted', () => {
    const design = sampleDesign();
    const title = design.elements.find((element) => element.type === 'text') as TextElement;
    const second: TextElement = {
      ...title,
      id: 'second',
      style: { ...title.style, fontFamily: 'Inter', fontStyle: 'normal', fontWeight: 'normal' },
    };
    const third: TextElement = { ...second, id: 'third' };
    design.elements.push(second, third);
    expect(designFontSpecs(design)).toEqual([
      'italic bold 16px serif',
      'normal normal 16px "Inter", sans-serif',
    ]);
  });

  it('is empty without text elements', () => {
    const design = sampleDesign();
    design.elements = design.elements.filter((element) => element.type !== 'text');
    expect(designFontSpecs(design)).toEqual([]);
  });
});

describe('loadFonts', () => {
  const loaded: string[] = [];
  vi.stubGlobal('document', {
    fonts: {
      load: (spec: string) => {
        loaded.push(spec);
        return Promise.resolve([]);
      },
    },
  });

  afterEach(() => {
    setFontPreparer(null);
    loaded.length = 0;
  });

  it('loads every font through the browser', async () => {
    await loadFonts(['normal normal 16px "Inter", sans-serif']);
    expect(loaded).toEqual(['normal normal 16px "Inter", sans-serif']);
  });

  it('first lets a preparer make the fonts available (the embedded app, see src/embed)', async () => {
    const order: string[] = [];
    setFontPreparer((specs) => {
      order.push(`prepare ${specs.join('|')}`);
      return Promise.resolve();
    });
    await loadFonts(['a', 'b']);
    order.push(...loaded.map((spec) => `load ${spec}`));
    expect(order).toEqual(['prepare a|b', 'load a', 'load b']);
  });

  it('still loads the fonts when the preparer fails (they fall back to a generic font)', async () => {
    setFontPreparer(() => Promise.reject(new Error('offline')));
    await expect(loadFonts(['a'])).resolves.toBeUndefined();
    expect(loaded).toEqual(['a']);
  });
});
