import { describe, expect, it } from 'vitest';
import bordeaux from '../templates/data/bottles/bordeaux-750.json';
import { MAX_SHOP_BOTTLES, parseEmbedConfig } from './config';

/** A bottle as the shop's Liquid template writes it: the app's bottle fields plus a name. */
const shopBottle = (id: string, name = `Bottle ${id}`) => ({ ...bordeaux, id, name });

const parse = (input: Partial<Parameters<typeof parseEmbedConfig>[0]>, preferred = ['en-US']) =>
  parseEmbedConfig(
    { language: undefined, bottle: undefined, bottlesJson: null, ...input },
    preferred,
  );

describe('parseEmbedConfig: language', () => {
  it("uses the shop's language, also with a region (de-DE)", () => {
    expect(parse({ language: 'de' }).language).toBe('de');
    expect(parse({ language: 'de-DE' }).language).toBe('de');
    expect(parse({ language: 'en' }, ['de']).language).toBe('en');
  });

  it("falls back to the browser language when the shop's language is not supported", () => {
    expect(parse({ language: 'fr' }, ['de-AT']).language).toBe('de');
    expect(parse({}, ['de']).language).toBe('de');
    expect(parse({ language: 'fr' }, ['it']).language).toBe('en');
  });
});

describe('parseEmbedConfig: bottles from the shop', () => {
  it('keeps the built-in bottles when the page has none', () => {
    expect(parse({}).bottles).toBeNull();
    expect(parse({ bottlesJson: '  ' }).bottles).toBeNull();
    expect(parse({}).warnings).toEqual([]);
  });

  it('builds the shop bottles in the given order, with their names', () => {
    const config = parse({
      bottlesJson: JSON.stringify([shopBottle('riesling', 'Riesling-Flasche'), shopBottle('rose')]),
    });
    expect(config.bottles?.map((bottle) => [bottle.id, bottle.name])).toEqual([
      ['riesling', 'Riesling-Flasche'],
      ['rose', 'Bottle rose'],
    ]);
    expect(config.bottles?.[0]?.profile.length).toBeGreaterThan(5);
    expect(config.warnings).toEqual([]);
  });

  it('skips bottles that are invalid or duplicated, and says why', () => {
    const config = parse({
      bottlesJson: JSON.stringify([
        shopBottle('good'),
        { ...shopBottle('wide-neck'), neckDiameterMm: 90 },
        { ...shopBottle('no-name'), name: '  ' },
        shopBottle('good', 'Second good'),
        'not a bottle',
      ]),
    });
    expect(config.bottles?.map((bottle) => bottle.id)).toEqual(['good']);
    expect(config.warnings).toHaveLength(4);
    expect(config.warnings.join('\n')).toContain('wide-neck');
    expect(config.warnings.join('\n')).toContain('narrower than the body');
    expect(config.warnings.join('\n')).toContain('no-name');
    expect(config.warnings.join('\n')).toContain('"good" appears twice');
  });

  it('never fails on odd ids, and only quotes ids that are text', () => {
    const odd = [null, 7, { nested: true }, ['a'], 'x'.repeat(500)].map((id) => ({
      ...shopBottle('ok'),
      id,
    }));
    let config: ReturnType<typeof parse> | undefined;
    expect(() => {
      config = parse({ bottlesJson: JSON.stringify([shopBottle('good'), ...odd]) });
    }).not.toThrow();
    expect(config?.bottles?.map((bottle) => bottle.id)).toEqual(['good']);
    expect(config?.warnings).toHaveLength(odd.length);
    const text = config?.warnings.join('\n') ?? '';
    expect(text).not.toContain('[object Object]');
    expect(text).not.toContain('x'.repeat(100));
  });

  it('keeps the built-in bottles when the data is broken or has no valid bottle', () => {
    for (const bottlesJson of ['[{', '{"id":"x"}', '[]', JSON.stringify([{ id: 'x' }])]) {
      const config = parse({ bottlesJson });
      expect(config.bottles, bottlesJson).toBeNull();
      expect(config.warnings.length, bottlesJson).toBeGreaterThan(0);
    }
  });

  it(`takes at most ${String(MAX_SHOP_BOTTLES)} bottles`, () => {
    const many = Array.from({ length: MAX_SHOP_BOTTLES + 3 }, (_, index) =>
      shopBottle(`b${String(index)}`),
    );
    const config = parse({ bottlesJson: JSON.stringify(many) });
    expect(config.bottles).toHaveLength(MAX_SHOP_BOTTLES);
    expect(config.warnings.join('\n')).toContain(String(MAX_SHOP_BOTTLES));
  });

  it('trims long names', () => {
    const config = parse({ bottlesJson: JSON.stringify([shopBottle('b', 'x'.repeat(200))]) });
    expect(config.bottles?.[0]?.name?.length).toBeLessThanOrEqual(80);
  });
});

describe('parseEmbedConfig: the product bottle', () => {
  const bottlesJson = JSON.stringify([shopBottle('riesling'), shopBottle('rose')]);

  it('pre-selects the bottle the product names', () => {
    expect(parse({ bottlesJson, bottle: 'rose' }).bottleId).toBe('rose');
    expect(parse({ bottle: 'schlegel-750' }).bottleId).toBe('schlegel-750');
  });

  it('ignores an unknown bottle with a warning, and is empty without one', () => {
    const config = parse({ bottlesJson, bottle: 'magnum' });
    expect(config.bottleId).toBeNull();
    expect(config.warnings.join('\n')).toContain('magnum');
    expect(parse({ bottlesJson, bottle: '' }).bottleId).toBeNull();
    expect(parse({ bottlesJson }).bottleId).toBeNull();
  });
});
