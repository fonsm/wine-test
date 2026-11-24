import { describe, expect, it } from 'vitest';
import { LABEL_HEIGHT_MM, LABEL_WIDTH_MM } from '../print/geometry';
import {
  CURRENT_SCHEMA_VERSION,
  DESIGN_FILE_FORMAT,
  createEmptyDesign,
  designSchema,
  type Design,
} from './schema';
import { JPEG_DATA_URL, PNG_DATA_URL, SVG_DATA_URL, sampleDesign } from './testing/fixtures';

function issuesOf(value: unknown): string[] {
  const result = designSchema.safeParse(value);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

const withElement = (patch: Record<string, unknown>, index = 2): unknown => {
  const design = sampleDesign();
  return {
    ...design,
    elements: design.elements.map((element, i) =>
      i === index ? { ...element, ...patch } : element,
    ),
  };
};

describe('createEmptyDesign', () => {
  it('creates a valid design with the label size from the print geometry', () => {
    const design = createEmptyDesign();
    expect(designSchema.parse(design)).toEqual(design);
    expect(design).toMatchObject({
      format: DESIGN_FILE_FORMAT,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      labelSize: { widthMm: LABEL_WIDTH_MM, heightMm: LABEL_HEIGHT_MM },
      elements: [],
      assets: {},
    });
  });
});

describe('designSchema', () => {
  it('accepts a design with text, image and shape elements', () => {
    expect(issuesOf(sampleDesign())).toEqual([]);
  });

  it('keeps the element order', () => {
    const parsed = designSchema.parse(sampleDesign());
    expect(parsed.elements.map((element) => element.id)).toEqual(['bg', 'frame', 'title', 'logo']);
  });

  it('keeps HTML-like text unchanged as plain data', () => {
    const parsed = designSchema.parse(sampleDesign());
    const title = parsed.elements.find((element) => element.id === 'title');
    expect(title?.type === 'text' && title.text).toContain('<script>alert(1)</script>');
  });

  it('missing fields: reports the path of each missing field', () => {
    const noTemplate: Partial<Design> = sampleDesign();
    delete noTemplate.templateId;
    expect(issuesOf(noTemplate)).toEqual(['templateId']);

    const design = sampleDesign();
    const noWidth: Record<string, unknown> = { ...design.elements[0] };
    delete noWidth.width;
    expect(issuesOf({ ...design, elements: [noWidth, ...design.elements.slice(1)] })).toEqual([
      'elements.0.width',
    ]);
  });

  it('rejects unknown element types and unknown fields', () => {
    expect(issuesOf(withElement({ type: 'video' }))).toContain('elements.2.type');
    expect(issuesOf({ ...sampleDesign(), extra: true })).toEqual(['']);
    expect(issuesOf(withElement({ onclick: 'x' }))).toEqual(['elements.2']);
  });

  it('rejects invalid numbers', () => {
    expect(issuesOf(withElement({ width: 0 }))).toEqual(['elements.2.width']);
    expect(issuesOf(withElement({ height: -1 }))).toEqual(['elements.2.height']);
    expect(issuesOf(withElement({ x: Number.NaN }))).toEqual(['elements.2.x']);
    expect(issuesOf(withElement({ y: 1e9 }))).toEqual(['elements.2.y']);
    expect(issuesOf(withElement({ rotation: 360 }))).toEqual(['elements.2.rotation']);
    expect(issuesOf(withElement({ opacity: 1.5 }))).toEqual(['elements.2.opacity']);
  });

  it('rejects invalid colours', () => {
    const design = sampleDesign();
    const title = design.elements[2];
    if (title?.type !== 'text') throw new Error('fixture changed');
    expect(issuesOf(withElement({ style: { ...title.style, color: 'red' } }))).toEqual([
      'elements.2.style.color',
    ]);
  });

  it('rejects duplicate element ids', () => {
    expect(issuesOf(withElement({ id: 'bg' }))).toEqual(['elements.2.id']);
  });

  it('rejects image elements that reference a missing asset', () => {
    expect(issuesOf(withElement({ assetId: 'nope' }, 0))).toEqual(['elements.0.assetId']);
  });

  it('accepts PNG and JPEG data URLs whose content matches the declared type', () => {
    expect(
      issuesOf({ ...sampleDesign(), assets: { 'img-1': { dataUrl: JPEG_DATA_URL } } }),
    ).toEqual([]);
  });

  it('rejects SVG, other URLs and data URLs whose content does not match', () => {
    const asset = (dataUrl: string) =>
      issuesOf({ ...sampleDesign(), assets: { 'img-1': { dataUrl } } });
    expect(asset(SVG_DATA_URL)).toEqual(['assets.img-1.dataUrl']);
    expect(asset('https://example.com/a.png')).toEqual(['assets.img-1.dataUrl']);
    expect(asset(PNG_DATA_URL.replace('image/png', 'image/jpeg'))).toEqual([
      'assets.img-1.dataUrl',
    ]);
    expect(asset('data:image/png;base64,not base64!')).toEqual(['assets.img-1.dataUrl']);
  });

  it('rejects asset ids that could pollute object prototypes', () => {
    const json = `{"__proto__": {"dataUrl": "${PNG_DATA_URL}"}}`;
    const assets: unknown = JSON.parse(json);
    expect(issuesOf({ ...sampleDesign(), assets })).not.toEqual([]);
  });

  it('rejects template and bottle ids that are not simple slugs', () => {
    expect(issuesOf({ ...sampleDesign(), templateId: '<b>x</b>' })).toEqual(['templateId']);
    expect(issuesOf({ ...sampleDesign(), bottleId: '' })).toEqual(['bottleId']);
  });

  it('accepts label sizes from 30 to 300 mm only', () => {
    const size = (widthMm: number, heightMm: number) =>
      issuesOf({ ...sampleDesign(), labelSize: { widthMm, heightMm } });
    expect(size(100, 140)).toEqual([]);
    expect(size(29, 140)).toEqual(['labelSize.widthMm']);
    expect(size(100, 301)).toEqual(['labelSize.heightMm']);
  });
});
