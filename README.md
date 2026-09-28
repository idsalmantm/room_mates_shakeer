# Villa/Room Mates

**FindHub IT Solutions** — a mobile-friendly villa utility calculator. Plain HTML, CSS and JavaScript; no build, dependencies, accounts, analytics or backend.

Open `index.html` in a browser, or run `python3 -m http.server 8080` in this folder and visit http://localhost:8080.

## Rules

- Electricity rate = electricity charges / main consumption for the period.
- Family electricity = (sum of its AC meter differences + remaining main consumption / number of families) × rate.
- Water and optional sewage tanker charges are proportional to family population, including children.
- Gas can be split by population (default) or equally by family.
- Every category is allocated in whole fils using largest remainders, so family totals match the bill exactly. Ties use family order.
- A family can have several AC meters or no AC meters. Current readings must be at least previous readings; meter resets/replacements must be reconciled before entering them.

## Local storage (phone-friendly)

- The current draft saves on every edit in **localStorage**, so closing the browser on a phone and returning later restores your work.
- **Household profile** (villa name, gas split rule, family names, people counts, meter names, and last readings) is saved separately and restored for whoever uses this browser.
- **Start new month** / **Clear draft** clears dates and charges, keeps families, and rolls last meter readings into “previous”.
- Each successful calculation is archived in a history list (up to 36 bills) on the same device.
- **Forget families** removes only the household roster. **Delete** removes one saved bill; **Delete all history** / **Delete all local data** wipe stored bills (and household when clearing all).
- Nothing is uploaded to a server. Storage is per browser / device. If storage is unavailable or full, a status message appears.

Calculate, then select **Save as PDF / Print**, and choose your browser's **Save as PDF** destination. The report includes bill dates, charges, population, meter readings, formula explanation and each family's contribution. Mobile print/PDF options depend on the browser; use its share/print menu if needed.

## Free GitHub Pages hosting

1. Create a public GitHub repository named `room_mates_shakeer`.
2. Push this folder to the repository root (`index.html`, `styles.css`, `calculator.js`, `app.js`, `.nojekyll`).
3. In the repository, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, then `main` and `/ (root)`, and save.
4. After deployment, open `https://YOUR-USERNAME.github.io/room_mates_shakeer/`.

No private bill data is uploaded with the app. Calculations and local storage run in the visitor's browser.

## Checks

Run `node calculator.test.js` for calculation checks.
