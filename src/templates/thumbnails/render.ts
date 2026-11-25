// Renders every template with the label renderer, for scripts/render-thumbnails.mjs.
// The result is put on window.thumbnails; the script saves it as thumbnails/*.png.
import '../../fonts/fonts.css';
import { LabelRenderer, prepareDesign } from '../../render/renderLabel';
import { TEMPLATES } from '../catalog';
import { THUMBNAIL_PX, templateChecksum } from '../thumbnails';

interface Rendered {
  id: string;
  png: string;
  checksum: string;
}

async function renderAll(): Promise<Rendered[]> {
  const renderer = new LabelRenderer();
  const rendered: Rendered[] = [];
  try {
    for (const template of TEMPLATES) {
      await prepareDesign(template.design);
      rendered.push({
        id: template.id,
        png: renderer.draw(template.design, THUMBNAIL_PX).toDataURL('image/png'),
        checksum: await templateChecksum(template.design),
      });
    }
  } finally {
    renderer.dispose();
  }
  return rendered;
}

(window as unknown as { thumbnails: Promise<Rendered[]> }).thumbnails = renderAll();
