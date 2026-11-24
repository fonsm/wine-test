import type { TFunction } from 'i18next';
import { useId, useRef, useState, type ChangeEvent } from 'react';
import { downloadDesign } from './download';
import { formatDesignFileError } from './format';
import type { Design } from './schema';
import { readDesignFile, type DesignFileError } from './serialize';

interface DesignFileControlsProps {
  t: TFunction;
  design: Design;
  /** Called with a validated design. Not called for invalid files: the current design stays. */
  onLoad: (design: Design) => void;
}

// Messages are formatted when rendering, so they follow a language switch.
type Status =
  | { kind: 'idle' }
  | { kind: 'loaded'; fileName: string; count: number }
  | { kind: 'error'; fileName: string; error: DesignFileError };

export function DesignFileControls({ t, design, onLoad }: DesignFileControlsProps) {
  const inputId = useId();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const latestRequest = useRef(0);

  async function handleFile(file: File) {
    const request = ++latestRequest.current;
    const result = await readDesignFile(file);
    if (request !== latestRequest.current) return;
    if (!result.ok) {
      setStatus({ kind: 'error', fileName: file.name, error: result.error });
      return;
    }
    onLoad(result.design);
    setStatus({ kind: 'loaded', fileName: file.name, count: result.design.elements.length });
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so choosing the same file again triggers another change event.
    event.target.value = '';
    if (file) void handleFile(file);
  }

  return (
    <section className="design-file">
      <button
        type="button"
        onClick={() => {
          downloadDesign(design);
        }}
      >
        {t('design:save')}
      </button>
      <label htmlFor={inputId}>{t('design:open')}</label>
      <input id={inputId} type="file" accept=".json,application/json" onChange={handleChange} />
      {/* Messages contain the user's file name: rendered as text only, never as HTML. */}
      {status.kind !== 'idle' && (
        <p data-testid="design-file-status" role={status.kind === 'error' ? 'alert' : 'status'}>
          {status.kind === 'error'
            ? formatDesignFileError(t, status.error, status.fileName)
            : t('design:loaded', { fileName: status.fileName, count: status.count })}
        </p>
      )}
    </section>
  );
}
