// The built-in templates and bottles for the Playwright tests. The app finds its data files with
// Vite's import.meta.glob, which only works inside Vite, so the tests import the files directly.
// Unit tests (src/templates) check that every file is valid; these lists must name each file.
import bordeaux from '../src/templates/data/bottles/bordeaux-750.json' with { type: 'json' };
import burgundy from '../src/templates/data/bottles/burgundy-750.json' with { type: 'json' };
import schlegel from '../src/templates/data/bottles/schlegel-750.json' with { type: 'json' };
import sparkling from '../src/templates/data/bottles/sparkling-750.json' with { type: 'json' };
import blank from '../src/templates/data/templates/blank.json' with { type: 'json' };
import classic from '../src/templates/data/templates/classic.json' with { type: 'json' };
import elegant from '../src/templates/data/templates/elegant.json' with { type: 'json' };
import modern from '../src/templates/data/templates/modern.json' with { type: 'json' };

export const TEMPLATES = [blank, classic, elegant, modern].map((design) => ({
  id: design.templateId,
  elementCount: design.elements.length,
}));

export const BOTTLE_IDS = [bordeaux, burgundy, schlegel, sparkling].map((bottle) => bottle.id);

export function template(id: string) {
  const found = TEMPLATES.find((each) => each.id === id);
  if (!found) throw new Error(`unknown template ${id}`);
  return found;
}
