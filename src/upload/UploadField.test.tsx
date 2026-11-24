import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createI18n } from '../i18n';
import { UploadField, UploadStatus } from './UploadField';

describe('UploadField', () => {
  it('renders a labelled file input that accepts only PNG, JPEG and WebP', () => {
    const html = renderToStaticMarkup(<UploadField t={createI18n('en').t} />);
    expect(html).toContain('type="file"');
    expect(html).toContain('accept="image/png,image/jpeg,image/webp"');
    expect(html).toContain('Upload a photo or image');
  });

  it('uses the German texts in German', () => {
    const html = renderToStaticMarkup(<UploadField t={createI18n('de').t} />);
    expect(html).toContain('Foto oder Bild hochladen');
  });
});

describe('UploadStatus', () => {
  it('shows errors in an alert region', () => {
    const html = renderToStaticMarkup(<UploadStatus kind="error" message="Bad file" />);
    expect(html).toMatch(/role="alert"[^>]*>Bad file</);
  });

  it('never inserts the message (which contains the file name) as HTML', () => {
    const { t } = createI18n('en');
    const fileName = '<img src=x onerror=alert(1)>.png';
    const message = t('upload:errors.UNSUPPORTED_TYPE', { fileName });

    const html = renderToStaticMarkup(<UploadStatus kind="error" message={message} />);

    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;.png');
  });
});
