import { useId, useState } from 'react';
import { useT } from '../i18n/I18nContext';
import type { Design } from '../model/schema';
import { BLEED_MM, EXPORT_DPI } from '../print/geometry';
import { saveFile } from '../util/download';
import type { ExportLayout } from './plan';
import './export.css';

export const LABEL_PDF_FILE_NAME = 'wine-label.pdf';
export const CALIBRATION_PDF_FILE_NAME = 'wine-label-calibration-page.pdf';

type Status =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'done'; lowResolutionImages: number }
  | { kind: 'error' };

/** pdf-lib and the export code are loaded on the first download only. */
const loadExport = () => import('./exportPdf');

function savePdf(bytes: Uint8Array, fileName: string) {
  saveFile(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }), fileName);
}

export function ExportPanel({ design }: { design: Design }) {
  const t = useT();
  const headingId = useId();
  const instructionsId = useId();
  const [layout, setLayout] = useState<ExportLayout>('printer');
  const [bleed, setBleed] = useState(true);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function downloadLabel() {
    setStatus({ kind: 'working' });
    try {
      const { createLabelPdf } = await loadExport();
      const result = await createLabelPdf(design, { layout, bleed }, t('export:labelTitle'));
      savePdf(result.bytes, LABEL_PDF_FILE_NAME);
      setStatus({ kind: 'done', lowResolutionImages: result.lowResolutionImages });
    } catch {
      setStatus({ kind: 'error' });
    }
  }

  async function downloadCalibration() {
    try {
      const { createCalibrationPdf } = await loadExport();
      savePdf(await createCalibrationPdf(t), CALIBRATION_PDF_FILE_NAME);
    } catch {
      setStatus({ kind: 'error' });
    }
  }

  return (
    <section className="editor-section export-panel" aria-labelledby={headingId}>
      <h2 id={headingId}>{t('export:title')}</h2>
      <fieldset className="export-layout">
        <legend>{t('export:layoutLabel')}</legend>
        {(['printer', 'shop'] as const).map((option) => (
          <label key={option}>
            <input
              type="radio"
              name={`${headingId}-layout`}
              value={option}
              checked={layout === option}
              onChange={() => {
                setLayout(option);
              }}
            />
            <span>{t(`export:layout.${option}`)}</span>
          </label>
        ))}
      </fieldset>
      <label className="export-check">
        <input
          type="checkbox"
          checked={bleed}
          onChange={(event) => {
            setBleed(event.target.checked);
          }}
        />
        <span>{t('export:bleed', { mm: BLEED_MM })}</span>
      </label>
      <div id={instructionsId} className="export-instructions" role="note">
        <strong>{t('export:instructions')}</strong>
        <p>{t('export:instructionsDetail')}</p>
      </div>
      <div className="export-buttons">
        <button
          type="button"
          className="export-primary"
          aria-describedby={instructionsId}
          disabled={status.kind === 'working'}
          onClick={() => void downloadLabel()}
        >
          {t('export:download')}
        </button>
        <button
          type="button"
          aria-describedby={instructionsId}
          onClick={() => void downloadCalibration()}
        >
          {t('export:downloadCalibration')}
        </button>
      </div>
      {status.kind !== 'idle' && (
        <p role={status.kind === 'error' ? 'alert' : 'status'} data-testid="export-status">
          {status.kind === 'working' && t('export:working')}
          {status.kind === 'error' && t('export:failed')}
          {status.kind === 'done' &&
            (status.lowResolutionImages > 0
              ? `${t('export:done')} ${t('export:lowResolution', { count: status.lowResolutionImages, dpi: EXPORT_DPI })}`
              : t('export:done'))}
        </p>
      )}
    </section>
  );
}
