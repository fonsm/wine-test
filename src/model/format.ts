import type { TFunction } from 'i18next';
import type { DesignFileError } from './serialize';

/** Turns a design file error into its translated message text. */
export function formatDesignFileError(
  t: TFunction,
  error: DesignFileError,
  fileName: string,
): string {
  return t(`design:errors.${error.code}`, { ...error.params, path: error.path ?? '', fileName });
}
