# AGENTS.md — WebView APK Template

## What this is

Android WebView shell that packages a static HTML/CSS/JS app (`assets/`) into an installable APK. Origin: 2022 on-device (APK Builder) template. Current: cloud-built via GitHub Actions, Android 12+ compatible.

## Stack

- Native shell: single `Activity` + `WebView` (Java, no Kotlin, no Jetpack).
- App layer: plain HTML/CSS/JS in `assets/` (currently the **English Boss** phrasebook; fully offline, no CDNs).
- Build: Gradle (AGP 8.5.2, Gradle 8.7, JDK 17) — files are **generated in CI**, not stored in repo.

## Current app: English Boss

- Package / appId: `com.fazlerabbi.englishboss`
- Label: `English Boss` (`res/values/strings.xml`)
- Icon art: leaf mark taken from `assets/assets/favicon.svg` (cream `#FFF7EC` on terracotta `#B45F3C`).

## Structure

- `assets/index.html` — app entry point (`MainActivity` loads `file:///android_asset/index.html`).
- `assets/` — the whole static site (`index.html`, `css/`, `js/`, `assets/favicon.svg`). `*.md` and `*.mjs` are excluded from the APK by `ignoreAssetsPattern`.
- `src/com/fazlerabbi/englishboss/` — `MainActivity.java` (WebView shell; JS + DOM storage ON, don't disable) + `SplashActivity.java` (1.6s branded splash, warms up the WebView engine).
- `AndroidManifest.xml` — legacy Eclipse/ApkBuilder layout (manifest at root, `uses-sdk min 12 / target 27`). `exported` flags + splash wiring live in repo; **CI only bumps** min 24 / target 34 at build time (keeps APK Builder compat).
- `.github/workflows/build-apk.yml` — self-contained: generates `settings.gradle` / `build.gradle` / `app/build.gradle` via heredoc, patches manifest with `sed`, runs `gradle :app:assembleDebug`, uploads `English-Boss` artifact.
- `res/drawable/ic_launcher_foreground.xml` — adaptive-icon foreground (leaf vector).
- `res/drawable/splash_logo.xml` — terracotta rounded tile + leaf, used by the splash layout.
- `res/mipmap-*/ic_launcher.png` — legacy raster icons (API 24–25 only; 26+ uses `mipmap-anydpi-v26`).
- `res/`, `bin/`, `build/` — legacy artifacts/layout. Leave alone apart from the files above.

## Conventions for agents

- Web app changes go in `assets/` only. Entry must stay `assets/index.html`.
- **Never add Service Worker code** — SWs don't run on `file://`. Strip `navigator.serviceWorker.register`, `manifest.json` links are pointless (harmless but remove for cleanliness).
- Keep paths relative — `file://` breaks root-absolute URLs like `/css/app.css`.
- External CDN scripts are fine (INTERNET permission declared), but prefer self-contained assets for true offline.
- The generated `app/build.gradle` is **Groovy DSL** — use `minifyEnabled = false`, NOT `isMinifyEnabled` (Kotlin syntax breaks the build).
- Runner already has Android SDK at `$ANDROID_HOME`; `sdkmanager` is at `$ANDROID_HOME/cmdline-tools/latest/bin` (not on PATH by default). Don't use `android-actions/setup-android` (requests obsolete `tools` package). No NDK needed.
- Commit + push to `main` triggers the build. Artifact: `app/build/outputs/apk/debug/English-Boss.apk`.

- **Important:** replace default app name with the name of the app that you're building and for each app you will update package name and also replace the icon of apk (create the icon if needed that matched the app purpose) and also update splash screen to match the app purpose.

## Rebuilding icons

- Adaptive icon + splash leaf: `res/drawable/ic_launcher_foreground.xml` (108dp viewport, leaf scaled into the 66dp safe zone).
- Legacy PNGs: render 512×512 from `assets/assets/favicon.svg` (headless Chrome `--screenshot` with
  `--default-background-color=00000000`), then downscale with PIL to 48/72/96/144/192 px.
- Splash background: `res/drawable/splash_gradient.xml` (warm cream) + `res/drawable/splash_logo.xml`.

## Extending the bundled app (English Boss)

Static, multi-file site in `assets/`: `index.html` + `css/tokens.css|layout.css|components.css` + `js/data.js|icons.js|ui.js|theme.js|app.js`. Phrase source of truth is `assets/AGENTS.md`; after editing the tables run `bun tools/build-data.mjs` inside `assets/` to regenerate `js/data.js` and `js/icons.js`. Theme via CSS vars (`:root` / `.dark`); preference stored in `localStorage` key `eb-theme`.
