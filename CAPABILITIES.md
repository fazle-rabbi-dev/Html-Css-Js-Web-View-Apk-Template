# What This WebView APK Template Can Do

Static HTML/CSS/JS in `assets/` packaged as an installable Android app
(`MainActivity` WebView shell + cloud build via GitHub Actions).
Entry point must stay `assets/index.html`. No Service Workers (`file://`).

## Works with web code only (no native changes)

- Any offline UI: notes, todo, calculators, dhikr counters, diaries, flashcards
- `localStorage` persistence (DOM storage is ON) — settings, favorites, history, streaks
- `<audio>` / `<video>` playback of bundled files or URLs
- Manual file picking (`<input type=file>`) — chooser already wired via `WebChromeClient`
- Camera capture to web (`<input type=file accept=image/* capture>`) via the same chooser
- QR generation (self-contained JS lib), barcodes, charts (canvas/SVG)
- QR/barcode **decoding from gallery images** (self-contained JS lib)
- Dark/light themes, responsive mobile layouts, custom SVG icons
- External CDNs (needs internet; `INTERNET` permission declared) — or fully offline bundles

## Possible with a small native addition (bridge / permission / callback)

- **Read phone-storage folders** (music, ebooks, wallpapers) — `READ_MEDIA_*` + `JavascriptInterface` listing via `MediaStore` (done in Bhoot FM)
- **File downloads that land in Downloads** — `DownloadListener` or bridge (plain `<a download>` from `file://` is unreliable)
- **Live camera scanning** (QR, barcode, OCR preview) — `CAMERA` permission + `onPermissionRequest` grant, then JS `getUserMedia`
- **Flashlight toggle** — `CameraManager.setTorchMode` exposed through a bridge method
- **Share / open / export files** — `Intent` bridge (`ACTION_SEND`, `ACTION_VIEW`)
- **Notifications, alarms, sleep timers that survive app close** — native service / `AlarmManager` (JS timers die with the page)
- **Background audio playback** — foreground `Service` + media notification (WebView audio pauses when the app is backgrounded/killed)
- **Device info, vibration, battery, network state** — one-method bridges each

## Not possible / not worth it here

- Service Workers, web push notifications — don't run on `file://`
- True Play-Store release signing — CI builds a debug APK (fine for sideloading)
- Heavy native features (maps SDK, ML Kit on-device, Bluetooth LE) — use a native/Kotlin app instead
- Background execution guarantees — single-`Activity` shell, no services by default

## Per-app checklist (from `AGENTS.md`)

Each new app: new app name (`strings.xml`), new package (`AndroidManifest.xml` + `src/` + workflow `namespace`/`applicationId`), matching launcher icon + splash theme, and keep the workflow's Groovy `minifyEnabled = false` syntax.
