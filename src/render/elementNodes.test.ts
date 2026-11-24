import { describe, expect, it } from 'vitest';
import { sampleDesign } from '../model/testing/fixtures';
import type { DesignElement, ShapeElement } from '../model/schema';
import { pointsToMm } from '../editor/units';
import { elementNode, imagePlacement, konvaFontStyle } from './elementNodes';

const PX_PER_MM = 4;

function element(id: string): DesignElement {
  const found = sampleDesign().elements.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`no element ${id}`);
  return found;
}

function shape(kind: ShapeElement['shape'], style: Partial<ShapeElement['style']> = {}) {
  return {
    ...(element('frame') as ShapeElement),
    shape: kind,
    style: { fill: '#ff0000', stroke: null, strokeWidthMm: 0, cornerRadiusMm: 0, ...style },
  };
}

describe('konvaFontStyle', () => {
  it('combines style and weight the way Konva expects', () => {
    expect(konvaFontStyle('normal', 'normal')).toBe('normal');
    expect(konvaFontStyle('normal', 'bold')).toBe('bold');
    expect(konvaFontStyle('italic', 'normal')).toBe('italic');
    expect(konvaFontStyle('italic', 'bold')).toBe('italic bold');
  });
});

describe('imagePlacement', () => {
  it('stretches to the box', () => {
    expect(imagePlacement('stretch', 100, 50, 40, 40)).toEqual({
      x: 0,
      y: 0,
      width: 40,
      height: 40,
    });
  });

  it('covers the box by cropping the middle of the image', () => {
    // A 2:1 image in a square box: the middle half of its width is shown.
    expect(imagePlacement('cover', 200, 100, 40, 40)).toEqual({
      x: 0,
      y: 0,
      width: 40,
      height: 40,
      crop: { x: 50, y: 0, width: 100, height: 100 },
    });
  });

  it('fits the whole image inside the box, centred', () => {
    expect(imagePlacement('contain', 200, 100, 40, 40)).toEqual({
      x: 0,
      y: 10,
      width: 40,
      height: 20,
    });
  });

  it('stretches images without a known size instead of dividing by zero', () => {
    expect(imagePlacement('cover', 0, 0, 40, 30)).toEqual({ x: 0, y: 0, width: 40, height: 30 });
  });
});

describe('elementNode', () => {
  it('describes a text element in pixels', () => {
    const title = element('title');
    if (title.type !== 'text') throw new Error('expected text');
    const node = elementNode(title, sampleDesign(), PX_PER_MM, () => null);
    expect(node).toEqual({
      kind: 'text',
      config: {
        width: title.width * PX_PER_MM,
        height: title.height * PX_PER_MM,
        text: title.text,
        fontFamily: 'serif',
        fontSize: pointsToMm(18) * PX_PER_MM,
        fontStyle: 'italic bold',
        lineHeight: 1.2,
        align: 'center',
        fill: '#1a1a1aff',
        wrap: 'word',
        listening: false,
      },
    });
  });

  it('describes an image once it is decoded, and nothing before', () => {
    const logo = element('logo');
    const design = sampleDesign();
    expect(elementNode(logo, design, PX_PER_MM, () => null)).toBeNull();

    const image = { naturalWidth: 10, naturalHeight: 20 } as HTMLImageElement;
    const requested: string[] = [];
    const node = elementNode(logo, design, PX_PER_MM, (dataUrl) => {
      requested.push(dataUrl);
      return image;
    });
    expect(requested).toEqual([design.assets['img-1']?.dataUrl]);
    // 20 × 20 mm box, contain: 40 × 80 px image scaled into 80 × 80 px.
    expect(node).toEqual({
      kind: 'image',
      config: { image, x: 20, y: 0, width: 40, height: 80, listening: false },
    });
  });

  it('describes rectangles with stroke and rounded corners', () => {
    const frame = element('frame');
    expect(elementNode(frame, sampleDesign(), PX_PER_MM, () => null)).toEqual({
      kind: 'rect',
      config: {
        width: 80 * PX_PER_MM,
        height: 110 * PX_PER_MM,
        fill: undefined,
        stroke: '#7b1e3a',
        strokeWidth: 0.5 * PX_PER_MM,
        cornerRadius: 2 * PX_PER_MM,
        listening: false,
      },
    });
  });

  it('describes ellipses filling the box', () => {
    const node = elementNode(shape('ellipse'), sampleDesign(), PX_PER_MM, () => null);
    expect(node).toEqual({
      kind: 'ellipse',
      config: {
        x: 160,
        y: 220,
        radiusX: 160,
        radiusY: 220,
        fill: '#ff0000',
        stroke: undefined,
        strokeWidth: 0,
        listening: false,
      },
    });
  });

  it('draws lines through the middle, at least 1 px wide, in the fill colour without a stroke', () => {
    const node = elementNode(shape('line'), sampleDesign(), PX_PER_MM, () => null);
    expect(node).toEqual({
      kind: 'line',
      config: { points: [0, 220, 320, 220], stroke: '#ff0000', strokeWidth: 1, listening: false },
    });
  });
});
