import { describe, expect, it } from 'vitest';
import { MIGRATIONS, migrateDesign, type Migrations } from './migrate';
import { CURRENT_SCHEMA_VERSION } from './schema';

describe('migrateDesign', () => {
  it('has no migrations yet (version 1 is the first version)', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
    expect(Object.keys(MIGRATIONS)).toEqual([]);
  });

  it('returns a current-version design unchanged', () => {
    const raw = { schemaVersion: CURRENT_SCHEMA_VERSION, a: 1 };
    expect(migrateDesign(raw, CURRENT_SCHEMA_VERSION)).toEqual(raw);
  });

  it('applies each step in order and sets the new version', () => {
    const steps: Migrations = {
      1: (raw) => ({ ...raw, steps: ['1→2'] }),
      2: (raw) => ({ ...raw, steps: [...(raw.steps as string[]), '2→3'] }),
    };
    expect(migrateDesign({ schemaVersion: 1 }, 1, steps, 3)).toEqual({
      schemaVersion: 3,
      steps: ['1→2', '2→3'],
    });
  });

  it('throws if a step is missing', () => {
    expect(() => migrateDesign({ schemaVersion: 1 }, 1, {}, 2)).toThrow(/1 to 2/);
  });
});
