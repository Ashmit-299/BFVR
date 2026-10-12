# Windows App (EXE) Setup

Vyapar Saathi ships as a Windows desktop app — either a classic **installer** or a
**portable** single-file version. Both bundle the full UI; the app connects to your
cloud or local server over the network.

## Files

| File | What it is |
|---|---|
| `desktop/release/Vyapar-Saathi-Setup-1.0.0.exe` | Installer — installs to your PC, adds Start Menu + Desktop shortcuts |
| `desktop/release/Vyapar-Saathi-Portable-1.0.0.exe` | Portable — no installation, double-click and run |

Both are x64 (64-bit) Windows apps.

## Install (Setup version)

1. Copy `Vyapar-Saathi-Setup-1.0.0.exe` to the PC and double-click it.
2. Follow the wizard (you can choose the install folder).
3. Launch **Vyapar Saathi** from the Desktop or Start Menu shortcut.

## Install (Portable version)

1. Copy `Vyapar-Saathi-Portable-1.0.0.exe` anywhere (a USB stick works too).
2. Double-click to run — nothing is installed on the PC.

## First run — just log in

The server address (`https://vyapar-saathi-4ucf.onrender.com`) is **baked into the EXE**,
so there is no address to enter — open the app and log in with your username and password.
The login is remembered on that PC, so the next launch opens straight into the POS. See
[SERVER.md](SERVER.md) for how to set up the server itself.

## Offline behaviour

If the internet drops, billing continues — orders/payments/expenses are queued locally and
**auto-sync in order** when the connection returns. Nothing is double-recorded (the server
de-duplicates by a unique ID per entry).

## Updates

Download the new EXE and run it again (Setup replaces the old version; Portable just
overwrites the old file). Your login is kept.

## Rebuilding the EXE from source

```bash
npm install
npm run build:exe     # builds the shell UI + both EXEs into desktop/release/
```

> **Note for developers on Windows without Developer Mode:** electron-builder extracts a
> signing-tools archive that contains two macOS-only symlinks, which fail on Windows
> without the "Create symbolic links" privilege. If the build fails there, either enable
> **Windows Developer Mode** (Settings → Privacy & security → For developers) or
> pre-extract the archive once (skipping the `darwin` folder) into
> `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0`.
