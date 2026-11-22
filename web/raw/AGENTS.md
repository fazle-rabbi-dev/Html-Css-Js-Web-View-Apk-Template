# AGENTS.md — raw web template

Minimal, self-contained HTML/CSS/JS starter. Copied into `app/` when building a raw-template app.

## Rules

- **Zero external requests.** No CDN, no Google Fonts, no icon packs, nothing to download. Icons are inline SVG (`fill: none; stroke: currentColor`).
- **Three files only:** `index.html`, `script.js`, `style.css`. No build step, plain relative paths (`./style.css`).
- **Theme:** light tokens live in `:root`, dark overrides in `html.dark` (only colours + `color-scheme` change). The toggle adds/removes the `dark` class on `<html>` and persists it in `localStorage["theme"]`.
- **Keep the inline `<head>` script** — it applies the saved theme before first paint, so there is no flash of the wrong theme. Don't move theme bootstrapping into `script.js`.
- **Keep the toggle accessible:** `aria-pressed` + a label that says what the click will do ("Switch to dark mode" / "Switch to light mode").
- Nice-to-have: everything in this folder should still work opened directly in a desktop browser.

## Not this template's job

- The Android status/navigation bars follow the **system** theme — the in-page toggle does not (and cannot) change them. That's native side, documented in the repo-root `AGENTS.md`.
