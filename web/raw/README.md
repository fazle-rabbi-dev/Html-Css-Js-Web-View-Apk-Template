# Sketchpad

A tiny offline drawing app: pen, eraser, infinite zoomable canvas. No build step,
no dependencies, no network — just `index.html`, `style.css`, `app.js`.

Open `index.html` in any browser (or drop these files into the `assets/` folder of
your WebView APK template, keeping `index.html` as the entry point).

## Tools

| Tool | How |
| --- | --- |
| Pen | `B` or the pencil button |
| Eraser | `E` (width = 4× brush size, shown by the ring cursor) |
| Pan | `H`, hold `Space`, middle/right-drag, or two-finger drag |
| Zoom | Pinch, `Ctrl`/`Cmd` + scroll, `+` / `-`, or the HUD buttons |
| Reset view | `0` or click the zoom percentage |
| Brush size | Slider, or `[` / `]` |
| Undo / redo | `Ctrl+Z` / `Ctrl+Shift+Z` (or `Ctrl+Y`) — also the toolbar buttons |
| Clear | Trash button (undoable) |
| Export | Download button → PNG of the drawn area |
| Light / dark | Sun/moon button (top-left) or `T` |

Space+drag pans without switching tools. Wheel scroll pans, `Ctrl`+wheel zooms
at the pointer.

## Dark mode

- Follows the OS (`prefers-color-scheme`) until you toggle it yourself; the
  choice is saved in `localStorage` under `sketchpad.theme`.
- The theme is applied by an inline script in `<head>`, so there is no white
  flash on load.
- It is not just the UI chrome: canvas paper, grid dots, the brush cursor ring
  and the exported PNG all switch. The default pen colour flips too
  (`#1f2430` ↔ `#e8edf5`) until you pick a colour manually — after that your
  colour is left alone.
- Everything is one CSS attribute (`<html data-theme="dark">`) plus a
  `palette` object in `app.js`, so adding a third theme is a few lines.

## How the canvas works

- Every stroke point is stored in **world units**, never in screen pixels.
- `screen = world * zoom + view offset`, so zooming and panning are just a
  change of three numbers — the canvas has no edges.
- Committed strokes render into an offscreen "ink" layer; the visible canvas
  draws paper + dot grid + that layer. While drawing, only the new segment is
  appended to the ink layer (fast); a full rebuild happens on pan/zoom/undo.
- Erasing uses `destination-out` on the ink layer, so the grid and paper are
  never erased.
- Touch: one finger draws, two fingers pinch-zoom + pan, stylus and mouse both
  work. Coalesced pointer events are used for smooth, high-rate input.

## Files

```
index.html   markup + inline SVG icon sprite
style.css    paper UI, floating toolbar, zoom HUD
app.js       canvas engine (transform, rendering, gestures, history, export)
icons/       original Lucide (ISC) SVG files that the sprite in index.html was
             built from — kept as the source, not loaded at runtime```

Icons are inlined as `<symbol>` + `<use>` on purpose: CSS `mask-image: url(...)`
and external `<use href="...">` both fail when the page is loaded over
`file://` (each file is its own opaque origin), which silently kills the icons
inside a WebView.

## Note for the APK

If downloading files from a WebView does nothing, that is the template's
`DownloadListener` (or the missing one), not the app. The PNG is produced in
memory and handed to a normal `<a download>` link.
