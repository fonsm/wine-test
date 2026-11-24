// User-facing texts of the upload module, German and English.
// Loaded into i18next as the "upload" namespace (see src/i18n/index.ts).
// Every message names the file via {{fileName}}; React renders it as plain text.
import type { UploadErrorCode, UploadWarningCode } from './types';

export interface UploadMessages {
  label: string;
  hint: string;
  processing: string;
  accepted: string;
  previewAlt: string;
  errors: Record<UploadErrorCode, string>;
  warnings: Record<UploadWarningCode, string>;
}

const en: UploadMessages = {
  label: 'Upload a photo or image',
  hint: 'PNG, JPEG or WebP, up to {{maxMegabytes}} MB. Your image stays on your device.',
  processing: 'Checking “{{fileName}}” …',
  accepted:
    '“{{fileName}}” is ready ({{width}} × {{height}} px). Location and camera data were removed.',
  previewAlt: 'Preview of the uploaded image',
  errors: {
    FILE_TOO_LARGE: '“{{fileName}}” is too large. The maximum file size is {{maxMegabytes}} MB.',
    UNSUPPORTED_TYPE:
      '“{{fileName}}” is not a supported image. Please use a PNG, JPEG or WebP file.',
    TYPE_MISMATCH:
      'The file name of “{{fileName}}” does not match its content. Please save the image again with the correct file extension (.png, .jpg or .webp).',
    CORRUPT_IMAGE:
      '“{{fileName}}” could not be read. The file may be damaged. Please try a different file.',
    DIMENSIONS_TOO_LARGE:
      '“{{fileName}}” has too many pixels. The maximum is {{maxSidePx}} px per side and {{maxMegapixels}} megapixels in total.',
  },
  warnings: {
    TOO_SMALL:
      '“{{fileName}}” has a low resolution ({{width}} × {{height}} px) and may look blurry in print. To fill the whole label at {{dpi}} DPI, use at least {{minWidth}} × {{minHeight}} px.',
  },
};

const de: UploadMessages = {
  label: 'Foto oder Bild hochladen',
  hint: 'PNG, JPEG oder WebP, bis {{maxMegabytes}} MB. Ihr Bild bleibt auf Ihrem Gerät.',
  processing: '„{{fileName}}“ wird geprüft …',
  accepted:
    '„{{fileName}}“ ist bereit ({{width}} × {{height}} px). Standort- und Kameradaten wurden entfernt.',
  previewAlt: 'Vorschau des hochgeladenen Bildes',
  errors: {
    FILE_TOO_LARGE:
      '„{{fileName}}“ ist zu groß. Die maximale Dateigröße beträgt {{maxMegabytes}} MB.',
    UNSUPPORTED_TYPE:
      '„{{fileName}}“ ist kein unterstütztes Bildformat. Bitte verwenden Sie eine PNG-, JPEG- oder WebP-Datei.',
    TYPE_MISMATCH:
      'Dateiname und Inhalt von „{{fileName}}“ passen nicht zusammen. Bitte speichern Sie das Bild mit der richtigen Dateiendung (.png, .jpg oder .webp).',
    CORRUPT_IMAGE:
      '„{{fileName}}“ konnte nicht gelesen werden. Die Datei ist möglicherweise beschädigt. Bitte versuchen Sie eine andere Datei.',
    DIMENSIONS_TOO_LARGE:
      '„{{fileName}}“ hat zu viele Pixel. Erlaubt sind höchstens {{maxSidePx}} px pro Seite und {{maxMegapixels}} Megapixel insgesamt.',
  },
  warnings: {
    TOO_SMALL:
      '„{{fileName}}“ hat eine niedrige Auflösung ({{width}} × {{height}} px) und wirkt im Druck womöglich unscharf. Für ein ganzes Etikett mit {{dpi}} DPI empfehlen wir mindestens {{minWidth}} × {{minHeight}} px.',
  },
};

export const uploadMessages = { en, de } as const;
