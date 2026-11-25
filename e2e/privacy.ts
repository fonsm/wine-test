// Checks recorded network requests against AGENTS.md: no request to another origin, and no
// request that carries user data. Only the app's own static files may be loaded.

export interface RecordedRequest {
  url: string;
  method: string;
  postData: string | null;
  headers: Record<string, string>;
}

/** The only paths the app may request: the page and its built files. */
const STATIC_PATH = /^\/(index\.html)?$|^\/assets\/[\w.-]+$/;

/** Text the user entered or chose (design text, file names), as found in URLs and headers. */
function contains(haystack: string, needle: string): boolean {
  const lower = haystack.toLowerCase();
  return [needle, encodeURIComponent(needle), encodeURIComponent(needle).replace(/%20/g, '+')].some(
    (variant) => lower.includes(variant.toLowerCase()),
  );
}

/** Returns one message per problem; an empty list means the requests are fine. */
export function privacyProblems(
  requests: readonly RecordedRequest[],
  { origin, userData }: { origin: string; userData: readonly string[] },
): string[] {
  const problems: string[] = [];
  for (const request of requests) {
    const url = new URL(request.url);
    // In-memory URLs (images, downloads) never leave the browser.
    if (url.protocol === 'data:' || url.protocol === 'blob:') continue;
    const where = `${request.method} ${request.url}`;
    if (url.origin !== origin) problems.push(`request to another origin: ${where}`);
    if (request.method !== 'GET') problems.push(`sends data (${request.method}): ${where}`);
    if (request.postData) problems.push(`has a request body: ${where}`);
    if (url.search || url.hash) problems.push(`has a query string or fragment: ${where}`);
    if (url.origin === origin && !STATIC_PATH.test(url.pathname)) {
      problems.push(`not one of the app's static files: ${where}`);
    }
    const sent = [request.url, request.postData ?? '', ...Object.values(request.headers)].join(
      '\n',
    );
    for (const value of userData) {
      if (contains(sent, value)) problems.push(`carries user data "${value}": ${where}`);
    }
  }
  return problems;
}
