// Draws a design without any editor overlay (no handles, guides or bleed tint): only the trim
// area, as it will look printed. Used for the 3D preview's texture and the 2D fallback.
import Konva from 'konva';
import { toNodePosition } from '../editor/units';
import type { Design } from '../model/schema';
import { PAPER_COLOR, elementNode, type ElementNode } from './elementNodes';
import { designFontSpecs, loadFonts } from './fonts';
import { cachedImage, loadImage } from './images';
import { renderSizePx } from './resolution';

function createNode({ kind, config }: ElementNode): Konva.Shape {
  switch (kind) {
    case 'text':
      return new Konva.Text(config);
    case 'image':
      return new Konva.Image(config);
    case 'rect':
      return new Konva.Rect(config);
    case 'ellipse':
      return new Konva.Ellipse(config);
    case 'line':
      return new Konva.Line(config);
  }
}

/** Waits until the fonts and images a design uses are ready to draw. */
export async function prepareDesign(design: Design): Promise<void> {
  const dataUrls = design.elements.flatMap((element) =>
    element.type === 'image' ? [design.assets[element.assetId]?.dataUrl ?? ''] : [],
  );
  await Promise.all([
    loadFonts(designFontSpecs(design)),
    ...dataUrls.filter(Boolean).map((dataUrl) => loadImage(dataUrl)),
  ]);
}

/** Owns one off-screen Konva stage and redraws designs into it. Call dispose() when done. */
export class LabelRenderer {
  private readonly stage: Konva.Stage;
  private readonly layer: Konva.Layer;

  constructor() {
    // The container is never attached to the page.
    this.stage = new Konva.Stage({ container: document.createElement('div'), width: 1, height: 1 });
    this.layer = new Konva.Layer({ listening: false });
    // Exactly one canvas pixel per stage pixel, whatever the screen's pixel ratio.
    this.layer.getCanvas().setPixelRatio(1);
    this.stage.add(this.layer);
  }

  /**
   * Draws the design (call prepareDesign first, or images still loading are left out) with its
   * longer side maxSidePx pixels. Returns the canvas, which is reused by the next draw.
   */
  draw(design: Design, maxSidePx: number): HTMLCanvasElement {
    const { width, height, pxPerMm } = renderSizePx(design.labelSize, maxSidePx);
    this.stage.size({ width, height });
    this.layer.destroyChildren();
    this.layer.add(new Konva.Rect({ width, height, fill: PAPER_COLOR }));
    for (const element of design.elements) {
      const node = elementNode(element, design, pxPerMm, cachedImage);
      if (!node) continue;
      const group = new Konva.Group({
        ...toNodePosition(element, pxPerMm),
        rotation: element.rotation,
        opacity: element.opacity,
      });
      group.add(createNode(node));
      this.layer.add(group);
    }
    this.layer.draw();
    return this.layer.getNativeCanvasElement();
  }

  dispose(): void {
    this.stage.destroy();
  }
}
