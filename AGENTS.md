# AGENTS.md — WebView APK Template

## What this is

Android WebView shell that packages a static HTML/CSS/JS app (`assets/`) into an installable APK. Origin: 2022 on-device (APK Builder) template. Current: cloud-built via GitHub Actions, Android 12+ compatible.

## Stack

- Native shell: single `Activity` + `WebView` (Java, no Kotlin, no Jetpack).
- App layer: plain HTML/CSS/JS in `assets/` (currently Sukoon tasbih app; CDNs allowed).
- Build: Gradle (AGP 8.5.2, Gradle 8.7, JDK 17) — files are **generated in CI**, not stored in repo.

## Structure

- `assets/index.html` — app entry point (`MainActivity` loads `file:///android_asset/index.html`).
- `assets/` — all web files live at root level; no subfolder routing needed.
- `src/com/example/webviewapktemplate/MainActivity.java` — WebView shell. JS + DOM storage ON (don't disable; apps rely on `localStorage`).
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

- **Important:** replace default app name with the name of the app that you're building and for each app you will update package name and also replace the icon of apk (create the icon if needed that matched the app purpose)

## Extending the bundled app (Sukoon)

Single-file app in `assets/index.html`. Data: `localStorage sukoon_v2`. To add a dhikr, append to the `AZKAR` array `{id, ar, tr, en, target}`. Theme via CSS vars (`:root` / `.dark`).
