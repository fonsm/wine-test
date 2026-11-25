# Privacy notes

What the Wine Label Designer does with data, for the project owner, for whoever hosts the app, and as a basis for a privacy notice. These are technical facts about the app, not legal advice.

## Summary

- The app runs **entirely in the browser**. There is no backend, no database and no user account.
- **Nothing the user enters or uploads leaves the device.** Photos, texts, designs and PDFs are processed in the browser's memory. Downloads are saved on the device.
- The browser loads **only the app's own static files** (HTML, JavaScript, CSS, fonts, small images) from the same server. There are no requests to other servers: no CDN, no Google Fonts, no analytics, no error reporting.
- **No cookies.** The only thing ever stored is the UI language (`de` or `en`) in `localStorage`, and only after the user uses the language switch.

An automated test checks this on every change: `e2e/privacy.spec.ts`. It runs the full flow and fails on any request to another origin, any request that sends data (method other than GET, a request body, or a query string), and any request whose URL or headers contain the user's text or file names. It also checks for cookies, WebSockets, service workers, IndexedDB, and anything in `localStorage` or `sessionStorage` other than the language.

## Data the app processes

| Data                                                                 | Where it comes from           | What the app does with it                                                                                                                                                                | Where it is kept                                                           | How long                                                       | Leaves the device?                                                              |
| -------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Photos and images** (PNG, JPEG, WebP)                              | The user picks a file         | Checks the file type by its content, decodes it, and re-encodes it on a canvas. This **removes EXIF data, including GPS location, camera and date**. The file name is shown in messages. | Browser memory, as part of the design                                      | Until the tab is closed, reloaded, or the image is deleted     | No                                                                              |
| **Label texts**                                                      | Typed by the user             | Shown on the label, in the 3D preview and in the PDF                                                                                                                                     | Browser memory                                                             | Until the tab is closed or reloaded                            | No                                                                              |
| **The design** (layout, texts, images, label size, template, bottle) | Made in the editor            | Edited, with undo history                                                                                                                                                                | Browser memory                                                             | Until the tab is closed or reloaded (there is **no autosave**) | No                                                                              |
| **Design files** (`.json`)                                           | "Save design" / "Open design" | Saving creates a file download; opening reads a file the user picks and checks it                                                                                                        | On the device, where the user saves it                                     | As long as the user keeps the file                             | No (it may contain the user's photos and texts; the user decides where it goes) |
| **PDF files** (label, calibration page)                              | "Download PDF"                | Created in the browser with pdf-lib. Metadata contains only a title and the app name: no author, no user name.                                                                           | On the device                                                              | As long as the user keeps the file                             | No                                                                              |
| **UI language** (`de` or `en`)                                       | The language switch           | Shows the interface in that language. Stored only after the user uses the switch.                                                                                                        | `localStorage`, key `wine-label.language`, on this device and browser only | Until the user clears site data                                | No                                                                              |
| **Browser language list** (`navigator.languages`)                    | The browser                   | Picks German or English on the first visit                                                                                                                                               | Not stored                                                                 | —                                                              | No                                                                              |
| **Browser capabilities** (WebGL, rendering speed)                    | The browser                   | Decides between the 3D and the flat preview                                                                                                                                              | Not stored                                                                 | —                                                              | No                                                                              |

## What the app does not use

- Cookies, `sessionStorage`, IndexedDB, Cache Storage, service workers
- Analytics, tracking, telemetry, error reporting, A/B testing
- Third-party fonts, scripts, styles, images or embeds (everything is self-hosted)
- Camera, microphone, location, clipboard or notification permissions
- `fetch`/XHR calls to any API, `sendBeacon`, WebSockets

## Network requests

The browser requests only these files from the server that hosts the app, always with `GET` and without any user data:

- `/` (`index.html`)
- `/assets/index-*.js` and `/assets/index-*.css` (the app)
- `/assets/BottlePreview-*.js` and `/assets/renderLabel-*.js` (3D preview, loaded right after the editor appears)
- `/assets/exportPdf-*.js` (PDF export, loaded on the first download)
- `/assets/*.ttf` (each font only when a label uses it)
- `/assets/*.png` (template thumbnails)

Images the user adds and files the user downloads use `data:` and `blob:` URLs. They exist only in the browser's memory and are never sent anywhere.

## Embedded in a shop (Shopify)

When the app is embedded in a shop page (see README, "Embedding in a shop page"), the same guarantees hold, with one difference decided by the project owner (AGENTS.md): the app's own files may come from the **shop's domain** and from **Shopify's CDN**, which hosts the files of the app's theme extension. Still only `GET` requests for the app's files, and never any user data. `e2e/embed.spec.ts` checks this with a fake shop and CDN.

- The app reads its settings (language, bottles, the product's bottle) from the page itself. It sends nothing back.
- It does not change the shop page's title or language, and it **stores nothing**, not even the language (it follows the shop's language).
- **The shop is a separate data controller for its own page.** Shopify and the theme can set cookies, run analytics and log visits on the product page. That is outside the app and must be covered by the shop's own privacy notice. The app's statements here cover only what the app does.
- **Orders are not part of the app yet.** If designs or PDFs are ever sent to the shop (for example to order printed labels), that is a new data flow and needs a decision and new privacy notes first.

## Hosting

The app is static files only, so it can run on any web server or static host. **The host itself can see what any web server sees**: the visitor's IP address, the time, the requested file names and the browser's User-Agent, usually in access logs. The app cannot control this. Whoever operates the site should:

- choose a host and log retention that fits their privacy notice,
- not add analytics, tag managers, CDNs for fonts or other third-party scripts to `index.html`. That would break the guarantees above, and the privacy test would fail.

## For a privacy notice

Points the operator can rely on when writing the site's privacy notice (to be reviewed by whoever is responsible for data protection):

- No personal data is collected, transmitted to the operator or shared with third parties by the app.
- Photos are processed locally, and their metadata (including location) is removed.
- One functional setting (the UI language) is stored in the browser's local storage, on the user's request, and never transmitted.
- Server access logs, if any, are kept by the host.
