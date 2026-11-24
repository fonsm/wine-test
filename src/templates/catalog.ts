// The built-in bottles (and templates): data files in ./data, bundled by Vite and checked with
// Zod when this module loads. A broken file stops the app and the tests with its file name.
import { DEFAULT_BOTTLE_ID } from '../model/schema';
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

export const BOTTLES: readonly BottleShape[] = loadBottles(
  import.meta.glob('./data/bottles/*.json', { eager: true, import: 'default' }),
);

/** The shape for a design's bottleId; unknown ids (from files) fall back to the default bottle. */
export function bottleShape(id: string): BottleShape {
  const found = BOTTLES.find((bottle) => bottle.id === id);
  if (found) return found;
  const fallback = BOTTLES.find((bottle) => bottle.id === DEFAULT_BOTTLE_ID);
  if (!fallback) throw new Error('default bottle missing');
  return fallback;
}
