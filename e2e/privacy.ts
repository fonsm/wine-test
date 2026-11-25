// Checks recorded network requests against AGENTS.md: only the app's own static files may be
// loaded, from the allowed sources (the app's origin; embedded in a shop also the shop page and
// the CDN with the app's files), and no request may carry user data.

export interface RecordedRequest {
  url: string;
  method: string;
  postData: string | null;
  headers: Record<string, string>;
}

/** An origin the browser may load from, and the only paths it may request there. */
export interface AllowedSource {
  origin: string;
  paths: RegExp;
}

/** The standalone app: its page and its built files, from its own origin only. */
export function appSources(origin: string): AllowedSource[] {
  return [{ origin, paths: /^\/(index\.html)?$|^\/assets\/[\w.-]+$/ }];
}

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
  { sources, userData }: { sources: readonly AllowedSource[]; userData: readonly string[] },
): string[] {
  const problems: string[] = [];
  for (const request of requests) {
    const url = new URL(request.url);
    // In-memory URLs (images, downloads) never leave the browser.
    if (url.protocol === 'data:' || url.protocol === 'blob:') continue;
    const where = `${request.method} ${request.url}`;
    const rules = sources.filter((candidate) => candidate.origin === url.origin);
    if (rules.length === 0) problems.push(`request to another origin: ${where}`);
    if (request.method !== 'GET') problems.push(`sends data (${request.method}): ${where}`);
    if (request.postData) problems.push(`has a request body: ${where}`);
    if (url.search || url.hash) problems.push(`has a query string or fragment: ${where}`);
    if (rules.length > 0 && !rules.some((rule) => rule.paths.test(url.pathname))) {
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
