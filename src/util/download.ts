/** Saves data as a file through the browser's download. Nothing is uploaded. */
export function saveFile(blob: Blob, fileName: string): void {
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
