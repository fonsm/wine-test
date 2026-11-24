// The 3D bottle: a lathe geometry from the bottle outline, a capsule over the cork and the
// label as a cylinder segment just outside the glass. No renderer here (see viewer.ts), so this
// also runs in unit tests. Units are millimetres.
import {
  BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  DirectionalLight,
  HemisphereLight,
  LatheGeometry,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
  type Texture,
  Scene,
  Vector2,
} from 'three';
import type { LabelSize } from '../print/geometry';
import { radiusAt, type BottleShape } from './bottles';
import { labelWrap } from './wrap';

/** The rendered label: a canvas the label renderer draws into. */
export type LabelImage = HTMLCanvasElement;

/** Segments around the bottle: smooth outline at preview sizes, cheap on phones. */
const RADIAL_SEGMENTS = 96;
/** How far the capsule (foil) stands out from the glass. */
const CAPSULE_THICKNESS_MM = 0.4;
/** How much of the room reflection the paper label shows (glass and capsule show all). */
const LABEL_REFLECTION = 0.15;

type BottleMesh = Mesh<BufferGeometry, MeshStandardMaterial>;

export interface BottleScene {
  scene: Scene;
  glass: BottleMesh;
  label: BottleMesh;
  /** All meshes (glass, capsule, label). Each owns its geometry and material. */
  meshes: readonly BottleMesh[];
  /** Shows a newly drawn label. Cheap when only the content changed. */
  setLabel(image: LabelImage, size: LabelSize): void;
  /**
   * Sets the reflected surroundings. Per material, not scene.environment: Three.js ignores a
   * material's envMapIntensity for scene.environment, and the paper must reflect less.
   */
  setEnvironment(texture: Texture | null): void;
  labelTexture(): CanvasTexture | null;
  dispose(): void;
}

function lathe(points: readonly { r: number; y: number }[]): LatheGeometry {
  return new LatheGeometry(
    points.map((point) => new Vector2(point.r, point.y)),
    RADIAL_SEGMENTS,
  );
}

export interface SceneOptions {
  /** Sharper label at a slant (texture anisotropy); the renderer knows the maximum. */
  anisotropy?: number;
}

export function createBottleScene(bottle: BottleShape, options: SceneOptions = {}): BottleScene {
  const scene = new Scene();

  const glass = new Mesh(
    lathe(bottle.profile),
    new MeshPhysicalMaterial({
      color: bottle.glassColor,
      roughness: 0.08,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    }),
  );

  const capsuleProfile = [
    { r: radiusAt(bottle, bottle.capsuleBottomMm), y: bottle.capsuleBottomMm },
    ...bottle.profile.filter((point) => point.y > bottle.capsuleBottomMm),
  ].map((point) => ({ r: point.r === 0 ? 0 : point.r + CAPSULE_THICKNESS_MM, y: point.y }));
  const lastCapsulePoint = capsuleProfile.at(-1);
  if (lastCapsulePoint) lastCapsulePoint.y += CAPSULE_THICKNESS_MM;
  const capsule = new Mesh(
    lathe(capsuleProfile),
    new MeshStandardMaterial({ color: bottle.capsuleColor, roughness: 0.35, metalness: 0.6 }),
  );

  // Less room reflection than the glass, so the paper shows light and shade across the curve.
  const labelMaterial = new MeshStandardMaterial({
    roughness: 0.8,
    metalness: 0,
    envMapIntensity: LABEL_REFLECTION,
  });
  const label = new Mesh(new BufferGeometry(), labelMaterial);
  label.visible = false;

  const sky = new HemisphereLight('#ffffff', '#6b5f55', 0.85);
  const sun = new DirectionalLight('#ffffff', 1.7);
  // From the front left, so the label darkens towards the right side like on a real bottle.
  sun.position.set(-600, 450, 350);
  scene.add(glass, capsule, label, sky, sun);

  let texture: CanvasTexture | null = null;
  let shownSize: LabelSize | null = null;

  function setTexture(image: LabelImage) {
    // A texture keeps its pixel size once uploaded: a resized canvas needs a new texture.
    if (texture && texture.image === image && sameImageSize(texture, image)) {
      texture.needsUpdate = true;
      return;
    }
    texture?.dispose();
    texture = new CanvasTexture(image);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = options.anisotropy ?? 1;
    texture.userData = { width: image.width, height: image.height };
    labelMaterial.map = texture;
    labelMaterial.needsUpdate = true;
  }

  const meshes = [glass, capsule, label];
  return {
    scene,
    glass,
    label,
    meshes,
    labelTexture: () => texture,
    setEnvironment(environment) {
      for (const mesh of meshes) {
        mesh.material.envMap = environment;
        mesh.material.needsUpdate = true;
      }
    },
    setLabel(image, size) {
      setTexture(image);
      const wrap = labelWrap(size, bottle);
      if (texture) {
        texture.repeat.set(wrap.uv.repeatX, wrap.uv.repeatY);
        texture.offset.set(wrap.uv.offsetX, wrap.uv.offsetY);
      }
      if (shownSize?.widthMm !== size.widthMm || shownSize.heightMm !== size.heightMm) {
        label.geometry.dispose();
        label.geometry = new CylinderGeometry(
          wrap.radiusMm,
          wrap.radiusMm,
          wrap.heightMm,
          RADIAL_SEGMENTS,
          1,
          true,
          wrap.thetaStart,
          wrap.thetaLength,
        );
        label.position.y = wrap.centerYMm;
        shownSize = { ...size };
      }
      label.visible = true;
    },
    dispose() {
      for (const mesh of meshes) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
      texture?.dispose();
      texture = null;
      sun.dispose();
      sky.dispose();
      scene.clear();
    },
  };
}

function sameImageSize(texture: CanvasTexture, image: LabelImage): boolean {
  const size = texture.userData as { width?: number; height?: number };
  return size.width === image.width && size.height === image.height;
}
