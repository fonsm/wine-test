import { saveFile } from '../util/download';
import { serializeDesign } from './serialize';
import type { Design } from './schema';

export const DESIGN_FILE_NAME = 'wine-label-design.json';

/** Saves the design as a .json file through the browser's download. Nothing is uploaded. */
export function downloadDesign(design: Design, fileName: string = DESIGN_FILE_NAME): void {
  saveFile(new Blob([serializeDesign(design)], { type: 'application/json' }), fileName);
}
