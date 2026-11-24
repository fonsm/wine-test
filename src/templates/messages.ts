// User-facing texts of the template and bottle gallery, German and English.
// Loaded into i18next as the "templates" namespace (see src/i18n/index.ts).
// Every template and bottle file needs a name here (checked by a test).

export interface TemplateMessages {
  title: string;
  templates: string;
  bottles: string;
  replaceHint: string;
  templateNames: Record<string, string>;
  bottleNames: Record<string, string>;
}

const en: TemplateMessages = {
  title: 'Templates and bottle',
  templates: 'Template',
  bottles: 'Bottle',
  replaceHint: 'A template replaces the label. Undo brings your previous label back.',
  templateNames: {
    blank: 'Empty label',
    classic: 'Classic',
    elegant: 'Elegant',
    modern: 'Modern',
  },
  bottleNames: {
    'bordeaux-750': 'Bordeaux',
    'burgundy-750': 'Burgundy',
    'schlegel-750': 'Schlegel (Riesling)',
    'sparkling-750': 'Sparkling wine',
  },
};

const de: TemplateMessages = {
  title: 'Vorlagen und Flasche',
  templates: 'Vorlage',
  bottles: 'Flasche',
  replaceHint:
    'Eine Vorlage ersetzt das Etikett. Mit „Rückgängig“ erhalten Sie Ihr vorheriges Etikett zurück.',
  templateNames: {
    blank: 'Leeres Etikett',
    classic: 'Klassisch',
    elegant: 'Elegant',
    modern: 'Modern',
  },
  bottleNames: {
    'bordeaux-750': 'Bordeaux',
    'burgundy-750': 'Burgund',
    'schlegel-750': 'Schlegel (Riesling)',
    'sparkling-750': 'Sekt',
  },
};

export const templateMessages = { en, de } as const;
