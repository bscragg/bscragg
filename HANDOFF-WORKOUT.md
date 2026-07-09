# Session on-ramp — Gym Workout Tracker

Quick-start context so a new session (desktop or web) can resume immediately.
Companion to `HANDOFF.md`, which covers the *other* project in this repo (EldenAR).

## What this is

A mobile-first workout tracker for the two-month integrated training plan
(elbow rehab · RP lifting · chest · mobility). Built for use *at the gym*:
pick a routine, swipe through numbered exercise cards, each with a how-to
description, a hold/rest countdown timer, and rep/weight logging. History
persists in localStorage and drives per-exercise "last session" summaries and
RP progression hints.

- **Branch:** `claude/gym-workout-tracker-ardhwm` (develop + push here; do NOT
  push elsewhere; do NOT open a PR unless asked).
- **App:** `public/workout/index.html` — a single self-contained file. No
  build step, no dependencies, no framework. Vanilla HTML/CSS/JS, works from
  `file://` or any static host.
- **Source plan:** `public/workout/plan.md` (the two-month training plan the
  routines were transcribed from — treat it as the spec).
- **Deploy caveat:** `.github/workflows/deploy.yml` only deploys GitHub Pages
  from branch `claude/coding-session-werkha`. `public/` is copied verbatim into
  `dist/` by the Vite build, so the tracker ships at `/workout/` — but only
  once this branch is merged there (or the workflow's branch list is updated).

## Commands

```bash
npm run dev                          # Vite dev server → open /workout/index.html
python3 -m http.server -d public     # or: serve the app alone, zero deps
```

There are no tests for the tracker (the repo's vitest suite is EldenAR-only).
Verification is done by driving the app in a browser — see
`.claude/skills/verify/SKILL.md` for the working Playwright recipe.

## Architecture (all inside `public/workout/index.html`)

One file, four sections, in order:

1. **CSS** — dark theme, CSS vars in `:root`, mobile-first, max-width 560px.
2. **`ROUTINES` data** — the whole training plan as a JS array. Each routine:
   `{ id, name, tag, group, note, exercises[] }`. Each exercise:
   `{ id, name, phase, target, desc, timer?, rest?, log, warmup?, flag? }`.
   - `log: "reps"` → reps + optional lb inputs; `log: "time"` → seconds input.
   - `timer` = hold/work countdown preset (sec); `rest` = rest preset (sec).
   - `flag` = elbow-risk warning shown on the card (grip-heavy movements).
   - **Exercise `id`s are the history keys — renaming one orphans its logged
     data.** Keep them stable; if a rename is needed, migrate the log entries.
3. **Storage** — localStorage key `gymlog-v1`, a flat array of set entries:
   `{ t: epoch-ms, r: routineId, e: exerciseId, reps?, lb?, secs? }`.
   `t` doubles as the delete handle and the import-dedupe key (`t|e`).
   Export/import = JSON download / merge-append with dedupe.
4. **UI logic** — three screens toggled by class (`#scr-home`, `#scr-session`,
   `#scr-history`):
   - *Home*: `WEEKDAY_PLAN[getDay()]` banner + routines grouped by `group`,
     with a ✅-today count per routine.
   - *Session*: card carousel — a flex `#track` translated by `-cur*100%`;
     touch swipe via raw touchstart/move/end on `#viewport` (60px threshold,
     ignores touches starting on inputs/buttons). Single global timer object
     (starting a timer on one card stops another card's); `endAt`-based
     countdown (drift-free), beep via WebAudio + `navigator.vibrate` at zero.
     Logging a lift set auto-starts its rest timer. Screen wake lock is
     requested per session (best-effort, re-acquired on visibilitychange).
     "Last session" = most recent *previous day's* entries for the exercise;
     progression hint applies the RP rule (any set ≥30 → ▲ go up; best <5 →
     ▼ go down) to Lift/warm-up exercises.
   - *History*: 7-day summary + per-exercise `<details>` blocks grouped by
     day, most recently trained first.

## Decisions already locked

Single-file zero-dependency app (deliberately NOT part of the Vite/React
build — don't merge it into `src/`) · lives in `public/` so it deploys with
the existing Pages build · localStorage-only persistence with JSON
export/import as the backup story · plan.md is the routine spec · weight
input carries over between sets on a card (deliberate — you rarely change
dumbbells mid-exercise).

## Status

✅ Done and verified end-to-end (Playwright, iPhone viewport): home hints,
carousel swipe + dots + prev/next, timers (start/pause/resume/reset,
auto-rest after logging), rep/hold logging with per-set delete, history,
export/import, progression hints, empty-input no-op, reload persistence.

## Queued ideas (none started)

- **Per-exercise progress chart** in History (reps×weight over time) — most
  requested next step once a few weeks of data exist.
- PWA manifest + service worker so it installs to the home screen and works
  fully offline at the gym.
- A Month 1 / Month 2 toggle that hides not-yet-active routines.
- Rest-timer notification when the tab is backgrounded (Notification API).
- Merge/update the Pages workflow so this branch's tracker actually deploys.

## Resuming next time — suggested first message

> "Resume the gym workout tracker in bscragg/bscragg on branch
> `claude/gym-workout-tracker-ardhwm`. Read `HANDOFF-WORKOUT.md` first — the
> app is the single file `public/workout/index.html` and `public/workout/plan.md`
> is the training-plan spec. Verify it still works using the recipe in
> `.claude/skills/verify/SKILL.md`, then pick up the queued ideas in the
> handoff (progress charts / PWA-offline / deploy) or whatever I ask for."
