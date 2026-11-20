# AGENTS.md — WebView APK Template

## What this is

Android WebView shell that packages a static HTML/CSS/JS app (`assets/`) into an installable APK. Origin: 2022 on-device (APK Builder) template. Current: cloud-built via GitHub Actions, Android 12+ compatible.

## Stack

- Native shell: single `Activity` + `WebView` (Java, no Kotlin, no Jetpack).
- App layer: plain HTML/CSS/JS in `assets/` (currently **Bridge Lab**, a native-bridge capability demo; CDNs allowed).
- Build: Gradle (AGP 8.5.2, Gradle 8.7, JDK 17) — files are **generated in CI**, not stored in repo.

## Structure

- `assets/index.html` — app entry point (`MainActivity` loads `file:///android_asset/index.html`).
- `assets/` — all web files live at root level; no subfolder routing needed.
- `src/com/fazlerabbi/bridgelab/` — `MainActivity.java` (WebView shell; JS + DOM storage ON, don't disable) + `SplashActivity.java` (1.2s branded splash, warms up the WebView engine).
- `AndroidManifest.xml` — legacy Eclipse/ApkBuilder layout (manifest at root, `uses-sdk min 12 / target 27`). `exported` flags + splash wiring live in repo; **CI only bumps** min 24 / target 34 at build time (keeps APK Builder compat).
- `.github/workflows/build-apk.yml` — self-contained: generates `settings.gradle` / `build.gradle` / `app/build.gradle` via heredoc, patches manifest with `sed`, runs `gradle :app:assembleDebug`, renames + uploads the artifact (`BridgeLab.apk` in this branch).
- `res/`, `bin/`, `build/` — legacy artifacts/layout. Leave alone.

## Conventions for agents

- Web app changes go in `assets/` only. Entry must stay `assets/index.html`.
- **Never add Service Worker code** — SWs don't run on `file://`. Strip `navigator.serviceWorker.register`, `manifest.json` links are pointless (harmless but remove for cleanliness).
- External CDN scripts are fine (INTERNET permission declared), but prefer self-contained assets for true offline.
- The generated `app/build.gradle` is **Groovy DSL** — use `minifyEnabled = false`, NOT `isMinifyEnabled` (Kotlin syntax breaks the build).
- Runner already has Android SDK at `$ANDROID_HOME`; `sdkmanager` is at `$ANDROID_HOME/cmdline-tools/latest/bin` (not on PATH by default). Don't use `android-actions/setup-android` (requests obsolete `tools` package). No NDK needed.
- Commit + push to `main` triggers the build. Artifact: `app/build/outputs/apk/debug/app-debug.apk`.
- **WebView gotchas already solved here (don't remove):**
  - Mic: needs `RECORD_AUDIO` **and** `MODIFY_AUDIO_SETTINGS`, else `getUserMedia({audio:true})` dies with `NotReadableError: Could not start audio source` even though the runtime grant succeeded.
  - Network state: `ConnectivityManager` calls need `ACCESS_NETWORK_STATE`, else the bridge throws a `SecurityException`.
  - `openUrl()` is app-first: it skips packages that handle generic `https` (browsers/web wrappers) so `https://wa.me/...` goes to WhatsApp, not the browser. Requires the `<queries>` block in the manifest for Android 11+ package visibility.

- **Important:** replace default app name with the name of the app that you're building and for each app you will update package name and also replace the icon of apk (create the icon if needed that matched the app purpose) and also update splash screen to match the app purpose.

## Features (implemented)

The Bridge Lab app exposes these capabilities to the web layer:

- **Camera** — live preview, front/back switch, capture frame as image
- **Microphone** — live input level meter
- **Geolocation** — single fix, or watch 3 fixes
- **File picker** — pick an image from device storage and preview it
- **Share** — system share sheet with text
- **Open link** — open a URL in the external browser
- **Clipboard** — copy text, read clipboard
- **Toast** — native toast messages
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

**Demo app:** `assets/index.html` — cards for each feature above, an honest-limits list, and an event log. Also opens in a desktop browser, where it reports `bridge missing`.

