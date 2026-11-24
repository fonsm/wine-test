// User-facing texts of the PDF export, German and English.
// Loaded into i18next as the "export" namespace (see src/i18n/index.ts). The calibration texts
// are printed with a standard PDF font: only Latin-1 style characters (checked by a test).

export interface ExportMessages {
  title: string;
  layoutLabel: string;
  layout: { printer: string; shop: string };
  bleed: string;
  instructions: string;
  instructionsDetail: string;
  download: string;
  downloadCalibration: string;
  working: string;
  done: string;
  lowResolution_one: string;
  lowResolution_other: string;
  failed: string;
  labelTitle: string;
  calibration: {
    title: string;
    line1: string;
    line2: string;
    line3: string;
    square: string;
    ruler: string;
  };
}

const en: ExportMessages = {
  title: 'Print PDF',
  layoutLabel: 'Page layout',
  layout: {
    printer: 'For my printer: label on A4 with crop marks',
    shop: 'For a print shop: page is the label size',
  },
  bleed: 'Add {{mm}} mm bleed',
  instructions: 'Print at 100%, no scaling.',
  instructionsDetail:
    'In the print dialog, choose “Actual size” or “100%” and turn off “Fit to page”. Check your printer with the calibration page first.',
  download: 'Download PDF',
  downloadCalibration: 'Download calibration page',
  working: 'Creating the PDF …',
  done: 'The PDF was created.',
  lowResolution_one:
    '{{count}} image has less than {{dpi}} dpi at its size on the label and may look blurry in print.',
  lowResolution_other:
    '{{count}} images have less than {{dpi}} dpi at their size on the label and may look blurry in print.',
  failed: 'The PDF could not be created. Please try again.',
  labelTitle: 'Wine label',
  calibration: {
    title: 'Calibration page',
    line1: 'Print this page at 100%, no scaling (“Actual size”, “Fit to page” turned off).',
    line2:
      'Then measure with a ruler: the square must be exactly {{square}} × {{square}} mm, and the ruler from 0 to {{cm}} exactly {{ruler}} mm.',
    line3:
      'If a size is wrong, check the scaling in the print dialog and in the printer settings, and print again. Only print labels once the sizes are right.',
    square: 'Square: {{square}} × {{square}} mm',
    ruler: 'Ruler: 0 to {{cm}} cm = {{ruler}} mm',
  },
};

const de: ExportMessages = {
  title: 'Druck-PDF',
  layoutLabel: 'Seitenaufteilung',
  layout: {
    printer: 'Für meinen Drucker: Etikett auf A4 mit Schnittmarken',
    shop: 'Für eine Druckerei: Seite in Etikettengröße',
  },
  bleed: '{{mm}} mm Beschnitt hinzufügen',
  instructions: 'Mit 100 % drucken, ohne Skalierung.',
  instructionsDetail:
    'Wählen Sie im Druckdialog „Tatsächliche Größe“ oder „100 %“ und schalten Sie „An Seite anpassen“ aus. Prüfen Sie Ihren Drucker vorher mit der Kalibrierseite.',
  download: 'PDF herunterladen',
  downloadCalibration: 'Kalibrierseite herunterladen',
  working: 'Das PDF wird erstellt …',
  done: 'Das PDF wurde erstellt.',
  lowResolution_one:
    '{{count}} Bild hat in seiner Größe auf dem Etikett weniger als {{dpi}} dpi und kann im Druck unscharf aussehen.',
  lowResolution_other:
    '{{count}} Bilder haben in ihrer Größe auf dem Etikett weniger als {{dpi}} dpi und können im Druck unscharf aussehen.',
  failed: 'Das PDF konnte nicht erstellt werden. Bitte versuchen Sie es erneut.',
  labelTitle: 'Weinetikett',
  calibration: {
    title: 'Kalibrierseite',
    line1:
      'Drucken Sie diese Seite mit 100 %, ohne Skalierung („Tatsächliche Größe“, „An Seite anpassen“ ausgeschaltet).',
    line2:
      'Messen Sie dann mit einem Lineal nach: Das Quadrat muss genau {{square}} × {{square}} mm groß sein, das Lineal von 0 bis {{cm}} genau {{ruler}} mm lang.',
    line3:
      'Stimmt eine Größe nicht, prüfen Sie die Skalierung im Druckdialog und in den Druckereinstellungen und drucken Sie erneut. Drucken Sie Etiketten erst, wenn die Größen stimmen.',
    square: 'Quadrat: {{square}} × {{square}} mm',
    ruler: 'Lineal: 0 bis {{cm}} cm = {{ruler}} mm',
  },
};

export const exportMessages = { en, de } as const;
