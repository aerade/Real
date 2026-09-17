---
name: Portable installer payloads
description: Electron-builder portable installers can omit nested files with an .asar extension from an embedded application payload.
---

For a custom Electron portable installer that copies a complete unpacked Electron application, keep the payload in the configured installer resources directory but rename the embedded application archive from app.asar to a neutral extension such as .bin. The installer can restore app.asar when copying into the final application directory. Keep compatibility checks for older app.asar and renamed .asar payloads when supporting already-built installers.

**Why:** A native Windows build and manifest verification can pass while the running portable installer reports ENOENT for a nested `resources/real-app/resources/*.asar` file. The portable extraction step does not reliably preserve nested `.asar` files.

**How to apply:** Rename the application archive during payload preparation, validate `Real.exe` and the neutral archive path before copying, map the neutral filename back to `resources/app.asar`, and always build/release on a native Windows runner.