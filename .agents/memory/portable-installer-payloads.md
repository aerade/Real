---
name: Portable installer payloads
description: Electron-builder portable installers can fail to extract a nested application app.asar when the bundled payload is placed under the installer's resources directory.
---

For a custom Electron portable installer that copies a complete unpacked Electron application, place the payload beside the installer's resources directory and resolve it from the parent of process.resourcesPath. Keep a fallback for the older resources-relative layout when supporting already-built installers.

**Why:** Real's portable installer could start its custom UI but then report ENOENT for `resources/real-app/resources/app.asar` during installation. The Windows build and manifest checks passed, but the nested app.asar was not reliably available from the portable extraction directory.

**How to apply:** Use electron-builder `extraFiles` for the unpacked application payload with `to: real-app`, validate both `Real.exe` and `real-app/resources/app.asar` before copying, and build/release on a native Windows runner.