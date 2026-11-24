// User-facing texts of the editor, German and English.
// Loaded into i18next as the "editor" namespace (see src/i18n/index.ts).

export interface EditorMessages {
  addText: string;
  defaultText: string;
  undo: string;
  redo: string;
  delete: string;
  canvasLabel: string;
  canvasHelp: string;
  layers: string;
  noLayers: string;
  imageLayer: string;
  shapeLayer: string;
  emptyText: string;
  properties: string;
  noSelection: string;
  fields: {
    text: string;
    font: string;
    fontSize: string;
    color: string;
    align: string;
    bold: string;
    italic: string;
    x: string;
    y: string;
    width: string;
    height: string;
    rotation: string;
  };
  align: { left: string; center: string; right: string };
  order: { title: string; forward: string; backward: string; front: string; back: string };
  labelSize: {
    title: string;
    preset: string;
    custom: string;
    width: string;
    height: string;
    range: string;
  };
}

const en: EditorMessages = {
  addText: 'Add text',
  defaultText: 'Your text',
  undo: 'Undo',
  redo: 'Redo',
  delete: 'Delete',
  canvasLabel: 'Label',
  canvasHelp:
    'Drag elements to move them, use the handles to resize and rotate. With the keyboard: arrow keys move the selected element (Shift: 10 mm), Delete removes it, Ctrl+Z undoes, Ctrl+Shift+Z redoes.',
  layers: 'Layers',
  noLayers: 'No elements yet. Add text or an image.',
  imageLayer: 'Image',
  shapeLayer: 'Shape',
  emptyText: 'Empty text',
  properties: 'Properties',
  noSelection: 'Select an element on the label or in the layer list to edit it.',
  fields: {
    text: 'Text',
    font: 'Font',
    fontSize: 'Size (pt)',
    color: 'Colour',
    align: 'Alignment',
    bold: 'Bold',
    italic: 'Italic',
    x: 'X (mm)',
    y: 'Y (mm)',
    width: 'Width (mm)',
    height: 'Height (mm)',
    rotation: 'Rotation (°)',
  },
  align: { left: 'Left', center: 'Centre', right: 'Right' },
  order: {
    title: 'Layer order',
    forward: 'Forward',
    backward: 'Backward',
    front: 'To front',
    back: 'To back',
  },
  labelSize: {
    title: 'Label size',
    preset: '{{width}} × {{height}} mm',
    custom: 'Custom size',
    width: 'Label width (mm)',
    height: 'Label height (mm)',
    range:
      'Each side between {{min}} and {{max}} mm. Elements keep their place relative to the centre.',
  },
};

const de: EditorMessages = {
  addText: 'Text hinzufügen',
  defaultText: 'Ihr Text',
  undo: 'Rückgängig',
  redo: 'Wiederholen',
  delete: 'Löschen',
  canvasLabel: 'Etikett',
  canvasHelp:
    'Ziehen Sie Elemente, um sie zu verschieben. Mit den Anfassern ändern Sie Größe und Drehung. Mit der Tastatur: Pfeiltasten verschieben das ausgewählte Element (Umschalt: 10 mm), Entf löscht es, Strg+Z macht rückgängig, Strg+Umschalt+Z wiederholt.',
  layers: 'Ebenen',
  noLayers: 'Noch keine Elemente. Fügen Sie Text oder ein Bild hinzu.',
  imageLayer: 'Bild',
  shapeLayer: 'Form',
  emptyText: 'Leerer Text',
  properties: 'Eigenschaften',
  noSelection:
    'Wählen Sie ein Element auf dem Etikett oder in der Ebenenliste aus, um es zu bearbeiten.',
  fields: {
    text: 'Text',
    font: 'Schriftart',
    fontSize: 'Größe (pt)',
    color: 'Farbe',
    align: 'Ausrichtung',
    bold: 'Fett',
    italic: 'Kursiv',
    x: 'X (mm)',
    y: 'Y (mm)',
    width: 'Breite (mm)',
    height: 'Höhe (mm)',
    rotation: 'Drehung (°)',
  },
  align: { left: 'Links', center: 'Zentriert', right: 'Rechts' },
  order: {
    title: 'Ebenenreihenfolge',
    forward: 'Nach vorne',
    backward: 'Nach hinten',
    front: 'Ganz nach vorne',
    back: 'Ganz nach hinten',
  },
  labelSize: {
    title: 'Etikettengröße',
    preset: '{{width}} × {{height}} mm',
    custom: 'Eigene Größe',
    width: 'Etikettenbreite (mm)',
    height: 'Etikettenhöhe (mm)',
    range: 'Jede Seite zwischen {{min}} und {{max}} mm. Elemente behalten ihre Lage zur Mitte.',
  },
};

export const editorMessages = { en, de } as const;
