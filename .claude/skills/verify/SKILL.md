---
name: verify
description: How to build, launch, and drive this repo's apps to verify changes at their real surface (browser GUI).
---

# Verifying changes in this repo

Two apps live here; both are browser GUIs, so verification = drive them in a
browser and capture screenshots/output, not tests.

## Workout tracker (`public/workout/index.html`)

Zero-dependency single file. Serve and drive:

```bash
python3 -m http.server 8377 -d public &   # app at http://localhost:8377/workout/index.html
```

Playwright works well headless. `playwright` is NOT a repo dependency —
install it in a scratch dir (`npm init -y && npm install playwright`), never
in the repo. In the remote container the browser is pre-installed but the
executable is NOT at the path Playwright guesses; launch with an explicit
path (adjust the version suffix to what's in `/opt/pw-browsers/`):

```js
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
});
```

Flows worth driving: open a routine → Next/swipe between cards → fill
`#reps-N`/`#lb-N` → Log set (rest timer should auto-start) → check
`#today-N` and `localStorage.gymlog-v1` → History screen → reload persists.

Gotchas:
- Playwright's `touchscreen` API can't do a drag; dispatch raw
  `TouchEvent`s on `#viewport` via `page.evaluate` to test swiping.
- To test the "Last session" / progression-hint logic, inject a backdated
  entry into `localStorage.gymlog-v1` (`t: Date.now() - 86400000`) and reload.
- Collect `pageerror` / console errors — the app has no build step, so a
  typo only surfaces at runtime.

## EldenAR (Vite/React SPA at repo root)

```bash
npm install && npm run dev    # or npm run build && serve dist/
```

Drive it in the same Playwright setup (desktop viewport). The vitest suite
(`npm test`) is CI's job, not verification.
