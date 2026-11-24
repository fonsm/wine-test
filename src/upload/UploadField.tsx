import type { TFunction } from 'i18next';
import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { formatIssue } from './format';
import { MAX_FILE_SIZE_MB } from './limits';
import { processUpload } from './process';
import {
  ACCEPTED_IMAGE_TYPES,
  type CleanImage,
  type UploadError,
  type UploadWarning,
} from './types';

type State =
  | { kind: 'idle' }
  | { kind: 'busy'; fileName: string }
  | { kind: 'error'; fileName: string; error: UploadError }
  | {
      kind: 'done';
      fileName: string;
      image: CleanImage;
      previewUrl: string;
      warnings: UploadWarning[];
    };

interface UploadFieldProps {
  t: TFunction;
  /** Called with the cleaned, metadata-free image. */
  onImage?: (image: CleanImage) => void;
}

export function UploadField({ t, onImage }: UploadFieldProps) {
  const inputId = useId();
  const hintId = useId();
  const [state, setState] = useState<State>({ kind: 'idle' });
  const latestRequest = useRef(0);

  const previewUrl = state.kind === 'done' ? state.previewUrl : null;
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  async function handleFile(file: File) {
    const request = ++latestRequest.current;
    setState({ kind: 'busy', fileName: file.name });
    const result = await processUpload(file);
    if (request !== latestRequest.current) return; // a newer file was chosen meanwhile

    if (!result.ok) {
      setState({ kind: 'error', fileName: file.name, error: result.error });
      return;
    }
    setState({
      kind: 'done',
      fileName: file.name,
      image: result.image,
      previewUrl: URL.createObjectURL(result.image.blob),
      warnings: result.warnings,
    });
    onImage?.(result.image);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void handleFile(file);
  }

  return (
    <section className="upload">
      <label htmlFor={inputId}>{t('upload:label')}</label>
      <input
        id={inputId}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        aria-describedby={hintId}
        onChange={handleChange}
      />
      <p id={hintId}>{t('upload:hint', { maxMegabytes: MAX_FILE_SIZE_MB })}</p>

      {state.kind === 'busy' && (
        <UploadStatus kind="info" message={t('upload:processing', { fileName: state.fileName })} />
      )}
      {state.kind === 'error' && (
        <UploadStatus kind="error" message={formatIssue(t, state.error, state.fileName)} />
      )}
      {state.kind === 'done' && (
        <>
          <UploadStatus
            kind="info"
            message={t('upload:accepted', {
              fileName: state.fileName,
              width: state.image.width,
              height: state.image.height,
            })}
            details={state.warnings.map((warning) => formatIssue(t, warning, state.fileName))}
          />
          <img
            data-testid="upload-preview"
            src={state.previewUrl}
            alt={t('upload:previewAlt')}
            className="upload-preview"
          />
        </>
      )}
    </section>
  );
}

interface UploadStatusProps {
  kind: 'info' | 'error';
  message: string;
  details?: string[];
}

/** Shows a message as plain text. Messages contain the user's file name, so never render them as HTML. */
export function UploadStatus({ kind, message, details = [] }: UploadStatusProps) {
  return (
    <div role={kind === 'error' ? 'alert' : 'status'}>
      {message}
      {details.map((detail) => (
        <p key={detail}>{detail}</p>
      ))}
    </div>
  );
}
