// Small number helpers shared by the editor and the print geometry.

/** Rounds to two decimals. Lengths are stored with 0.01 mm precision. */
export const round2 = (value: number): number => Math.round(value * 100) / 100;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Text for number fields: at most two decimals, no trailing zeros. */
export const formatNumber = (value: number): string => String(round2(value));
