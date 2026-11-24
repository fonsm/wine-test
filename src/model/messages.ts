// User-facing texts for saving and opening designs, German and English.
// Loaded into i18next as the "design" namespace (see src/i18n/index.ts).
import type { DesignFileErrorCode } from './serialize';

export interface DesignMessages {
  save: string;
  open: string;
  loaded_one: string;
  loaded_other: string;
  errors: Record<DesignFileErrorCode, string>;
}

const en: DesignMessages = {
  save: 'Save design',
  open: 'Open design',
  loaded_one: '“{{fileName}}” was opened ({{count}} element).',
  loaded_other: '“{{fileName}}” was opened ({{count}} elements).',
  errors: {
    FILE_TOO_LARGE: '“{{fileName}}” is too large. Design files can be at most {{maxMegabytes}} MB.',
    INVALID_JSON:
      '“{{fileName}}” could not be read. It is not a valid design file. Please choose a .json file saved with this designer.',
    NOT_A_DESIGN:
      '“{{fileName}}” is not a wine label design. Please choose a .json file saved with this designer.',
    UNSUPPORTED_VERSION:
      '“{{fileName}}” was saved with a newer version of the designer (file version {{version}}, this version supports up to {{supportedVersion}}). Please reload the page and try again.',
    INVALID_DESIGN:
      '“{{fileName}}” is damaged or incomplete and could not be opened. Problem found at: {{path}}.',
  },
};

const de: DesignMessages = {
  save: 'Entwurf speichern',
  open: 'Entwurf öffnen',
  loaded_one: '„{{fileName}}“ wurde geöffnet ({{count}} Element).',
  loaded_other: '„{{fileName}}“ wurde geöffnet ({{count}} Elemente).',
  errors: {
    FILE_TOO_LARGE:
      '„{{fileName}}“ ist zu groß. Entwurfsdateien dürfen höchstens {{maxMegabytes}} MB groß sein.',
    INVALID_JSON:
      '„{{fileName}}“ konnte nicht gelesen werden. Es ist keine gültige Entwurfsdatei. Bitte wählen Sie eine .json-Datei, die mit diesem Designer gespeichert wurde.',
    NOT_A_DESIGN:
      '„{{fileName}}“ ist kein Weinetiketten-Entwurf. Bitte wählen Sie eine .json-Datei, die mit diesem Designer gespeichert wurde.',
    UNSUPPORTED_VERSION:
      '„{{fileName}}“ wurde mit einer neueren Version des Designers gespeichert (Dateiversion {{version}}, diese Version unterstützt bis {{supportedVersion}}). Bitte laden Sie die Seite neu und versuchen Sie es erneut.',
    INVALID_DESIGN:
      '„{{fileName}}“ ist beschädigt oder unvollständig und konnte nicht geöffnet werden. Fehler gefunden bei: {{path}}.',
  },
};

export const designMessages = { en, de } as const;
