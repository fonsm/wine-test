import { describe, expect, it } from 'vitest';
import { FONTS } from '../fonts/fonts';
import { createI18n } from '../i18n';
import {
  createEmptyDesign,
  designSchema,
  DEFAULT_TEMPLATE_ID,
  type Design,
  type DesignElement,
} from '../model/schema';
import { BLEED_MM, SAFE_MARGIN_MM } from '../print/geometry';
import { BOTTLES, TEMPLATES, loadTemplates, templateDesign } from './catalog';

const rawFiles = import.meta.glob('./data/templates/*.json', { eager: true, import: 'default' });

/** Axis-aligned bounds of an element after its rotation around the box centre. */
function bounds(element: DesignElement) {
  const radians = (element.rotation * Math.PI) / 180;
  const halfW =
    (Math.abs(Math.cos(radians)) * element.width + Math.abs(Math.sin(radians)) * element.height) /
    2;
  const halfH =
    (Math.abs(Math.sin(radians)) * element.width + Math.abs(Math.cos(radians)) * element.height) /
    2;
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  return { left: cx - halfW, right: cx + halfW, top: cy - halfH, bottom: cy + halfH };
}

describe('template files', () => {
  it('has at least three designed templates plus the empty label', () => {
    const files = Object.keys(rawFiles);
    expect(files.length).toBeGreaterThanOrEqual(4);
    expect(TEMPLATES.map((template) => template.id)).toEqual([
      'blank',
      'classic',
      'elegant',
      'modern',
    ]);
  });

  for (const [path, data] of Object.entries(rawFiles)) {
    describe(path, () => {
      it('validates against the design schema', () => {
        const result = designSchema.safeParse(data);
        expect(result.error?.issues ?? []).toEqual([]);
      });

      it('has the file name as its templateId', () => {
        expect(path).toBe(`./data/templates/${(data as Design).templateId}.json`);
      });

      const design = data as Design;

      it('uses only bundled fonts and no images (owner decision: text and shapes only)', () => {
        const families = FONTS.map((font) => font.family);
        for (const element of design.elements) {
          if (element.type === 'text') expect(families).toContain(element.style.fontFamily);
          expect(element.type).not.toBe('image');
        }
        expect(design.assets).toEqual({});
      });

      it('keeps every element within the bleed, and text within the safe margin', () => {
        const { widthMm, heightMm } = design.labelSize;
        for (const element of design.elements) {
          const box = bounds(element);
          const margin = element.type === 'text' ? -SAFE_MARGIN_MM : BLEED_MM;
          expect(box.left, element.id).toBeGreaterThanOrEqual(-margin - 1e-9);
          expect(box.top, element.id).toBeGreaterThanOrEqual(-margin - 1e-9);
          expect(box.right, element.id).toBeLessThanOrEqual(widthMm + margin + 1e-9);
          expect(box.bottom, element.id).toBeLessThanOrEqual(heightMm + margin + 1e-9);
        }
      });

      it('uses the default bottle', () => {
        expect(BOTTLES.map((bottle) => bottle.id)).toContain(design.bottleId);
      });
    });
  }

  it('the empty label is the same as a new design', () => {
    expect(templateDesign(DEFAULT_TEMPLATE_ID)).toEqual(createEmptyDesign());
  });

  it('designed templates are not empty', () => {
    for (const template of TEMPLATES.filter((each) => each.id !== DEFAULT_TEMPLATE_ID)) {
      expect(template.design.elements.length, template.id).toBeGreaterThanOrEqual(4);
    }
  });

  it('has a name for every template and bottle in German and English', () => {
    for (const language of ['de', 'en'] as const) {
      const { t } = createI18n(language);
      for (const { id } of TEMPLATES) {
        expect(t(`templates:templateNames.${id}`), `${language} ${id}`).not.toContain('templates:');
      }
      for (const { id } of BOTTLES) {
        expect(t(`templates:bottleNames.${id}`), `${language} ${id}`).not.toContain('templates:');
      }
    }
  });
});

describe('loadTemplates', () => {
  const file = (templateId: string) => ({ ...createEmptyDesign(), templateId });

  it('sorts templates with the empty label first', () => {
    const templates = loadTemplates({
      './data/templates/zebra.json': file('zebra'),
      './data/templates/blank.json': file('blank'),
      './data/templates/apple.json': file('apple'),
    });
    expect(templates.map((template) => template.id)).toEqual(['blank', 'apple', 'zebra']);
  });

  it('refuses an invalid file and names it', () => {
    expect(() =>
      loadTemplates({ './data/templates/broken.json': { ...file('broken'), elements: 'none' } }),
    ).toThrow(/broken\.json.*elements/);
  });

  it('refuses a file whose templateId does not match its file name', () => {
    expect(() => loadTemplates({ './data/templates/a.json': file('b') })).toThrow(/a\.json/);
  });

  it('returns a fresh copy, so changing a design never changes the template', () => {
    const first = templateDesign('classic');
    first.elements.length = 0;
    expect(templateDesign('classic').elements.length).toBeGreaterThan(0);
  });
});
