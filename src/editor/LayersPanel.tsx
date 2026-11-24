import type { TFunction } from 'i18next';
import { useId } from 'react';
import type { DesignElement } from '../model/schema';

interface LayersPanelProps {
  t: TFunction;
  /** Stored back to front; shown front first, like most design tools. */
  elements: readonly DesignElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const MAX_NAME_LENGTH = 40;

export function layerName(t: TFunction, element: DesignElement): string {
  switch (element.type) {
    case 'text': {
      const text = element.text.replace(/\s+/g, ' ').trim();
      if (!text) return t('editor:emptyText');
      return text.length > MAX_NAME_LENGTH ? `${text.slice(0, MAX_NAME_LENGTH)}…` : text;
    }
    case 'image':
      return t('editor:imageLayer');
    case 'shape':
      return t('editor:shapeLayer');
  }
}

export function LayersPanel({ t, elements, selectedId, onSelect }: LayersPanelProps) {
  const headingId = useId();
  const frontFirst = [...elements].reverse();
  return (
    <section className="editor-section" aria-labelledby={headingId}>
      <h2 id={headingId}>{t('editor:layers')}</h2>
      {elements.length === 0 && <p className="editor-hint">{t('editor:noLayers')}</p>}
      <ul className="editor-layers" aria-labelledby={headingId}>
        {frontFirst.map((element) => (
          <li key={element.id}>
            {/* Layer names come from user text: rendered as plain text. */}
            <button
              type="button"
              aria-pressed={element.id === selectedId}
              onClick={() => {
                onSelect(element.id);
              }}
            >
              {layerName(t, element)}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
