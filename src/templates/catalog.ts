// The built-in bottles (and templates): data files in ./data, bundled by Vite and checked with
// Zod when this module loads. A broken file stops the app and the tests with its file name.
import { DEFAULT_BOTTLE_ID, DEFAULT_TEMPLATE_ID, designSchema, type Design } from '../model/schema';
import { bottleFromParams, bottleParamsSchema, type BottleShape } from './bottles';

/** File path → parsed JSON, as from import.meta.glob. */
type DataFiles = Record<string, unknown>;

const fileId = (path: string) =>
  path
    .split('/')
    .pop()
    ?.replace(/\.json$/, '') ?? path;

function describeIssues(issues: readonly { path: PropertyKey[]; message: string }[]): string {
  return issues
    .map((issue) => `${issue.path.map(String).join('.') || '(file)'}: ${issue.message}`)
    .join('; ');
}

/** Validates bottle files and builds their shapes, sorted by id. Throws on the first bad file. */
export function loadBottles(files: DataFiles): BottleShape[] {
  return Object.entries(files)
    .map(([path, data]) => {
      const result = bottleParamsSchema.safeParse(data);
      if (!result.success) {
        throw new Error(`Invalid bottle file ${path}: ${describeIssues(result.error.issues)}`);
      }
      if (result.data.id !== fileId(path)) {
        throw new Error(
          `Bottle file ${path} has id "${result.data.id}"; it must match the file name`,
        );
      }
      return bottleFromParams(result.data);
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** The built-in bottles. */
export const BOTTLES: readonly BottleShape[] = loadBottles(
  import.meta.glob('./data/bottles/*.json', { eager: true, import: 'default' }),
);

/** The bottles the app offers: the built-in ones, or the shop's when embedded (see src/embed). */
let active: readonly BottleShape[] = BOTTLES;

/** Offers these bottles instead of the built-in ones; null or an empty list restores them. */
export function setBottleCatalog(bottles: readonly BottleShape[] | null): void {
  active = bottles && bottles.length > 0 ? bottles : BOTTLES;
}

export function activeBottles(): readonly BottleShape[] {
  return active;
}

/** The bottle new designs start with: the default bottle, or the first one if it is not offered. */
export function defaultBottleId(): string {
  const first = active[0];
  if (!first) throw new Error('no bottles');
  return active.some((bottle) => bottle.id === DEFAULT_BOTTLE_ID) ? DEFAULT_BOTTLE_ID : first.id;
}

/** The shape for a design's bottleId; unknown ids (from files) fall back to the default bottle. */
export function bottleShape(id: string): BottleShape {
  const fallbackId = defaultBottleId();
  const found =
    active.find((bottle) => bottle.id === id) ?? active.find((bottle) => bottle.id === fallbackId);
  if (!found) throw new Error('default bottle missing');
  return found;
}

export interface Template {
  id: string;
  design: Design;
}

/** Validates template files (full designs) and sorts them, the empty label first. */
export function loadTemplates(files: DataFiles): Template[] {
  return Object.entries(files)
    .map(([path, data]) => {
      const result = designSchema.safeParse(data);
      if (!result.success) {
        throw new Error(`Invalid template file ${path}: ${describeIssues(result.error.issues)}`);
      }
      if (result.data.templateId !== fileId(path)) {
        throw new Error(
          `Template file ${path} has templateId "${result.data.templateId}"; it must match the file name`,
        );
      }
      return { id: result.data.templateId, design: result.data };
    })
    .sort((a, b) =>
      a.id === DEFAULT_TEMPLATE_ID
        ? -1
        : b.id === DEFAULT_TEMPLATE_ID
          ? 1
          : a.id.localeCompare(b.id),
    );
}

export const TEMPLATES: readonly Template[] = loadTemplates(
  import.meta.glob('./data/templates/*.json', { eager: true, import: 'default' }),
);

/** A fresh copy of a template's design (changing it never changes the template). */
export function templateDesign(id: string): Design {
  const template = TEMPLATES.find((candidate) => candidate.id === id);
  if (!template) throw new Error(`Unknown template ${id}`);
  return structuredClone(template.design);
}
