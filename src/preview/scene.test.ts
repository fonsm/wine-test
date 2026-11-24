import { CylinderGeometry, LatheGeometry, SRGBColorSpace, Texture } from 'three';
import { describe, expect, it } from 'vitest';
import { bottleShape } from '../templates/catalog';
import { createBottleScene, type LabelImage } from './scene';
import { labelWrap } from './wrap';

const bottle = bottleShape('bordeaux-750');
const fakeCanvas = (width: number, height: number) => ({ width, height }) as unknown as LabelImage;

function disposeSpy(target: { addEventListener(type: 'dispose', listener: () => void): void }) {
  const spy = { disposed: false };
  target.addEventListener('dispose', () => {
    spy.disposed = true;
  });
  return spy;
}

describe('createBottleScene', () => {
  it('turns the bottle outline into a lathe geometry, label hidden until there is one', () => {
    const view = createBottleScene(bottle);
    expect(view.glass.geometry).toBeInstanceOf(LatheGeometry);
    expect(view.label.visible).toBe(false);
  });

  it('wraps the label image around the bottle as a cylinder segment', () => {
    const view = createBottleScene(bottle);
    const canvas = fakeCanvas(768, 1024);
    const size = { widthMm: 90, heightMm: 120 };
    view.setLabel(canvas, size);

    const wrap = labelWrap(size, bottle);
    const geometry = view.label.geometry;
    if (!(geometry instanceof CylinderGeometry)) throw new Error('expected a cylinder segment');
    expect(geometry.parameters).toMatchObject({
      radiusTop: wrap.radiusMm,
      radiusBottom: wrap.radiusMm,
      height: wrap.heightMm,
      openEnded: true,
      thetaStart: wrap.thetaStart,
      thetaLength: wrap.thetaLength,
    });
    expect(view.label.position.y).toBe(wrap.centerYMm);
    expect(view.label.visible).toBe(true);

    const texture = view.labelTexture();
    expect(texture?.image).toBe(canvas);
    expect(texture?.colorSpace).toBe(SRGBColorSpace);
  });

  it('uses the anisotropy the renderer allows, for a sharp label near the sides', () => {
    const view = createBottleScene(bottle, { anisotropy: 8 });
    view.setLabel(fakeCanvas(768, 1024), { widthMm: 90, heightMm: 120 });
    expect(view.labelTexture()?.anisotropy).toBe(8);
  });

  it('reflects the surroundings in the glass more than in the paper label', () => {
    const view = createBottleScene(bottle);
    const environment = new Texture();
    view.setEnvironment(environment);
    const materials = view.meshes.map((mesh) => mesh.material);
    expect(materials.every((material) => material.envMap === environment)).toBe(true);
    const label = view.label.material;
    const glass = view.glass.material;
    expect(label.envMapIntensity).toBeLessThan(glass.envMapIntensity);
    // scene.environment would ignore the per-material intensity.
    expect(view.scene.environment).toBeNull();
  });

  it('shows only the middle of a label that is too wide to wrap once', () => {
    const view = createBottleScene(bottle);
    const size = { widthMm: 300, heightMm: 100 };
    view.setLabel(fakeCanvas(1024, 341), size);
    const { uv } = labelWrap(size, bottle);
    const texture = view.labelTexture();
    expect(texture?.repeat.x).toBeCloseTo(uv.repeatX, 12);
    expect(texture?.offset.x).toBeCloseTo(uv.offsetX, 12);
  });

  it('re-uploads the same texture and keeps the geometry after an edit', () => {
    const view = createBottleScene(bottle);
    const canvas = fakeCanvas(768, 1024);
    const size = { widthMm: 90, heightMm: 120 };
    view.setLabel(canvas, size);
    const texture = view.labelTexture();
    const geometry = view.label.geometry;
    const version = texture?.version ?? 0;

    view.setLabel(canvas, { ...size });
    expect(view.labelTexture()).toBe(texture);
    expect(texture?.version).toBeGreaterThan(version);
    expect(view.label.geometry).toBe(geometry);
  });

  it('disposes the old geometry and texture when the label size changes', () => {
    const view = createBottleScene(bottle);
    view.setLabel(fakeCanvas(768, 1024), { widthMm: 90, heightMm: 120 });
    const oldGeometry = disposeSpy(view.label.geometry);
    const oldTexture = view.labelTexture();
    if (!oldTexture) throw new Error('no texture');
    const oldTextureSpy = disposeSpy(oldTexture);

    // The renderer reuses its canvas, but at a new size.
    view.setLabel(fakeCanvas(1024, 1024), { widthMm: 100, heightMm: 100 });
    expect(oldGeometry.disposed).toBe(true);
    expect(oldTextureSpy.disposed).toBe(true);
    expect(view.labelTexture()).not.toBe(oldTexture);
  });

  it('disposes every geometry, material and texture', () => {
    const view = createBottleScene(bottle);
    view.setLabel(fakeCanvas(768, 1024), { widthMm: 90, heightMm: 120 });
    const spies: { disposed: boolean }[] = [];
    expect(view.meshes.every((mesh) => mesh.parent === view.scene)).toBe(true);
    for (const mesh of view.meshes) {
      spies.push(disposeSpy(mesh.geometry), disposeSpy(mesh.material));
    }
    const texture = view.labelTexture();
    if (!texture) throw new Error('no texture');
    spies.push(disposeSpy(texture));
    // Glass, capsule and label: a geometry and a material each, plus the label texture.
    expect(spies.length).toBe(7);

    view.dispose();
    expect(spies.every((spy) => spy.disposed)).toBe(true);
    expect(view.labelTexture()).toBeNull();
  });
});
