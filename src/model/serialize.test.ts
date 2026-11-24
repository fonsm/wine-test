import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, DESIGN_FILE_FORMAT } from './schema';
import {
  MAX_DESIGN_FILE_BYTES,
  MAX_DESIGN_FILE_MB,
  parseDesignJson,
  readDesignFile,
  serializeDesign,
} from './serialize';
import { sampleDesign } from './testing/fixtures';

const asFile = (text: string, name = 'design.json') =>
  new File([text], name, { type: 'application/json' });

describe('round trip', () => {
  it('save then load gives an identical design', () => {
    const design = sampleDesign();
    expect(parseDesignJson(serializeDesign(design))).toEqual({ ok: true, design });
  });

  it('is stable: saving a loaded design gives byte-identical JSON', () => {
    const json = serializeDesign(sampleDesign());
    const loaded = parseDesignJson(json);
    if (!loaded.ok) throw new Error('load failed');
    expect(serializeDesign(loaded.design)).toBe(json);
  });

  it('works through a File, like a real save and load', async () => {
    const design = sampleDesign();
    expect(await readDesignFile(asFile(serializeDesign(design)))).toEqual({ ok: true, design });
  });

  it('writes the format marker and version first', () => {
    const json = serializeDesign(sampleDesign());
    expect(Object.keys(JSON.parse(json) as object).slice(0, 2)).toEqual([
      'format',
      'schemaVersion',
    ]);
    expect(json).toContain(`"format": "${DESIGN_FILE_FORMAT}"`);
  });
});

describe('invalid files', () => {
  it('invalid file: rejects text that is not JSON', () => {
    expect(parseDesignJson('not json {')).toEqual({
      ok: false,
      error: { code: 'INVALID_JSON', params: {} },
    });
  });

  it('invalid file: rejects JSON that is not a design file', () => {
    for (const json of ['[]', 'null', '42', '{"name":"other app"}', '{"format":"other"}']) {
      expect(parseDesignJson(json)).toMatchObject({ ok: false, error: { code: 'NOT_A_DESIGN' } });
    }
  });

  it('wrong version: rejects a newer schema version', () => {
    const json = serializeDesign(sampleDesign()).replace(
      `"schemaVersion": ${String(CURRENT_SCHEMA_VERSION)}`,
      `"schemaVersion": ${String(CURRENT_SCHEMA_VERSION + 1)}`,
    );
    expect(parseDesignJson(json)).toEqual({
      ok: false,
      error: {
        code: 'UNSUPPORTED_VERSION',
        params: { version: CURRENT_SCHEMA_VERSION + 1, supportedVersion: CURRENT_SCHEMA_VERSION },
      },
    });
  });

  it('wrong version: rejects a missing, zero, fractional or text version as invalid', () => {
    for (const version of [undefined, 0, 1.5, '1']) {
      const json = JSON.stringify({ ...sampleDesign(), schemaVersion: version });
      expect(parseDesignJson(json)).toMatchObject({
        ok: false,
        error: { code: 'INVALID_DESIGN', path: 'schemaVersion' },
      });
    }
  });

  it('missing fields: reports the first invalid field as a readable path', () => {
    const design = sampleDesign();
    const broken = {
      ...design,
      elements: design.elements.map((element, i) => {
        if (i !== 2) return element;
        const rest: Record<string, unknown> = { ...element };
        delete rest.height;
        return rest;
      }),
    };
    expect(parseDesignJson(JSON.stringify(broken))).toEqual({
      ok: false,
      error: { code: 'INVALID_DESIGN', params: {}, path: 'elements[2].height' },
    });
  });

  it('rejects files larger than the limit without reading them', async () => {
    const file = asFile('x'.repeat(MAX_DESIGN_FILE_BYTES + 1));
    expect(await readDesignFile(file)).toEqual({
      ok: false,
      error: { code: 'FILE_TOO_LARGE', params: { maxMegabytes: MAX_DESIGN_FILE_MB } },
    });
  });
});
