// The bottle preview: the label drawn by LabelRenderer, wrapped around a 3D bottle (WebGL), or
// shown on a flat bottle if WebGL is unavailable or too slow. Loaded lazily (LazyBottlePreview).
import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n/I18nContext';
import type { Design } from '../model/schema';
import { LabelRenderer, prepareDesign } from '../render/renderLabel';
import { bottleShape } from '../templates/catalog';
import { drawFlatPreview } from './flat';
import { chooseQuality } from './performance';
import { PreviewSection, type PreviewMode } from './PreviewSection';
import { createLatestRunner } from './schedule';
import { createViewer, supportsWebGL2, type Viewer } from './viewer';
import { labelWrap } from './wrap';

/** Edits are collected for this long, then drawn at once (well within the 300 ms target). */
const UPDATE_DELAY_MS = 30;
/** Longer side of the label texture: about 220 dpi on a 90 × 120 mm label. */
const LABEL_TEXTURE_MAX_PX = 1024;
/** Resolution of the flat fallback picture, in pixels per millimetre of bottle. */
const FLAT_PX_PER_MM = 3;
/** Frames rendered to decide whether this device is fast enough for 3D. */
const MEASURED_FRAMES = 5;

/** Pause before measuring the 3D speed a second time. */
const RETRY_PAUSE_MS = 500;

type FallbackReason = 'webgl' | 'slow';

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/** Resolves after the next frame (the viewer renders in requestAnimationFrame before that). */
const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 0);
    });
  });

export default function BottlePreview({ design }: { design: Design }) {
  const t = useT();
  const bottle = bottleShape(design.bottleId);
  const [mode, setMode] = useState<PreviewMode>('loading');
  const [reason, setReason] = useState<FallbackReason | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const flatRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const pushRef = useRef<((design: Design) => void) | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const flat = flatRef.current;
    if (!stage || !flat) return;
    const renderer = new LabelRenderer();
    let latest: Design | null = null;
    let measured = false;
    let revision = 0;
    let active = true;

    /** False after unmount, or when the viewer was replaced (TypeScript cannot see `await` changing `active`). */
    const stillShowing = (viewer: Viewer) => active && viewerRef.current === viewer;

    function showFlat(why: FallbackReason) {
      viewerRef.current?.dispose();
      viewerRef.current = null;
      canvas.remove();
      setReason(why);
      setMode('flat');
    }

    // A fresh canvas per viewer: a canvas whose WebGL context was released cannot get a new one.
    const canvas = document.createElement('canvas');
    canvas.className = 'bottle-preview-canvas';
    stage.append(canvas);
    if (supportsWebGL2()) {
      try {
        viewerRef.current = createViewer(canvas, bottle, () => {
          showFlat('webgl');
          if (latest) runner.push(latest);
        });
      } catch {
        viewerRef.current = null;
      }
    }
    if (!viewerRef.current) showFlat('webgl');

    const runner = createLatestRunner<Design>(UPDATE_DELAY_MS, async (next) => {
      await prepareDesign(next);
      if (!active) return;
      const image = renderer.draw(next, LABEL_TEXTURE_MAX_PX);
      const viewer = viewerRef.current;
      if (viewer) {
        viewer.setLabel(image, next.labelSize);
        if (!measured) {
          measured = true;
          const quality = await chooseQuality(
            {
              measure: () => viewer.measureFrames(MEASURED_FRAMES),
              pixelRatio: () => viewer.pixelRatio(),
              setPixelRatio: (ratio) => {
                viewer.setPixelRatio(ratio);
              },
            },
            () => wait(RETRY_PAUSE_MS),
          );
          // Unmounted, or WebGL was lost during the pause (that path redraws on its own).
          if (!stillShowing(viewer)) return;
          if (quality === 'flat') showFlat('slow');
          else setMode('3d');
        }
      }
      if (!viewerRef.current) {
        drawFlatPreview(flat, image, bottle, labelWrap(next.labelSize, bottle), FLAT_PX_PER_MM);
      }
      // Marks the update as visible once the frame with it is drawn (used by the browser tests).
      await nextFrame();
      revision++;
      if (sectionRef.current) sectionRef.current.dataset.revision = String(revision);
    });
    pushRef.current = (next) => {
      latest = next;
      runner.push(next);
    };

    return () => {
      active = false;
      runner.cancel();
      pushRef.current = null;
      viewerRef.current?.dispose();
      viewerRef.current = null;
      canvas.remove();
      renderer.dispose();
    };
  }, [bottle]);

  useEffect(() => {
    pushRef.current?.(design);
  }, [design, bottle]);

  const message = reason === 'slow' ? t('preview:fallbackSlow') : t('preview:fallbackNoWebgl');
  return (
    <PreviewSection mode={mode} bottleId={bottle.id} fallback={reason} sectionRef={sectionRef}>
      {mode === 'loading' && <p className="editor-hint">{t('preview:loading')}</p>}
      {reason && (
        <p role="status" className="bottle-preview-message">
          {message}
        </p>
      )}
      <div
        ref={stageRef}
        className="bottle-preview-stage"
        role="img"
        aria-label={t('preview:canvasLabel')}
        hidden={mode === 'flat'}
      />
      <canvas
        ref={flatRef}
        className="bottle-preview-flat"
        role="img"
        aria-label={t('preview:flatLabel')}
        hidden={mode !== 'flat'}
      />
    </PreviewSection>
  );
}
