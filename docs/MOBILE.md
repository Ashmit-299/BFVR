# Mobile App (Android APK) Setup

Vyapar Saathi ships as an Android app (APK) you can install on any phone or tablet
(Android 7+). The app bundles the full UI; it connects to your cloud or local server
over the network.

## File

| File | What it is |
|---|---|
| `dist/Vyapar-Saathi-1.0.0.apk` | Release-signed installable APK (~3.4 MB) |

A debug build is also produced at `client/android/app/build/outputs/apk/debug/app-debug.apk`
during development, but the release APK is the one to distribute.

## Install on a phone

1. Copy `Vyapar-Saathi-1.0.0.apk` to the phone (USB, Bluetooth, WhatsApp/Drive download, etc.).
2. On the phone, open the file. Android will ask to allow installs from that source
   ("Install unknown apps") — this is normal for APKs installed outside the Play Store.
3. Tap **Install** and open **Vyapar Saathi**.

## First run — just log in

The server address (`https://vyapar-saathi-4ucf.onrender.com`) is **baked into the APK**,
so there is no address to enter — open the app and log in with your username and password.
The login is remembered on that phone (stored in durable native storage), so the next
launch opens straight into the POS, online or offline. See [SERVER.md](SERVER.md) for how
to set up the server itself.

## Offline behaviour

If the internet drops, billing continues — orders/payments/expenses are queued locally and
**auto-sync in order** when the connection returns. Nothing is double-recorded (the server
de-duplicates by a unique ID per entry). Works the same as the PWA, but with an app icon
and no browser UI.

## Updating the app

Install the new APK over the old one (same signature) — your login and offline queue are
kept.

## Rebuilding the APK from source

Requires the Android SDK (platform + build-tools) and JDK 21:

```bash
npm install
npm run build:apk     # builds the shell UI, then gradlew assembleRelease
# output: client/android/app/build/outputs/apk/release/app-release.apk
```

The release APK is signed with the keystore at
`client/android/keystore/vyapar-saathi.keystore` (gitignored — keep a backup; installing
updates requires the same signature). Set `ANDROID_HOME` and `JAVA_HOME` (JDK 21) before
running Gradle.
