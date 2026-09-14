---
name: Windows NSIS releases
description: Why production Windows installers for Real should be built on a native Windows runner.
---

Build Real NSIS installers on a native Windows runner rather than cross-building the final installer in the Replit Nix environment.

**Why:** Electron can create the unpacked Windows application on Linux, but electron-builder’s NSIS helper must execute a generated Windows binary. The available Nix Wine failed with loader and RPC/OLE errors across 32-bit, 64-bit, and virtual-display approaches.

**How to apply:** Use the repository’s Windows release workflow for installer and update metadata generation. Linux remains suitable for renderer checks and unpacked Windows packaging.