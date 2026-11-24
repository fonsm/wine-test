import { describe, expect, it } from 'vitest';
import { designSchema, createEmptyDesign } from '../model/schema';
import { newId } from './ids';

describe('newId', () => {
  it('creates distinct ids that the design schema accepts', () => {
    const a = newId();
    const b = newId();
    expect(a).not.toBe(b);
    const design = {
      ...createEmptyDesign(),
      elements: [
        {
          id: a,
          type: 'shape',
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          rotation: 0,
          opacity: 1,
          shape: 'rect',
          style: { fill: null, stroke: null, strokeWidthMm: 0, cornerRadiusMm: 0 },
        },
      ],
    };
    expect(designSchema.safeParse(design).success).toBe(true);
  });
});
