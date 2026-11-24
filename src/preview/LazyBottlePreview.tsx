// Loads the 3D preview (Three.js) as a separate file after the editor is shown, so it does not
// slow down the first page load. This file is in the main bundle; BottlePreview is not.
import { Component, Suspense, lazy, type ReactNode } from 'react';
import { useT } from '../i18n/I18nContext';
import type { Design } from '../model/schema';
import { PreviewSection } from './PreviewSection';

const BottlePreview = lazy(() => import('./BottlePreview'));

export function LazyBottlePreview({ design }: { design: Design }) {
  const t = useT();
  return (
    <PreviewErrorBoundary
      fallback={
        <PreviewSection mode="error">
          <p role="alert">{t('preview:loadFailed')}</p>
        </PreviewSection>
      }
    >
      <Suspense
        fallback={
          <PreviewSection mode="loading">
            <p className="editor-hint">{t('preview:loading')}</p>
          </PreviewSection>
        }
      >
        <BottlePreview design={design} />
      </Suspense>
    </PreviewErrorBoundary>
  );
}

/** Keeps the editor usable if the preview code cannot be loaded or crashes. */
class PreviewErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
