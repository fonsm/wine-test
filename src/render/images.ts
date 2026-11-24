// Decoded images by data URL, shared by the editor and the label renderer, so undo/redo and
// re-renders do not decode again. Data URLs are decoded locally; nothing goes to a server.

const decoded = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<HTMLImageElement | null>>();

export function cachedImage(dataUrl: string): HTMLImageElement | null {
  return decoded.get(dataUrl) ?? null;
}

/** Decodes a data URL once. Resolves to null if the browser cannot decode it. */
export function loadImage(dataUrl: string): Promise<HTMLImageElement | null> {
  const ready = decoded.get(dataUrl);
  if (ready) return Promise.resolve(ready);
  let loading = pending.get(dataUrl);
  if (!loading) {
    loading = new Promise((resolve) => {
      const image = new window.Image();
      image.onload = () => {
        decoded.set(dataUrl, image);
        pending.delete(dataUrl);
        resolve(image);
      };
      image.onerror = () => {
        pending.delete(dataUrl);
        resolve(null);
      };
      image.src = dataUrl;
    });
    pending.set(dataUrl, loading);
  }
  return loading;
}
