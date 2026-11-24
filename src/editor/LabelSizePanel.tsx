import type { TFunction } from 'i18next';
import { useId, useState } from 'react';
import {
  LABEL_SIZE_PRESETS,
  MAX_LABEL_SIZE_MM,
  MIN_LABEL_SIZE_MM,
  isValidLabelSize,
  type LabelSize,
} from '../print/geometry';
import { NumberField } from './NumberField';

interface LabelSizePanelProps {
  t: TFunction;
  size: LabelSize;
  /** `merge`: typing a size becomes one undo step. */
  onChange: (size: LabelSize, merge: boolean) => void;
}

const CUSTOM = 'custom';
const presetId = (size: LabelSize) => `${String(size.widthMm)}x${String(size.heightMm)}`;
const sameSize = (a: LabelSize | null, b: LabelSize) =>
  a !== null && a.widthMm === b.widthMm && a.heightMm === b.heightMm;

export function LabelSizePanel({ t, size, onChange }: LabelSizePanelProps) {
  const selectId = useId();
  const rangeId = useId();
  // The size at which the user last chose or typed a custom size. While the label still has
  // that size, the custom fields stay open, even if it equals a preset. After undo/redo or
  // opening a file, the selection follows the size again.
  const [customAt, setCustomAt] = useState<LabelSize | null>(null);
  const preset = LABEL_SIZE_PRESETS.find((candidate) => sameSize(candidate, size));
  const showCustom = !preset || sameSize(customAt, size);

  function commit(next: LabelSize) {
    if (!isValidLabelSize(next)) return;
    setCustomAt(next);
    onChange(next, true);
  }

  return (
    <section className="editor-section">
      <div className="editor-field">
        <label htmlFor={selectId}>{t('editor:labelSize.title')}</label>
        <select
          id={selectId}
          value={showCustom ? CUSTOM : presetId(size)}
          onChange={(event) => {
            const chosen = LABEL_SIZE_PRESETS.find(
              (candidate) => presetId(candidate) === event.target.value,
            );
            if (chosen) {
              setCustomAt(null);
              onChange(chosen, false);
            } else {
              setCustomAt(size);
            }
          }}
        >
          {LABEL_SIZE_PRESETS.map((candidate) => (
            <option key={presetId(candidate)} value={presetId(candidate)}>
              {t('editor:labelSize.preset', {
                width: candidate.widthMm,
                height: candidate.heightMm,
              })}
            </option>
          ))}
          <option value={CUSTOM}>{t('editor:labelSize.custom')}</option>
        </select>
      </div>
      {showCustom && (
        <>
          <div className="editor-grid editor-label-size">
            <NumberField
              label={t('editor:labelSize.width')}
              value={size.widthMm}
              step={1}
              min={MIN_LABEL_SIZE_MM}
              max={MAX_LABEL_SIZE_MM}
              describedBy={rangeId}
              onCommit={(widthMm) => {
                commit({ ...size, widthMm });
              }}
            />
            <NumberField
              label={t('editor:labelSize.height')}
              value={size.heightMm}
              step={1}
              min={MIN_LABEL_SIZE_MM}
              max={MAX_LABEL_SIZE_MM}
              describedBy={rangeId}
              onCommit={(heightMm) => {
                commit({ ...size, heightMm });
              }}
            />
          </div>
          <p id={rangeId} className="editor-hint">
            {t('editor:labelSize.range', { min: MIN_LABEL_SIZE_MM, max: MAX_LABEL_SIZE_MM })}
          </p>
        </>
      )}
    </section>
  );
}
