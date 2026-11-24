# Manual test: printing at true size

Automated tests check that the PDF itself has the right sizes (within 0.01 mm). They cannot check what a real printer does with it. These steps do. Repeat them on every printer you want to support, and write the results in the table at the end.

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

## Results

Copy one row per printer and setting.

| Date | Printer (model) | Paper | Computer + OS | Program used to print | Settings (scale, fit, borderless) | Square W × H (mm) | Ruler 0–15 (mm) | Label crop marks W × H (mm) | Pass? | Notes |
| ---- | --------------- | ----- | ------------- | --------------------- | --------------------------------- | ----------------- | --------------- | --------------------------- | ----- | ----- |
|      |                 | A4    |               |                       | 100 %, fit off                    |                   |                 |                             |       |       |

Report any failed row (with a photo of the measured printout, if possible), so the instructions or the PDF can be improved.
