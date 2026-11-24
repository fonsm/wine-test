import { CURRENT_SCHEMA_VERSION } from './schema';

export type RawDesign = Record<string, unknown>;

/** A migration step from version N (the key) to N + 1. Works on unvalidated data. */
export type Migrations = Readonly<Partial<Record<number, (raw: RawDesign) => RawDesign>>>;

/** All migration steps. Empty: version 1 is the first version. Add a step for every new version. */
export const MIGRATIONS: Migrations = {};

/** Upgrades raw design data from `fromVersion` to `toVersion`, one step at a time. */
export function migrateDesign(
  raw: RawDesign,
  fromVersion: number,
  migrations: Migrations = MIGRATIONS,
  toVersion: number = CURRENT_SCHEMA_VERSION,
): RawDesign {
  let current = raw;
  for (let version = fromVersion; version < toVersion; version++) {
    const step = migrations[version];
    if (!step)
      throw new Error(`No migration from version ${String(version)} to ${String(version + 1)}`);
    current = { ...step(current), schemaVersion: version + 1 };
  }
  return current;
}
