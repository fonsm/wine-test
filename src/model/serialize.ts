import type { z } from 'zod';
import { migrateDesign, type RawDesign } from './migrate';
import { CURRENT_SCHEMA_VERSION, DESIGN_FILE_FORMAT, designSchema, type Design } from './schema';

/** Upper limit for design files. Embedded images (up to 10 MB each) are base64 encoded. Assumption. */
export const MAX_DESIGN_FILE_MB = 50;
export const MAX_DESIGN_FILE_BYTES = MAX_DESIGN_FILE_MB * 1024 * 1024;

export const DESIGN_FILE_ERROR_CODES = [
  'FILE_TOO_LARGE',
  'INVALID_JSON',
  'NOT_A_DESIGN',
  'UNSUPPORTED_VERSION',
  'INVALID_DESIGN',
] as const;
export type DesignFileErrorCode = (typeof DESIGN_FILE_ERROR_CODES)[number];

export interface DesignFileError {
  code: DesignFileErrorCode;
  params: Readonly<Record<string, number>>;
  /** For INVALID_DESIGN: the first invalid field, for example "elements[2].height". */
  path?: string;
}

export type DesignLoadResult = { ok: true; design: Design } | { ok: false; error: DesignFileError };

/** Serializes a design to JSON. The key order follows the schema, so "format" and "schemaVersion" come first. */
export function serializeDesign(design: Design): string {
  return `${JSON.stringify(designSchema.parse(design), null, 2)}\n`;
}

function fail(code: DesignFileErrorCode, params: DesignFileError['params'] = {}): DesignLoadResult {
  return { ok: false, error: { code, params } };
}

function formatPath(path: z.core.$ZodIssue['path']): string {
  return path
    .map((part, index) =>
      typeof part === 'number' ? `[${String(part)}]` : `${index === 0 ? '' : '.'}${String(part)}`,
    )
    .join('');
}

function isRecord(value: unknown): value is RawDesign {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Parses, migrates and validates a design file's text. Never throws. */
export function parseDesignJson(text: string): DesignLoadResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail('INVALID_JSON');
  }
  if (!isRecord(raw) || raw.format !== DESIGN_FILE_FORMAT) return fail('NOT_A_DESIGN');

  const version = raw.schemaVersion;
  if (
    typeof version === 'number' &&
    Number.isInteger(version) &&
    version > CURRENT_SCHEMA_VERSION
  ) {
    return fail('UNSUPPORTED_VERSION', { version, supportedVersion: CURRENT_SCHEMA_VERSION });
  }
  if (typeof version === 'number' && Number.isInteger(version) && version >= 1) {
    raw = migrateDesign(raw, version);
  }

  const result = designSchema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    return {
      ok: false,
      error: { code: 'INVALID_DESIGN', params: {}, path: first ? formatPath(first.path) : '' },
    };
  }
  return { ok: true, design: result.data };
}

/** Reads a design file chosen by the user. Never throws. */
export async function readDesignFile(file: File): Promise<DesignLoadResult> {
  if (file.size > MAX_DESIGN_FILE_BYTES)
    return fail('FILE_TOO_LARGE', { maxMegabytes: MAX_DESIGN_FILE_MB });
  let text: string;
  try {
    text = await file.text();
  } catch {
    return fail('INVALID_JSON');
  }
  return parseDesignJson(text);
}
