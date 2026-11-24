import { useEffect, useId, useState } from 'react';
import { useT } from '../i18n/I18nContext';
import type { Design } from '../model/schema';
import { LabelRenderer, prepareDesign } from '../render/renderLabel';
import type { BottleShape } from './bottles';
import { BOTTLES, TEMPLATES } from './catalog';
import './gallery.css';
import { silhouette } from './silhouette';

/** Longer side of a template thumbnail in pixels (sharp on 2× screens at about 70 px). */
const THUMBNAIL_PX = 160;

interface GalleryPanelProps {
  design: Design;
  onApplyTemplate: (templateId: string) => void;
  onPickBottle: (bottleId: string) => void;
}

export function GalleryPanel({ design, onApplyTemplate, onPickBottle }: GalleryPanelProps) {
  const t = useT();
  const headingId = useId();
  const hintId = useId();
  return (
    <section className="editor-section gallery" aria-labelledby={headingId}>
      <h2 id={headingId}>{t('templates:title')}</h2>
      <div className="gallery-group" role="group" aria-label={t('templates:templates')}>
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            className="gallery-item"
            aria-pressed={design.templateId === template.id}
            aria-describedby={hintId}
            onClick={() => {
              onApplyTemplate(template.id);
            }}
          >
            <TemplateThumbnail design={template.design} />
            <span>{t(`templates:templateNames.${template.id}`)}</span>
          </button>
        ))}
      </div>
      <p id={hintId} className="editor-hint">
        {t('templates:replaceHint')}
      </p>
      <div className="gallery-group" role="group" aria-label={t('templates:bottles')}>
        {BOTTLES.map((bottle) => (
          <button
            key={bottle.id}
            type="button"
            className="gallery-item"
            aria-pressed={design.bottleId === bottle.id}
            onClick={() => {
              onPickBottle(bottle.id);
            }}
          >
            <BottleSilhouette bottle={bottle} />
            <span>{t(`templates:bottleNames.${bottle.id}`)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** The template drawn small, once its fonts are loaded. Decorative: the button has the name. */
function TemplateThumbnail({ design }: { design: Design }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void prepareDesign(design).then(() => {
      if (!active) return;
      const renderer = new LabelRenderer();
      try {
        // A data: URL of the local drawing; nothing is loaded from anywhere.
        setSrc(renderer.draw(design, THUMBNAIL_PX).toDataURL('image/png'));
      } finally {
        renderer.dispose();
      }
    });
    return () => {
      active = false;
    };
  }, [design]);
  const { widthMm, heightMm } = design.labelSize;
  return (
    <span
      className="gallery-picture gallery-label"
      style={{ aspectRatio: `${String(widthMm)} / ${String(heightMm)}` }}
    >
      {src && <img src={src} alt="" />}
    </span>
  );
}

function BottleSilhouette({ bottle }: { bottle: BottleShape }) {
  const clipId = useId();
  const { viewBox, outline, capsuleHeight } = silhouette(bottle);
  return (
    <span className="gallery-picture">
      <svg
        viewBox={`${String(viewBox.x)} ${String(viewBox.y)} ${String(viewBox.width)} ${String(viewBox.height)}`}
        aria-hidden="true"
        focusable="false"
      >
        <clipPath id={clipId}>
          <path d={outline} />
        </clipPath>
        <path d={outline} fill={bottle.glassColor} />
        <rect
          x={viewBox.x}
          y={0}
          width={viewBox.width}
          height={capsuleHeight}
          fill={bottle.capsuleColor}
          clipPath={`url(#${clipId})`}
        />
      </svg>
    </span>
  );
}
