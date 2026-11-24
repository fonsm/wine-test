import { serializeDesign } from './serialize';
import type { Design } from './schema';

export const DESIGN_FILE_NAME = 'wine-label-design.json';

/** Saves the design as a .json file through the browser's download. Nothing is uploaded. */
export function downloadDesign(design: Design, fileName: string = DESIGN_FILE_NAME): void {
  const blob = new Blob([serializeDesign(design)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Give the browser time to start the download before the URL is released.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
