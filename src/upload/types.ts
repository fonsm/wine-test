export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];

/** Formats the cleaned image is stored in. pdf-lib can embed only PNG and JPEG. */
export type OutputImageType = 'image/png' | 'image/jpeg';

export const UPLOAD_ERROR_CODES = [
  'FILE_TOO_LARGE',
  'UNSUPPORTED_TYPE',
  'TYPE_MISMATCH',
  'CORRUPT_IMAGE',
  'DIMENSIONS_TOO_LARGE',
] as const;
export type UploadErrorCode = (typeof UPLOAD_ERROR_CODES)[number];

export const UPLOAD_WARNING_CODES = ['TOO_SMALL'] as const;
export type UploadWarningCode = (typeof UPLOAD_WARNING_CODES)[number];

/** Numbers that are inserted into the message text (limits, sizes). */
export type IssueParams = Readonly<Record<string, number>>;

export interface UploadError {
  code: UploadErrorCode;
  params: IssueParams;
}

export interface UploadWarning {
  code: UploadWarningCode;
  params: IssueParams;
}

export type UploadIssue = UploadError | UploadWarning;

export interface CleanImage {
  /** Re-encoded image without EXIF, GPS or other metadata. */
  blob: Blob;
  type: OutputImageType;
  width: number;
  height: number;
}

export type UploadResult =
  { ok: true; image: CleanImage; warnings: UploadWarning[] } | { ok: false; error: UploadError };
