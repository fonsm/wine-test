import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_BOTTLE_ID } from '../model/schema';
import bordeaux from './data/bottles/bordeaux-750.json';
import { bottleFromParams } from './bottles';
import { BOTTLES, activeBottles, bottleShape, defaultBottleId, setBottleCatalog } from './catalog';

const shopBottle = (id: string, name: string) => ({
  ...bottleFromParams({ ...bordeaux, id }),
  name,
});

afterEach(() => {
  setBottleCatalog(null);
});

describe('bottle catalog', () => {
  it('offers the built-in bottles by default', () => {
    expect(activeBottles()).toEqual(BOTTLES);
    expect(defaultBottleId()).toBe(DEFAULT_BOTTLE_ID);
  });

  it("can be replaced by the shop's bottles, and reset", () => {
    const shop = [shopBottle('riesling', 'Riesling'), shopBottle('rose', 'Rosé')];
    setBottleCatalog(shop);
    expect(activeBottles().map((bottle) => bottle.id)).toEqual(['riesling', 'rose']);
    expect(bottleShape('rose').name).toBe('Rosé');
    setBottleCatalog(null);
    expect(activeBottles()).toEqual(BOTTLES);
  });

  it('falls back to the first shop bottle when the default bottle is not in the shop', () => {
    setBottleCatalog([shopBottle('riesling', 'Riesling'), shopBottle('rose', 'Rosé')]);
    expect(defaultBottleId()).toBe('riesling');
    // A design (for example opened from a file) with a bottle the shop does not have.
    expect(bottleShape(DEFAULT_BOTTLE_ID).id).toBe('riesling');
    expect(bottleShape('magnum-1500').id).toBe('riesling');
  });

  it('keeps the default bottle as fallback when the shop has it', () => {
    setBottleCatalog([shopBottle('riesling', 'Riesling'), shopBottle(DEFAULT_BOTTLE_ID, 'B')]);
    expect(defaultBottleId()).toBe(DEFAULT_BOTTLE_ID);
    expect(bottleShape('magnum-1500').id).toBe(DEFAULT_BOTTLE_ID);
  });

  it('ignores an empty list', () => {
    setBottleCatalog([]);
    expect(activeBottles()).toEqual(BOTTLES);
  });
});
