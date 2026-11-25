// Settings the shop page gives the embedded app (Shopify integration, see README):
//   <div data-wine-label-designer data-language="de" data-bottle="riesling">
//     <script type="application/json">[ …bottles from the shop's metaobjects… ]</script>
//   </div>
// Everything is read from the page itself; nothing is fetched. The bottle data is typed in the
// shop admin, so every bottle is checked like a built-in one, and bad bottles are skipped.
import { z } from 'zod';
import { detectLanguage, type Language } from '../i18n';
import { bottleFromParams, bottleParamsSchema, type BottleShape } from '../templates/bottles';
import { BOTTLES } from '../templates/catalog';

/** More bottles than a shop plausibly offers; protects the gallery from runaway data. */
export const MAX_SHOP_BOTTLES = 50;
const MAX_NAME_LENGTH = 80;

export interface EmbedInput {
  /** data-language: the shop's language, for example "de" or "de-DE". */
  language: string | undefined;
  /** data-bottle: id (metaobject handle) of the product's bottle. */
  bottle: string | undefined;
  /** The text of the JSON script inside the element, or null if there is none. */
  bottlesJson: string | null;
}

export interface EmbedConfig {
  language: Language;
  /** The shop's bottles, or null to keep the built-in ones. */
  bottles: BottleShape[] | null;
  /** The bottle to start with, if the product names one that exists. */
  bottleId: string | null;
  /** Problems with the shop's data, for the console (the app still starts). */
  warnings: string[];
}

const shopEntrySchema = z.looseObject({ name: z.string().trim().min(1) });

function describe(issues: readonly { path: PropertyKey[]; message: string }[]): string {
  return issues
    .map((issue) => `${issue.path.map(String).join('.') || '-'}: ${issue.message}`)
    .join('; ');
}

function parseBottles(json: string | null, warnings: string[]): BottleShape[] | null {
  if (json === null || json.trim() === '') return null;
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    warnings.push('Shop bottles: the data is not valid JSON; using the built-in bottles.');
    return null;
  }
  if (!Array.isArray(data)) {
    warnings.push('Shop bottles: expected a list; using the built-in bottles.');
    return null;
  }
  if (data.length > MAX_SHOP_BOTTLES) {
    warnings.push(`Shop bottles: only the first ${String(MAX_SHOP_BOTTLES)} are used.`);
  }
  const bottles: BottleShape[] = [];
  data.slice(0, MAX_SHOP_BOTTLES).forEach((entry: unknown, index) => {
    const label = `Shop bottle ${String(index + 1)}${
      typeof entry === 'object' && entry !== null && 'id' in entry ? ` (${String(entry.id)})` : ''
    }`;
    const named = shopEntrySchema.safeParse(entry);
    if (!named.success) {
      warnings.push(`${label} skipped: ${describe(named.error.issues)}`);
      return;
    }
    const { name, ...params } = named.data;
    const parsed = bottleParamsSchema.safeParse(params);
    if (!parsed.success) {
      warnings.push(`${label} skipped: ${describe(parsed.error.issues)}`);
      return;
    }
    if (bottles.some((bottle) => bottle.id === parsed.data.id)) {
      warnings.push(`${label} skipped: the id "${parsed.data.id}" appears twice`);
      return;
    }
    bottles.push({ ...bottleFromParams(parsed.data), name: name.slice(0, MAX_NAME_LENGTH) });
  });
  if (bottles.length === 0) {
    warnings.push('Shop bottles: no valid bottle; using the built-in bottles.');
    return null;
  }
  return bottles;
}

/** Reads the shop's settings. Never throws: bad data falls back to the standalone defaults. */
export function parseEmbedConfig(input: EmbedInput, preferred: readonly string[]): EmbedConfig {
  const warnings: string[] = [];
  const bottles = parseBottles(input.bottlesJson, warnings);
  const offered = bottles ?? BOTTLES;
  let bottleId: string | null = null;
  if (input.bottle) {
    if (offered.some((bottle) => bottle.id === input.bottle)) bottleId = input.bottle;
    else warnings.push(`The product's bottle "${input.bottle}" is not in the shop's bottles.`);
  }
  const language = detectLanguage(input.language ? [input.language, ...preferred] : preferred);
  return { language, bottles, bottleId, warnings };
}
