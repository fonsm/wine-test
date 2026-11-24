import type { TFunction } from 'i18next';
import type { UploadIssue } from './types';
import { UPLOAD_WARNING_CODES } from './types';

const WARNING_CODES: ReadonlySet<string> = new Set(UPLOAD_WARNING_CODES);

/** Turns an upload error or warning into its translated message text. */
export function formatIssue(t: TFunction, issue: UploadIssue, fileName: string): string {
  const group = WARNING_CODES.has(issue.code) ? 'warnings' : 'errors';
  return t(`upload:${group}.${issue.code}`, { ...issue.params, fileName });
}
