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
- `.github/workflows/build-apk.yml` — self-contained: generates `settings.gradle` / `build.gradle` / `app/build.gradle` via heredoc, patches manifest with `sed`, runs `gradle :app:assembleDebug`, uploads `app-debug` artifact.
- `res/`, `bin/`, `build/` — legacy artifacts/layout. Leave alone.

## Conventions for agents

- Web app changes go in `assets/` only. Entry must stay `assets/index.html`.
- **Never add Service Worker code** — SWs don't run on `file://`. Strip `navigator.serviceWorker.register`, `manifest.json` links are pointless (harmless but remove for cleanliness).
- External CDN scripts are fine (INTERNET permission declared), but prefer self-contained assets for true offline.
- The generated `app/build.gradle` is **Groovy DSL** — use `minifyEnabled = false`, NOT `isMinifyEnabled` (Kotlin syntax breaks the build).
- Runner already has Android SDK at `$ANDROID_HOME`; `sdkmanager` is at `$ANDROID_HOME/cmdline-tools/latest/bin` (not on PATH by default). Don't use `android-actions/setup-android` (requests obsolete `tools` package). No NDK needed.
- Commit + push to `main` triggers the build. Artifact: `app/build/outputs/apk/debug/app-debug.apk`.

- **Important:** replace default app name with the name of the app that you're building and for each app you will update package name and also replace the icon of apk (create the icon if needed that matched the app purpose) and also update splash screen to match the app purpose.

## Extending the bundled app (Bridge Lab)

Single-file app in `assets/index.html`. It demonstrates every capability the shell exposes, and each card maps to one native hook:

| Card | Web side | Native side |
|---|---|---|
| Camera / mic | `getUserMedia` | `WebChromeClient.onPermissionRequest` + runtime `CAMERA`/`RECORD_AUDIO` |
| Geolocation | `navigator.geolocation` | `onGeolocationPermissionsShowPrompt` + location perms |
| File picker | `<input type="file">` | `onShowFileChooser` → `ACTION_GET_CONTENT` |
| Share / open URL | `Native.shareText` / `Native.openUrl` | `Intent.ACTION_SEND` / `ACTION_VIEW` |
| Clipboard | `Native.copyText` / `readClipboard` | `ClipboardManager` |
| Toast / vibrate | `Native.toastMsg` / `vibrate` | `Toast` / `Vibrator` |
| Device info | `Native.deviceInfo()` | `Build.*`, `PackageManager`, `DisplayMetrics` |
| Storage | `Native.setValue/getValue/storageDump` | `SharedPreferences` (`bridgelab_prefs`) |
| Async bridge | `Native.ping(payload, cbId)` | background thread + `evaluateJavascript` → `window.BridgeLab.onNative(id, json)` |
| Notification | `Native.notifyUser` | `NotificationManager` + channel + `POST_NOTIFICATIONS` |
| Battery / network | `Native.batteryInfo` / `networkInfo` | `BatteryManager` / `ConnectivityManager` |
| Save file / print | `Native.saveFile` / `printPage` | `MediaStore` (API 29+) / `PrintManager` |
| Dialogs | `alert()` / `confirm()` | `onJsAlert` / `onJsConfirm` |

Rules when adding a capability:

- `@JavascriptInterface` methods run on a background thread. Never touch UI from them — wrap in `runOnUiThread`.
- Native → JS goes through `webView.evaluateJavascript(...)` on the UI thread (see `emitToJs`).
- Runtime permissions: hold the pending `PermissionRequest` / callback, request the permission, answer it in `onRequestPermissionsResult`.
- New permissions go in `AndroidManifest.xml` **and** the request flow in `MainActivity`.
- Return JSON strings and `JSON.parse` them on the JS side; avoid hand-built JSON.
