// User-facing texts of the bottle preview, German and English.
// Loaded into i18next as the "preview" namespace (see src/i18n/index.ts). Kept out of the
// lazily loaded preview code, so the loading and error texts are available right away.

export interface PreviewMessages {
  title: string;
  loading: string;
  loadFailed: string;
  canvasLabel: string;
  flatLabel: string;
  turnLeft: string;
  turnRight: string;
  frontView: string;
  fallbackNoWebgl: string;
  fallbackSlow: string;
}

const en: PreviewMessages = {
  title: 'Bottle preview',
  loading: 'Loading the 3D preview …',
  loadFailed: 'The preview could not be loaded. Reload the page to try again.',
  canvasLabel: 'Bottle with your label in 3D. Drag sideways to turn it.',
  flatLabel: 'Flat preview of the bottle with your label',
  turnLeft: 'Turn left',
  turnRight: 'Turn right',
  frontView: 'Front view',
  fallbackNoWebgl:
    'The 3D preview needs WebGL, which is turned off or not supported in this browser. Showing a flat preview instead.',
  fallbackSlow: 'The 3D preview is too slow on this device. Showing a flat preview instead.',
};

const de: PreviewMessages = {
  title: 'Flaschenvorschau',
  loading: 'Die 3D-Vorschau wird geladen …',
  loadFailed: 'Die Vorschau konnte nicht geladen werden. Laden Sie die Seite neu.',
  canvasLabel: 'Flasche mit Ihrem Etikett in 3D. Ziehen Sie seitlich, um sie zu drehen.',
  flatLabel: 'Flache Vorschau der Flasche mit Ihrem Etikett',
  turnLeft: 'Nach links drehen',
  turnRight: 'Nach rechts drehen',
  frontView: 'Vorderansicht',
  fallbackNoWebgl:
    'Die 3D-Vorschau braucht WebGL. Das ist in diesem Browser ausgeschaltet oder nicht verfügbar. Sie sehen stattdessen eine flache Vorschau.',
  fallbackSlow:
    'Die 3D-Vorschau ist auf diesem Gerät zu langsam. Sie sehen stattdessen eine flache Vorschau.',
};

export const previewMessages = { en, de } as const;
