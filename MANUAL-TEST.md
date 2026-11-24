# Manual tests

The automated tests (see the checklist in README.md) cover the app in Chromium, including the PDF sizes to 0.01 mm, privacy, accessibility rules and a 320 px phone. Some things only real hardware can show. This document covers them:

- **Part A: printing at true size**, on **3 different printers** (sections 1–6)
- **Part B: the label on a real bottle**, compared with the 3D preview (section 7)
- **Part C: devices and browsers**: iOS Safari, Android Chrome and a desktop browser (section 8)
- **Part D: screen reader spot check** (section 9)

Write the results in the tables at the end. A release needs every row passed, or a written finding.

# Part A: printing at true size

Automated tests check that the PDF itself has the right sizes. They cannot check what a printer does with it. Do sections 1–6 on **at least 3 printers of different kinds**, for example a home inkjet, an office laser printer and a multifunction device or print-shop machine. Use at least two different computers or programs to print.

## You need

- The app running: `npm run dev` and open the address it shows, or the deployed site.
- A **steel ruler** or caliper with millimetre marks. Plastic and wooden rulers can be off by up to 1 mm over 15 cm.
- Plain A4 paper (and US Letter, if you test a Letter printer).
- For step 4: scissors or a craft knife.

**Tolerance:** a result is good if it is within **±0.5 mm on the 50 mm square** and **±1 mm on the 150 mm ruler** (about 1 %). Typical "Fit to page" scaling makes things 3–6 % too small: the ruler then measures about 141–146 mm.

## 1. Print the calibration page

1. In the app, open **Print PDF** (German: **Druck-PDF**) in the side panel.
2. Check that the instruction **"Print at 100%, no scaling."** is shown above the download buttons.
3. Click **Download calibration page**. The file is `wine-label-calibration-page.pdf`.
4. Open the PDF and print it with **100 % / Actual size**, and with **Fit to page / Shrink to fit turned off**:

   | Program                                     | Where to set it                                                                                     |
   | ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
   | Chrome / Edge (built-in PDF viewer)         | Print dialog → **More settings** → **Scale**: _Custom_ **100**. Do not use _Fit to printable area_. |
   | Firefox                                     | Print dialog → **Scale** → **100**. Do not tick _Fit to page width_.                                |
   | Safari / macOS Preview                      | Print dialog → **Scale: 100 %**. Untick **Scale to fit**.                                           |
   | Adobe Acrobat Reader                        | **Page Sizing & Handling** → **Actual size**.                                                       |
   | Windows "Photos" / "Print pictures" dialogs | Do not use them: they always fit to page. Open the PDF in a browser or in Acrobat Reader instead.   |

   Also check the **printer's own settings** (Preferences / Properties) for "Fit to page", "Borderless", "Zoom" or "Scaling", and turn them off. Borderless printing enlarges the page slightly.

5. Measure on paper:
   - The grey **square**: width **and** height (some printers scale the two directions differently). Measure to the middle of the black outline.
   - The **ruler**: the distance from the **0** tick to the **15** tick.
6. Write the results in the table. If a size is outside the tolerance, look for a scaling setting you missed and print again. If it still fails, write down the printer model and the measured sizes: that is a finding.

## 2. Make sure scaling is visible (negative test)

On one printer, print the calibration page once **with "Fit to page" turned on**. The ruler should now measure clearly less than 150 mm. This shows that the page detects wrong settings. Note the measured length.

## 3. Check the language

1. Switch the app to **DE** and download the calibration page again.
2. The title should read **Kalibrierseite** and the instructions should be German, with correct umlauts (ä, ö, ü, ß) and quotes („ “). You do not need to print it again; viewing the PDF is enough.

## 4. Print a label for your own printer

1. Make a simple label: add a text, upload a photo, and keep the label size at **90 × 120 mm**.
2. In **Print PDF**, choose **For my printer: label on A4 with crop marks**, leave **Add 3 mm bleed** on, and click **Download PDF** (`wine-label.pdf`).
3. Print it the same way as the calibration page (100 %, no scaling).
4. Check on paper:
   - The **crop marks** (short lines at the four corners, outside the label): the distance between the left and right marks must be **90 mm**, and between the top and bottom marks **120 mm** (±0.5 mm). Measure along the mark lines.
   - Elements that reach the edge of the label (for example a background photo) continue about **3 mm beyond** the crop-mark lines (the bleed).
   - Text is sharp, without visible pixels, also at small sizes. Photos look as sharp as on screen.
5. Cut along the crop-mark lines. The label should be 90 × 120 mm, with no white edge where a background reaches the border.
6. Optional: repeat with **Add 3 mm bleed** turned off. The crop marks are still 90 × 120 mm apart; the design now stops exactly at the trim.
7. Optional: set a custom label size wider than 190 mm (for example 250 × 150 mm). The PDF should be A4 **landscape**. Print it in landscape and measure the crop marks again.

## 5. Check the print-shop PDF (no printing needed)

1. Choose **For a print shop: page is the label size** and download the PDF.
2. Open it in Adobe Acrobat Reader → **File → Properties → Description → Page size**. With bleed it should be **96 × 126 mm** (3.78 × 4.96 in), without bleed **90 × 120 mm**.
3. In Chrome's PDF viewer, zoom in on text: it is a sharp picture (it cannot be selected; that is expected).

## 6. Low-resolution warning

1. Upload a small photo (for example 300 × 200 pixels) and make it large on the label.
2. Download the PDF. Below the buttons, the app should say that **1 image has less than 300 dpi** and may look blurry. Print it and compare: the warning should match what you see.

# Part B: the label on a real bottle

## 7. Compare a printed label with the 3D preview

You need a real **750 ml Bordeaux bottle** (straight sides, high shoulders) and, if available, a Burgundy, a Schlegel (Riesling) and a sparkling wine bottle. Clean, dry glass; a little tape.

1. In the app, pick the **Classic** template and the **Bordeaux** bottle. Keep the label at **90 × 120 mm**.
2. Print the label for your own printer (section 4: 100 %, bleed on) and cut it out along the crop marks.
3. Stick it on the bottle, centred on the front, with its lower edge **about 44 mm above the base**. That is where the preview places a 120 mm label: centred on the straight part of the body, 12–196 mm above the base.
4. Turn the 3D preview to the front (drag sideways) and compare with the real bottle from the same angle, at arm's length:
   - The label covers about the same part of the bottle's width: on a 76 mm Bordeaux, a 90 mm label wraps around a bit more than a third of the circumference (about 135°).
   - The curve looks the same: the left and right edges of the label are squeezed in the same way on screen and on the glass.
   - The height on the bottle matches: the same gap to the base and to the shoulder.
   - Texts that are readable on the real bottle at arm's length are also clear in the preview (on a phone, zoom the page if needed).
5. Turn the bottle (real and preview) by about 45° to each side. The label edge should disappear at about the same angle.
6. Take a photo of the real bottle and a screenshot of the preview from the front, and attach both to the results.
7. Repeat steps 1–6 for every other bottle type you have, choosing that bottle in the app.

Findings to note: a label that is clearly higher or lower, wider or narrower, or more or less curved than in the preview; colours that look very different (the preview uses screen RGB, the print uses the printer's inks, so some difference is expected).

# Part C: devices and browsers

## 8. Full flow on iOS Safari, Android Chrome and a desktop browser

Test on these three, at least:

- **iOS Safari**: an iPhone with a current iOS (Safari 16.4 or later is required).
- **Android Chrome**: a mid-range Android phone (not the newest flagship), current Chrome.
- **Desktop browser**: one of Chrome, Edge, Firefox or Safari on Windows or macOS. Better: one Chromium browser (covered by the automated tests) and Firefox or Safari (not covered).

On each device, open the deployed site (or the dev server on your network: `npm run dev -- --host`, then the shown network address) and check:

| #   | Step                                                                                                           | Expected                                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Open the site with the device language set to German, then to English (or a private window each time)          | The interface starts in the device language; the browser tab title matches (Weinetiketten-Designer / Wine Label Designer).                          |
| 2   | First load on mobile data, not Wi-Fi                                                                           | The editor is usable within a few seconds; the bottle preview follows.                                                                              |
| 3   | Switch DE ↔ EN                                                                                                 | All texts change; the design stays. After a reload the chosen language stays.                                                                       |
| 4   | Pick the **Modern** template, then **Undo**                                                                    | The label changes; Undo brings the previous label back.                                                                                             |
| 5   | On a phone: drag, resize (corner handle) and rotate (round handle) an element with one finger                  | Works smoothly; the page does not scroll while dragging an element; scrolling and pinch-zoom still work on empty areas.                             |
| 6   | Select a text and change it in **Properties**                                                                  | The label and the 3D bottle show the new text within about a second.                                                                                |
| 7   | Pick each bottle                                                                                               | The 3D preview shows that bottle. Drag sideways on it: it turns; a vertical swipe on a phone scrolls the page.                                      |
| 8   | Upload a photo from the photo library. **On iPhone, use a photo taken with the camera** (often HEIC)           | Accepted (the browser converts HEIC to JPEG) or refused with a clear message. Note which. A photo taken in portrait orientation appears upright.    |
| 9   | Upload a screenshot (PNG) and, if you have one, a WebP image                                                   | Accepted.                                                                                                                                           |
| 10  | **Download PDF** (own printer layout) and **Download calibration page**                                        | Both files download and open in the device's PDF viewer. On iOS, "Share → Save to Files" works.                                                     |
| 11  | Print the calibration page from the device (AirPrint / Android print service) at 100 %                         | Measure as in section 1; note the result. Phones often scale to fit by default: note how to turn it off on that device.                             |
| 12  | **Save design**, reload the page, **Open design** with the saved file                                          | The design comes back completely, including photos.                                                                                                 |
| 13  | Rotate the phone to landscape and back                                                                         | The layout adapts; nothing is cut off and the page does not scroll sideways.                                                                        |
| 14  | Turn on airplane mode after the page has loaded, then download a PDF                                           | Note what happens. Expected today: if the PDF code was not loaded yet, the app shows "The PDF could not be created" (see Open issues in README.md). |
| 15  | Desktop only: use the whole app with the keyboard only (Tab, Shift+Tab, Enter, Space, arrow keys on the label) | Every control is reachable with a visible focus ring; elements can be moved with the arrow keys.                                                    |
| 16  | If the 3D preview shows a flat bottle with a message                                                           | Note the device and the message (WebGL off or too slow). The flat preview must still update with edits.                                             |

# Part D: screen reader

## 9. Spot check with VoiceOver (iOS or macOS) or NVDA (Windows)

1. Go through the page with the screen reader's next-element command. Every button, field and list has a sensible name in the current language; the label canvas is announced as "Label" / "Etikett" with its help text.
2. Pick a template and a bottle: the selected ones are announced as selected (pressed).
3. Select a text in the layer list, change it in Properties, and listen to the field names.
4. Upload an invalid file (for example a PDF renamed to `.jpg`): the error message is read out.
5. Download a PDF: the status "The PDF was created." is read out.

# Results

## Printers (Part A): at least 3 rows

| Date | Printer (model, kind) | Paper | Computer + OS | Program used to print | Settings (scale, fit, borderless) | Square W × H (mm) | Ruler 0–15 (mm) | Label crop marks W × H (mm) | Pass? | Notes |
| ---- | --------------------- | ----- | ------------- | --------------------- | --------------------------------- | ----------------- | --------------- | --------------------------- | ----- | ----- |
|      | Printer 1:            | A4    |               |                       | 100 %, fit off                    |                   |                 |                             |       |       |
|      | Printer 2:            | A4    |               |                       | 100 %, fit off                    |                   |                 |                             |       |       |
|      | Printer 3:            | A4    |               |                       | 100 %, fit off                    |                   |                 |                             |       |       |

## Real bottles (Part B)

| Date | Bottle (type, height × diameter) | App bottle | Label position matches? | Width and curve match? | Photo + screenshot attached? | Pass? | Notes |
| ---- | -------------------------------- | ---------- | ----------------------- | ---------------------- | ---------------------------- | ----- | ----- |
|      |                                  | Bordeaux   |                         |                        |                              |       |       |

## Devices (Part C): one row per device, steps 1–16

| Date | Device + OS version | Browser + version | Steps passed | Steps failed (number + what happened) | Notes |
| ---- | ------------------- | ----------------- | ------------ | ------------------------------------- | ----- |
|      | iPhone:             | Safari            |              |                                       |       |
|      | Android phone:      | Chrome            |              |                                       |       |
|      | Desktop:            |                   |              |                                       |       |

## Screen reader (Part D)

| Date | Screen reader + OS | Browser | Pass? | Notes |
| ---- | ------------------ | ------- | ----- | ----- |
|      |                    |         |       |       |

Report every failed row with a photo or screenshot if possible, so the app, the PDF or these instructions can be improved.
