# AGENTS.md — WebView APK Template

## What this is

Android WebView shell that packages a static HTML/CSS/JS app (`app/`) into an installable APK. Origin: 2022 on-device (APK Builder) template. Current: cloud-built via GitHub Actions, Android 6+ (API 23) compatible.

## Stack

- Native shell: single `Activity` + `WebView` (Java, no Kotlin, no Jetpack).
- App layer: plain HTML/CSS/JS in `app/` (currently **Silicon**, a native-bridge capability demo; CDNs allowed).
- Build: Gradle (AGP 8.5.2, Gradle 8.7, JDK 17) — files are **generated in CI**, not stored in repo.

## Structure

- `app/index.html` — app entry point (`MainActivity` loads `file:///android_asset/index.html`).
- `app/` — all web files live at root level; no subfolder routing needed.
- `src/com/fazlerabbi/silicon/` — `MainActivity.java` (WebView shell; JS + DOM storage ON, don't disable) + `SplashActivity.java` (premium branded splash with fade/scale entrance, warms up the WebView engine).
- `AndroidManifest.xml` — legacy Eclipse/ApkBuilder layout (manifest at root, `uses-sdk min 12 / target 27`). `exported` flags + splash wiring live in repo; **CI only bumps** min 23 / target 34 at build time (keeps APK Builder compat).
- `.github/workflows/build-apk.yml` — self-contained: generates `settings.gradle` / `build.gradle` / `app/build.gradle` via heredoc, patches manifest with `sed`, runs `gradle :app:assembleDebug`, renames + uploads the artifact (`Silicon.apk` in this branch).
- `res/`, `bin/`, `build/` — legacy artifacts/layout. Leave alone, **except** the launcher icons: `res/mipmap-{mdpi..xxxhdpi}/ic_launcher.png` are the legacy bitmaps (used by toast on some ROMs and by launchers without adaptive support) and must match `res/mipmap-anydpi-v26/ic_launcher.xml`. A stock Android-robot PNG here is the reason toasts look unbranded.

## Conventions for agents

- Web app changes go in `app/` only. Entry must stay `app/index.html`.
- **Never add Service Worker code** — SWs don't run on `file://`. Strip `navigator.serviceWorker.register`, `manifest.json` links are pointless (harmless but remove for cleanliness).
- External CDN scripts are fine (INTERNET permission declared), but prefer self-contained assets for true offline.
- The generated `app/build.gradle` is **Groovy DSL** — use `minifyEnabled = false`, NOT `isMinifyEnabled` (Kotlin syntax breaks the build).
- Runner already has Android SDK at `$ANDROID_HOME`; `sdkmanager` is at `$ANDROID_HOME/cmdline-tools/latest/bin` (not on PATH by default). Don't use `android-actions/setup-android` (requests obsolete `tools` package). No NDK needed.
- Commit + push to `main` triggers the build. Artifact: `app/build/outputs/apk/debug/app-debug.apk`.
- **WebView gotchas already solved here (don't remove):**
  - Mic: needs `RECORD_AUDIO` **and** `MODIFY_AUDIO_SETTINGS`, else `getUserMedia({audio:true})` dies with `NotReadableError: Could not start audio source` even though the runtime grant succeeded.
  - Network state: `ConnectivityManager` calls need `ACCESS_NETWORK_STATE`, else the bridge throws a `SecurityException`.
  - Downloads: API 23-28 needs `WRITE_EXTERNAL_STORAGE` granted at runtime before `DownloadManager.enqueue()` can write to public `Download/`; the listener requests it (`REQ_DOWNLOAD`) and retries.
  - `openUrl()` is app-first: it skips packages that handle generic `https` (browsers/web wrappers) so `https://wa.me/...` goes to WhatsApp, not the browser. Requires the `<queries>` block in the manifest for Android 11+ package visibility.

- **Important:** replace default app name with the name of the app that you're building and for each app you will update package name and also replace the icon of apk (create the icon if needed that matched the app purpose) and also update splash screen to match the app purpose.
  - **Icon = 3 places, all of them.** Toast icons, launcher shortcuts and the recents card are drawn by the system from the launcher icon, so a half-replaced icon shows up as a stock Android robot in toasts:
    1. `res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher.png` — legacy bitmaps (48/72/96/144/192 px), one **per density**. Missing density = stale icon on that screen bucket.
    2. `res/drawable/ic_launcher_foreground.xml` + `@color/ic_launcher_background` — the adaptive icon (API 26+).
    3. `res/drawable/splash_*` references the same foreground, so the splash follows automatically.
  - Keep 1 and 2 visually identical. Adaptive icons are masked to a circle/squircle and only the inner 72/108 of the canvas is safe, so draw the bitmap version inset the same way.

## Native bridge API (calling from web code)

The shell injects a `Native` object into the page. Guard every call so the page still works in a desktop browser:

```js
const N = window.Native;
if (!N) { /* browser fallback */ }

// Fire a native toast (app icon shows on ROMs that draw the stock robot):
N.toastMsg("Hello from the web layer");
```

**Sync (return a value):**

| JS call | Returns | Notes |
|---|---|---|
| `N.deviceInfo()` | JSON `{manufacturer,model,androidVersion,appVersion,screen,locale}` | |
| `N.readClipboard()` | string | |
| `N.getValue(key)` | string | native SharedPreferences |
| `N.storageDump()` | JSON object | all native KV pairs |
| `N.batteryInfo()` | JSON `{level, charging}` | |
| `N.networkInfo()` | JSON `{type, metered}` | needs `ACCESS_NETWORK_STATE` |

**Fire-and-forget (void):**

| JS call | Effect |
|---|---|
| `N.toastMsg(msg)` | system Toast with the app icon |
| `N.vibrate(ms)` | single buzz |
| `N.copyText(text)` | writes clipboard |
| `N.shareText(text)` | system share sheet |
| `N.openUrl(url)` | app-first: skips browsers, opens the real app (WhatsApp, maps, …) |
| `N.setValue(key, value)` | native SharedPreferences |
| `N.printPage()` | system print sheet |

**Permission / async:**

| JS call | Returns | Notes |
|---|---|---|
| `N.notifyUser(title, body)` | `"ok"` / `"asking-permission"` / `"denied"` | API 33+ requests at runtime |
| `N.saveFile(name, content)` | path or `"failed: ..."` | writes to `Download/` |
| `N.ping(payload, callbackId)` | — | async; native replies via `window.Silicon.onNative(callbackId, result)` |

**Async callback contract:** register `window.Silicon = { onNative(id, result) { ... } }` before calling `N.ping`. Native runs the callback on the UI thread via `evaluateJavascript`.

**Media / location / files** are triggered from HTML (`<input type="file">`, `navigator.mediaDevices`, `navigator.geolocation`) — the shell grants permissions through `WebChromeClient` callbacks. Don't request them from JS directly.

## Feature → web-side usage (quick reference)

When building a new app, use these entry points — do not invent new native calls.

| Feature | How to trigger from web code |
|---|---|
| Camera (live preview) | `navigator.mediaDevices.getUserMedia({video:true})` → `<video>` element |
| Microphone (level meter) | `getUserMedia({audio:true})` + Web Audio `AnalyserNode` |
| Geolocation | `navigator.geolocation.getCurrentPosition` / `watchPosition` |
| File picker (image) | `<input type="file" accept="image/*">` |
| Share | `N.shareText(text)` |
| Open link (app-first) | `N.openUrl(url)` (WhatsApp, maps, Telegram, …) |
| Clipboard | `N.copyText(t)` / `N.readClipboard()` |
| Toast | `N.toastMsg(msg)` |
| Vibration | `N.vibrate(ms)` |
| Device info | `JSON.parse(N.deviceInfo())` |
| Native storage | `N.setValue(k,v)` / `N.getValue(k)` / `N.storageDump()` |
| Notifications | `N.notifyUser(title, body)` (API 33+ prompts at runtime) |
| Battery & network | `N.batteryInfo()` / `N.networkInfo()` |
| Save file | `N.saveFile(name, content)` → `Download/` |
| Print | `N.printPage()` (or `window.print()`) |
| Native dialogs | `alert()` / `confirm()` (overridden as AlertDialogs) |
| Async round-trip | `N.ping(payload, id)` + `window.Silicon.onNative(id, result)` |
| Downloads | trigger a download link; shell routes via `DownloadManager` |
| HTTP fetch | standard `fetch()` (INTERNET permission declared) |

Permissions (`RECORD_AUDIO`, `ACCESS_FINE_LOCATION`, `CAMERA`, `POST_NOTIFICATIONS`) are requested by the shell through `WebChromeClient` / `onRequestPermissionsResult` — do not add your own permission code.

## Features (implemented)


The Silicon app exposes these capabilities to the web layer:

- **Camera** — live preview, front/back switch, capture frame as image
- **Microphone** — live input level meter
- **Geolocation** — single fix, or watch 3 fixes
- **File picker** — pick an image from device storage and preview it
- **Share** — system share sheet with text
- **Open link** — app-first: a link that belongs to an installed app (WhatsApp, Telegram, maps …) opens in that app, otherwise in the browser; `intent://` URLs are parsed too
- **Clipboard** — copy text, read clipboard
- **Toast** — system Toast with a custom view, so the Silicon icon shows on ROMs that draw the default robot instead of the app icon
- **Vibration** — single buzz + pattern
- **Device info** — manufacturer, model, Android version, app version, screen, locale
- **Native storage** — key/value that survives app restarts, separate from `localStorage`
- **Notifications** — with permission handling (API 33+)
- **Battery & network** — battery %, charging state, wifi/cellular/metered
- **Save file** — write a `.txt` to `Download/`
- **Print** — system print sheet for the page
- **Native dialogs** — `alert()` / `confirm()` as real AlertDialogs
- **Async JS ↔ native** — call native, get a callback with a round-trip result
- **Downloads** — http(s) downloads routed through `DownloadManager`

Not implemented (needs extra deps or more UI): real https origin via `WebViewAssetLoader`, biometrics, camera capture via `<input capture>`, foreground services, billing/ads.

**Demo app:** `app/index.html` — cards for each feature above, an honest-limits list, and an event log. Also opens in a desktop browser, where it reports `bridge missing`.

