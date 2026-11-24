import { useId, type ReactNode, type Ref } from 'react';
import { useT } from '../i18n/I18nContext';
import './preview.css';

export type PreviewMode = 'loading' | '3d' | 'flat' | 'error';

/** The frame around the preview, shared by the loading state and the loaded preview. */
export function PreviewSection({
  mode,
  sectionRef,
  children,
}: {
  mode: PreviewMode;
  sectionRef?: Ref<HTMLElement>;
  children: ReactNode;
}) {
  const t = useT();
  const headingId = useId();
  return (
    <section
      ref={sectionRef}
      className="editor-section bottle-preview"
      aria-labelledby={headingId}
      data-testid="bottle-preview"
      data-mode={mode}
    >
      <h2 id={headingId}>{t('preview:title')}</h2>
      {children}
    </section>
  );
}
