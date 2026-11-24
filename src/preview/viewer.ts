// The WebGL part of the preview: renderer, camera and orbit controls around a BottleScene.
// Renders only when something changed (an edit, a drag, a resize), not in a constant loop.
import {
  NeutralToneMapping,
  PMREMGenerator,
  PerspectiveCamera,
  Spherical,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { LabelSize } from '../print/geometry';
import type { BottleShape } from './bottles';
import { createBottleScene, type LabelImage } from './scene';

const FIELD_OF_VIEW_DEG = 30;
/** Space above and below the bottle, as a share of its height. */
const FRAME_MARGIN = 0.05;
/** Starting view: a little from above, like a bottle on a table. */
const START_POLAR = Math.PI / 2 - 0.12;
/** Up and down tilt limits (polar angle from straight above). Turning sideways is unlimited. */
export const MIN_POLAR = Math.PI / 2 - 0.55;
export const MAX_POLAR = Math.PI / 2 + 0.25;
/** Highest pixel ratio rendered; sharper is not visible at preview size but costs on phones. */
const MAX_PIXEL_RATIO = 2;
/** Texture filtering for the label seen at a slant near the bottle's sides. */
const MAX_ANISOTROPY = 8;

export interface Viewer {
  setLabel(image: LabelImage, size: LabelSize): void;
  pixelRatio(): number;
  /** Renders with fewer pixels (or more); 1 = one canvas pixel per CSS pixel. */
  setPixelRatio(ratio: number): void;
  /** Renders n frames and returns how long each took, GPU work included (milliseconds). */
  measureFrames(n: number): number[];
  dispose(): void;
}

/** Whether this browser can create a WebGL 2 context (Three.js needs WebGL 2). */
export function supportsWebGL2(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/**
 * Starts the 3D preview on the canvas. Throws if WebGL cannot be started. onContextLost is
 * called if the browser takes WebGL away later (for example when the GPU resets).
 */
export function createViewer(
  canvas: HTMLCanvasElement,
  bottle: BottleShape,
  onContextLost: () => void,
): Viewer {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  // Keeps the label's colours close to the print, without blown-out highlights.
  renderer.toneMapping = NeutralToneMapping;

  const view = createBottleScene(bottle, {
    anisotropy: Math.min(renderer.capabilities.getMaxAnisotropy(), MAX_ANISOTROPY),
  });
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  view.setEnvironment(environment.texture);
  room.dispose();
  pmrem.dispose();

  const target = new Vector3(0, bottle.heightMm / 2, 0);
  const camera = new PerspectiveCamera(FIELD_OF_VIEW_DEG, 1, 10, 5000);
  const distance =
    (bottle.heightMm * (0.5 + FRAME_MARGIN)) / Math.tan((FIELD_OF_VIEW_DEG * Math.PI) / 360);
  const placeCamera = (theta: number, phi: number) => {
    camera.position.setFromSpherical(new Spherical(distance, phi, theta)).add(target);
    camera.lookAt(target);
  };
  placeCamera(0, START_POLAR);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(target);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.minPolarAngle = MIN_POLAR;
  controls.maxPolarAngle = MAX_POLAR;
  controls.update();
  // Vertical swipes keep scrolling the page on phones; sideways swipes turn the bottle.
  canvas.style.touchAction = 'pan-y';

  let frame = 0;
  let disposed = false;
  const render = () => {
    frame = 0;
    renderer.render(view.scene, camera);
  };
  const requestRender = () => {
    if (!disposed && frame === 0) frame = requestAnimationFrame(render);
  };
  controls.addEventListener('change', requestRender);

  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    requestRender();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const handleContextLost = (event: Event) => {
    event.preventDefault();
    if (!disposed) onContextLost();
  };
  canvas.addEventListener('webglcontextlost', handleContextLost);

  return {
    setLabel(image, size) {
      view.setLabel(image, size);
      requestRender();
    },
    pixelRatio: () => renderer.getPixelRatio(),
    setPixelRatio(ratio) {
      renderer.setPixelRatio(ratio);
      resize();
    },
    measureFrames(n) {
      const gl = renderer.getContext();
      const pixel = new Uint8Array(4);
      return Array.from({ length: n }, () => {
        const start = performance.now();
        renderer.render(view.scene, camera);
        // Reading a pixel waits until the GPU has finished the frame.
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        return performance.now() - start;
      });
    },
    dispose() {
      disposed = true;
      if (frame !== 0) cancelAnimationFrame(frame);
      observer.disconnect();
      controls.removeEventListener('change', requestRender);
      controls.dispose();
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      view.dispose();
      environment.dispose();
      renderer.dispose();
      // Frees the WebGL context now instead of whenever the browser collects it.
      renderer.forceContextLoss();
    },
  };
}
