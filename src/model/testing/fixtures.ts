import { jpegHeader } from '../../upload/testing/fixtures';
import type { Design } from '../schema';
import { createEmptyDesign } from '../schema';

/** A real 1 × 1 px PNG. */
export const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

/** JPEG header bytes (enough for type sniffing). */
export const JPEG_DATA_URL = `data:image/jpeg;base64,${btoa(String.fromCharCode(...jpegHeader(4, 4)))}`;

export const SVG_DATA_URL = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg"/>')}`;

/** A design that uses every element type, an embedded image twice and HTML-like text. */
export function sampleDesign(): Design {
  return {
    ...createEmptyDesign(),
    assets: {
      'img-1': { dataUrl: PNG_DATA_URL },
      'img-2': { dataUrl: JPEG_DATA_URL },
    },
    elements: [
      {
        id: 'bg',
        type: 'image',
        x: -3,
        y: -3,
        width: 96,
        height: 126,
        rotation: 0,
        opacity: 1,
        assetId: 'img-1',
        style: { fit: 'cover' },
      },
      {
        id: 'frame',
        type: 'shape',
        x: 5,
        y: 5,
        width: 80,
        height: 110,
        rotation: 0,
        opacity: 0.8,
        shape: 'rect',
        style: { fill: null, stroke: '#7b1e3a', strokeWidthMm: 0.5, cornerRadiusMm: 2 },
      },
      {
        id: 'title',
        type: 'text',
        x: 10.25,
        y: 30,
        width: 70,
        height: 15.5,
        rotation: 12.5,
        opacity: 1,
        text: 'Château <b>Müller</b> & Söhne\n2024 <script>alert(1)</script>',
        style: {
          fontFamily: 'serif',
          fontSizePt: 18,
          fontWeight: 'bold',
          fontStyle: 'italic',
          color: '#1a1a1aff',
          align: 'center',
          lineHeight: 1.2,
        },
      },
      {
        id: 'logo',
        type: 'image',
        x: 35,
        y: 90,
        width: 20,
        height: 20,
        rotation: 359.5,
        opacity: 1,
        assetId: 'img-1',
        style: { fit: 'contain' },
      },
    ],
  };
}
