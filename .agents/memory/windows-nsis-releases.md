---
name: Windows NSIS releases
description: Why production Windows installers for Real should be built on a native Windows runner.
---

Build Real NSIS installers on a native Windows runner rather than cross-building the final installer in the Replit Nix environment.

**Why:** Electron can create the unpacked Windows application on Linux, but electron-builder’s NSIS helper must execute a generated Windows binary. The available Nix Wine failed with loader and RPC/OLE errors across 32-bit, 64-bit, and virtual-display approaches.

**How to apply:** Use the repository’s Windows release workflow for installer and update metadata generation. Linux remains suitable for renderer checks and unpacked Windows packaging.

The assisted NSIS uninstaller may exit its launcher process and show the visible `Real Uninstall` dialog from a temporary child process. UI verification must locate the visible top-level window rather than relying only on the launcher's `MainWindowHandle`.

**Why:** `Uninstall Real.exe` returned exit code 0 while the branded dialog belonged to a temporary NSIS process.

**How to apply:** When testing the uninstaller, retain the launcher path for identity but add a visible-window fallback keyed by the dialog title, then test only controls actually present on that window.