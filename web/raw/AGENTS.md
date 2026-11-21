# AGENTS.md — Sketchpad

## What this is

A dependency-free drawing app: pen, eraser, infinite zoomable canvas, light/dark
theme. Ships as three static files. No build step, no package manager, no CDN,
no network at runtime.

Target host: the `web-view-apk-template` (`assets/` folder, `index.html` entry).
It must therefore work from `file://` on Android WebView — treat that as the
baseline, not a nice-to-have.

## Stack

- Plain HTML + CSS + JS (ES2020), one IIFE in `app.js`, `'use strict'`.
- Canvas 2D for both the visible board and the offscreen ink layer.
- `localStorage` only for the theme key.
- No frameworks, no bundler, no TypeScript, no npm dependencies. Don't add any
  without asking.

## Structure

```
index.html   markup, inline SVG sprite (<symbol> + <use>), theme bootstrap script
style.css    CSS variables per theme, floating toolbar, zoom HUD
app.js       canvas engine: transform, rendering, gestures, history, export
icons/       downloaded Lucide SVGs (source for the sprite; not loaded at runtime)
```

`index.html` must stay at the root of whatever folder it's dropped into.

## Core model (don't break this)

```
screen (css px) = world * zoom + view{x, y}
device px       = screen * dpr
```

- Stroke points are stored in **world units**. Never store screen pixels.
- `view.z` is clamped to `MIN_ZOOM..MAX_ZOOM` (0.08–12).
- Zoom is anchored at a screen point: `zoomAt(sx, sy, factor)` keeps that world
  point under the cursor.
- Strokes are `{ tool, color, size, points[], mid }`. Eraser strokes keep their
  own size (4× brush size) captured at stroke start.
- Two layers: `inkCanvas` holds committed strokes, the visible canvas draws
  paper + dot grid + `drawImage(inkCanvas)`. Erasing is
  `destination-out` **on the ink layer only**, so grid/paper never get erased.
- Live drawing appends only the new quadratic segment to the ink layer; a full
  `rebuildInk()` happens on pan, zoom, undo/redo, resize, theme fallback.
- History stores shallow copies of the `strokes` array (array of refs) — cheap,
  capped at `HISTORY_LIMIT`. Undo/redo never mutates stroke objects.
- `pendingBefore` holds the pre-stroke snapshot; commit happens on `endStroke`,
  so `abortStroke` (2nd finger lands) leaves history untouched.

## Rendering rules

- Every paint draws from scratch: fill paper, draw grid, blit ink, draw cursor.
  All state (transform, composite op, line style) is set per draw — the context
  is assumed dirty.
- Grid spacing is `GRID` world units, doubled/halved so on-screen spacing stays
  between ~26 and ~104 px.
- `dpr` is capped at 3 to bound memory on phones.

## Input

- Pointer Events only. Mouse, touch, stylus all go through the same path.
- 1 pointer draws (unless hand tool / `space` / middle / right button → pan).
  2 pointers → pinch zoom + pan. A second pointer cancels the in-flight stroke.
- `getCoalescedEvents()` is used for smooth high-rate input; points closer than
  `0.6 / zoom` world units are dropped.
- `touch-action: none` on the canvas and body; `contextmenu` prevented on canvas.

## Theming

- Source of truth is the `data-theme` attribute on `<html>`; CSS vars do the
  rest. Canvas colours live in `THEMES` in `app.js` (`paper`, `dot`, `ink`).
- OS preference is followed until the user toggles; the manual choice is stored
  in `sketchpad.theme`. The inline script in `<head>` applies it pre-paint.
- The default pen colour only follows the theme while `colorTouched === false`.

## Rules for agents

- **No Service Worker, no `manifest.json`, no caches.** They don't work from
  `file://`; the app must stay plain static files.
- **Icons must stay inlined in `index.html`.** CSS `mask-image: url(...)` and
  external `<use href="file.svg#id">` both fail cross-origin on `file://` and
  render nothing in a WebView (verified). If you add an icon: download the
  Lucide SVG into `icons/`, add a `<symbol id="i-name">` to the sprite, then
  `<svg class="ico"><use href="#i-name"></use></svg>`. Stroke comes from CSS
  (`currentColor`).
- Keep it minimal. No abstractions, no state library, no helper modules for
  single-use code.
- Don't touch files outside this folder (especially not the APK template).
- Anything user-visible should work on a 360 px wide phone (two-row toolbar
  media query at 560 px) and with a single finger.
- Export must stay canvas-generated (`toBlob` → `<a download>`); it needs no
  server and no native bridge.
- Don't add analytics, fonts, or remote assets of any kind.

## Known limits (on purpose)

- No persistence of drawings across reloads (only the theme is stored).
- No shapes/text/layers/import, no pressure-sensitivity tapering (stylus works
  but with constant width).
- PNG export renders the drawn bounds over the current theme's paper colour.
- In the APK, `<a download>` may be ignored by the WebView if the shell has no
  `DownloadListener` — that's a host issue, not an app bug.
