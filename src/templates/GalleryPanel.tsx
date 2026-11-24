import { useId } from 'react';
import { useT } from '../i18n/I18nContext';
import type { Design } from '../model/schema';
import type { BottleShape } from './bottles';
import { BOTTLES, TEMPLATES } from './catalog';
import './gallery.css';
import { silhouette } from './silhouette';
import { thumbnailUrl } from './thumbnails';

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
            <TemplateThumbnail id={template.id} design={template.design} />
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

/** The template's pre-rendered picture. Decorative: the button has the name. */
function TemplateThumbnail({ id, design }: { id: string; design: Design }) {
  const src = thumbnailUrl(id);
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
