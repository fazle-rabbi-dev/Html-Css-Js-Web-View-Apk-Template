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

- **Important:** replace default app name with the name of the app that you're building and for each app you will update package name and also replace the icon of apk (create the icon if needed that matched the app purpose) and also update splash screen to match the app purpose.

## Native bridge (implemented)

Wiring: `addJavascriptInterface(new Bridge(), "Native")` + `WebChromeClient` permission hooks + `emitToJs()` for native→JS (`evaluateJavascript` on the UI thread). WebView debugging is enabled for `chrome://inspect`.

**JS API — `window.Native`**

| Method | Native side |
|---|---|
| `deviceInfo()` (JSON) | `Build.*`, `PackageManager`, `DisplayMetrics` |
| `setValue(k,v)` / `getValue(k)` / `storageDump()` | `SharedPreferences` (`bridgelab_prefs`) |
| `toastMsg(s)` / `vibrate(ms)` | `Toast` / `Vibrator` (`VibrationEffect` on API 26+) |
| `copyText(s)` / `readClipboard()` | `ClipboardManager` |
| `shareText(s)` / `openUrl(u)` | `ACTION_SEND` / `ACTION_VIEW` (posted to UI thread) |
| `notifyUser(title, body)` → status | `NotificationManager` + channel; `POST_NOTIFICATIONS` on API 33+ (queued, fired after grant) |
| `batteryInfo()` / `networkInfo()` (JSON) | `BatteryManager` / `ConnectivityManager` |
| `saveFile(name, body)` → path | `MediaStore` `Download/` on API 29+, app external dir below |
| `printPage()` | `PrintManager` |
| `ping(payload, cbId)` | background thread → `window.BridgeLab.onNative(cbId, json)` |

**WebChromeClient hooks:** `onPermissionRequest` (camera/mic), `onGeolocationPermissionsShowPrompt`, `onShowFileChooser`, `onJsAlert`/`onJsConfirm`. Plus a `DownloadListener` → `DownloadManager`.

**Manifest permissions:** INTERNET, CAMERA, RECORD_AUDIO, ACCESS_FINE/COARSE_LOCATION, VIBRATE, POST_NOTIFICATIONS, WRITE_EXTERNAL_STORAGE (maxSdk 28). Camera/mic/location are `required="false"`.

Rules:

- `@JavascriptInterface` methods run on a background thread — never touch UI directly, use `runOnUiThread`.
- Runtime permissions: hold the pending `PermissionRequest` / geolocation callback, request the permission, answer it in `onRequestPermissionsResult`. Dropping a request denies it forever.
- Return JSON strings and `JSON.parse` them on the JS side; don't hand-build JSON.
- New capability = manifest entry + request flow + bridge method; no Gradle dependencies.

Not wired (needs deps or more UI): `WebViewAssetLoader`/real https origin, `androidx.webkit` `WebMessageListener`, biometrics, FileProvider photo capture via `<input capture>`, foreground services, billing/ads.

**Demo app:** `assets/index.html` is Bridge Lab — cards 01–14, an honest-limits list, and an event log. It also opens in a desktop browser and reports `bridge missing`.

