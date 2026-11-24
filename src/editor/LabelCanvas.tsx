import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Ellipse,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  Stage,
  Text,
  Transformer,
} from 'react-konva';
import type { Design, DesignElement } from '../model/schema';
import { BLEED_MM, SAFE_MARGIN_MM } from '../print/geometry';
import { PAPER_COLOR, elementNode } from '../render/elementNodes';
import { designFontSpecs, loadFonts } from '../render/fonts';
import { cachedImage, loadImage } from '../render/images';
import { MIN_ELEMENT_SIZE_MM, type ElementPatch } from './operations';
import { SNAP_THRESHOLD_PX, snapBox, snapGuides, type Guides } from './snap';
import { fromNodePosition, toNodePosition } from './units';

interface LabelCanvasProps {
  design: Design;
  selectedId: string | null;
  label: string;
  helpId: string;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: ElementPatch) => void;
  onEditText: (id: string) => void;
}

interface ActiveGuides {
  vertical: number | null;
  horizontal: number | null;
}

const COLORS = {
  bleed: 'rgba(0, 0, 0, 0.07)',
  trim: '#8a8a8a',
  safe: '#b8b8b8',
  guide: '#d6336c',
  handle: '#2563eb',
};

/** Shows the design on a Konva stage. The design is read-only here; changes go through onChange. */
export function LabelCanvas({
  design,
  selectedId,
  label,
  helpId,
  onSelect,
  onChange,
  onEditText,
}: LabelCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const dragGuides = useRef<Guides>({ vertical: [], horizontal: [] });
  const [width, setWidth] = useState(0);
  const [guides, setGuides] = useState<ActiveGuides | null>(null);
  const fontsVersion = useFontsVersion(design);
  // Bigger handles on touch screens. (No window during server-side rendering in unit tests.)
  const coarsePointer = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
    [],
  );

  // The stage fills the wrapper's width; the zoom follows from that.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(wrapper);
    return () => {
      observer.disconnect();
    };
  }, []);

  const { widthMm, heightMm } = design.labelSize;
  const totalWidthMm = widthMm + 2 * BLEED_MM;
  const totalHeightMm = heightMm + 2 * BLEED_MM;
  const pxPerMm = width / totalWidthMm;
  const origin = BLEED_MM * pxPerMm;
  const selected = design.elements.find((element) => element.id === selectedId) ?? null;

  // Attach the resize/rotate handles to the selected element.
  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) return;
    const node = selectedId
      ? stage.findOne((candidate: Konva.Node) => candidate.id() === selectedId)
      : undefined;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedId, design, pxPerMm, fontsVersion]);

  function handlePointerDownOnStage(event: KonvaEventObject<MouseEvent | TouchEvent>) {
    if (event.target === event.target.getStage() || event.target.name() === 'background')
      onSelect(null);
  }

  function handleDragMove(element: DesignElement, event: KonvaEventObject<DragEvent>) {
    const node = event.target;
    const position = fromNodePosition(node.position(), element, pxPerMm);
    const snapped = snapBox(
      { ...element, ...position },
      dragGuides.current,
      SNAP_THRESHOLD_PX / pxPerMm,
    );
    node.position(toNodePosition({ ...element, x: snapped.x, y: snapped.y }, pxPerMm));
    setGuides({ vertical: snapped.vertical, horizontal: snapped.horizontal });
  }

  function handleDragEnd(element: DesignElement, event: KonvaEventObject<DragEvent>) {
    const position = fromNodePosition(event.target.position(), element, pxPerMm);
    setGuides(null);
    onChange(element.id, position);
  }

  function handleTransformEnd(element: DesignElement, event: KonvaEventObject<Event>) {
    const node = event.target;
    const size = {
      width: element.width * Math.abs(node.scaleX()),
      height: element.height * Math.abs(node.scaleY()),
      rotation: node.rotation(),
    };
    node.scale({ x: 1, y: 1 });
    onChange(element.id, { ...size, ...fromNodePosition(node.position(), size, pxPerMm) });
  }

  return (
    <div
      ref={wrapperRef}
      className="label-canvas"
      data-testid="label-canvas"
      role="application"
      aria-label={label}
      aria-describedby={helpId}
      tabIndex={0}
    >
      {width > 0 && (
        <Stage
          ref={stageRef}
          width={totalWidthMm * pxPerMm}
          height={totalHeightMm * pxPerMm}
          onMouseDown={handlePointerDownOnStage}
          onTouchStart={handlePointerDownOnStage}
        >
          <Layer>
            <Rect
              name="background"
              width={totalWidthMm * pxPerMm}
              height={totalHeightMm * pxPerMm}
              fill={PAPER_COLOR}
            />
          </Layer>
          <Layer>
            <Group x={origin} y={origin}>
              {design.elements.map((element) => (
                <Group
                  key={element.id}
                  id={element.id}
                  {...toNodePosition(element, pxPerMm)}
                  rotation={element.rotation}
                  opacity={element.opacity}
                  draggable
                  onMouseDown={() => {
                    onSelect(element.id);
                  }}
                  onTouchStart={() => {
                    onSelect(element.id);
                  }}
                  onDblClick={() => {
                    if (element.type === 'text') onEditText(element.id);
                  }}
                  onDblTap={() => {
                    if (element.type === 'text') onEditText(element.id);
                  }}
                  onDragStart={() => {
                    dragGuides.current = snapGuides(design, element.id);
                    onSelect(element.id);
                  }}
                  onDragMove={(event) => {
                    handleDragMove(element, event);
                  }}
                  onDragEnd={(event) => {
                    handleDragEnd(element, event);
                  }}
                  onTransformEnd={(event) => {
                    handleTransformEnd(element, event);
                  }}
                >
                  {/* Invisible hit area: the whole box is grabbable, also for thin text. */}
                  <Rect
                    width={element.width * pxPerMm}
                    height={element.height * pxPerMm}
                    fill="rgba(0,0,0,0)"
                  />
                  <ElementContent
                    element={element}
                    design={design}
                    pxPerMm={pxPerMm}
                    fontsVersion={fontsVersion}
                  />
                </Group>
              ))}
            </Group>
            <Transformer
              ref={transformerRef}
              rotateEnabled
              flipEnabled={false}
              keepRatio={selected?.type === 'image'}
              rotationSnaps={[0, 90, 180, 270]}
              rotationSnapTolerance={4}
              anchorSize={coarsePointer ? 22 : 10}
              rotateAnchorOffset={coarsePointer ? 36 : 24}
              anchorStroke={COLORS.handle}
              borderStroke={COLORS.handle}
              boundBoxFunc={(oldBox, newBox) =>
                Math.abs(newBox.width) < MIN_ELEMENT_SIZE_MM * pxPerMm ||
                Math.abs(newBox.height) < MIN_ELEMENT_SIZE_MM * pxPerMm
                  ? oldBox
                  : newBox
              }
            />
          </Layer>
          <Layer listening={false}>
            <Overlay widthMm={widthMm} heightMm={heightMm} pxPerMm={pxPerMm} guides={guides} />
          </Layer>
        </Stage>
      )}
    </div>
  );
}

/** Bleed area, trim line, safe margin and active snap guides. */
function Overlay({
  widthMm,
  heightMm,
  pxPerMm,
  guides,
}: {
  widthMm: number;
  heightMm: number;
  pxPerMm: number;
  guides: ActiveGuides | null;
}) {
  const s = pxPerMm;
  const b = BLEED_MM * s;
  const w = widthMm * s;
  const h = heightMm * s;
  const totalW = w + 2 * b;
  const totalH = h + 2 * b;
  const m = SAFE_MARGIN_MM * s;
  return (
    <>
      <Rect width={totalW} height={b} fill={COLORS.bleed} />
      <Rect y={b + h} width={totalW} height={b} fill={COLORS.bleed} />
      <Rect y={b} width={b} height={h} fill={COLORS.bleed} />
      <Rect x={b + w} y={b} width={b} height={h} fill={COLORS.bleed} />
      <Rect x={b} y={b} width={w} height={h} stroke={COLORS.trim} strokeWidth={1} />
      <Rect
        x={b + m}
        y={b + m}
        width={w - 2 * m}
        height={h - 2 * m}
        stroke={COLORS.safe}
        strokeWidth={1}
        dash={[4, 4]}
      />
      {guides?.vertical != null && (
        <Line
          points={[b + guides.vertical * s, 0, b + guides.vertical * s, totalH]}
          stroke={COLORS.guide}
          strokeWidth={1}
        />
      )}
      {guides?.horizontal != null && (
        <Line
          points={[0, b + guides.horizontal * s, totalW, b + guides.horizontal * s]}
          stroke={COLORS.guide}
          strokeWidth={1}
        />
      )}
    </>
  );
}

function ElementContent({
  element,
  design,
  pxPerMm,
  fontsVersion,
}: {
  element: DesignElement;
  design: Design;
  pxPerMm: number;
  fontsVersion: number;
}) {
  useLoadedImage(element.type === 'image' ? design.assets[element.assetId]?.dataUrl : undefined);
  const node = elementNode(element, design, pxPerMm, cachedImage);
  switch (node?.kind) {
    case undefined:
      return null;
    case 'text':
      // Re-create the node when fonts finish loading, so Konva measures with the real font.
      return <Text key={fontsVersion} {...node.config} />;
    case 'image':
      return <KonvaImage {...node.config} />;
    case 'ellipse':
      return <Ellipse {...node.config} />;
    case 'line':
      return <Line {...node.config} />;
    case 'rect':
      return <Rect {...node.config} />;
  }
}

/** Starts decoding an image and re-renders once it is ready. */
function useLoadedImage(dataUrl: string | undefined): void {
  const [, setLoaded] = useState(0);
  useEffect(() => {
    if (!dataUrl || cachedImage(dataUrl)) return;
    let active = true;
    void loadImage(dataUrl).then(() => {
      if (active) setLoaded((count) => count + 1);
    });
    return () => {
      active = false;
    };
  }, [dataUrl]);
}

/** Loads the fonts used by text elements and returns a counter that changes when fonts finish loading. */
function useFontsVersion(design: Design): number {
  const [version, setVersion] = useState(0);
  const fontSpecs = useMemo(() => designFontSpecs(design).join('|'), [design]);

  useEffect(() => {
    if (!fontSpecs) return;
    let active = true;
    void loadFonts(fontSpecs.split('|')).then(() => {
      if (active) setVersion((count) => count + 1);
    });
    return () => {
      active = false;
    };
  }, [fontSpecs]);

  return version;
}
