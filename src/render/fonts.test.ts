import { describe, expect, it } from 'vitest';
import { sampleDesign } from '../model/testing/fixtures';
import type { TextElement } from '../model/schema';
import { designFontSpecs } from './fonts';

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
