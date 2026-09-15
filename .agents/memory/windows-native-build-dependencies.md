---
name: Windows native build dependencies
description: Cross-platform optional dependency settings required by the Real desktop release build.
---

Keep Windows x64 optional packages available for every native tool used by the desktop build: Rollup, esbuild, lightningcss, and Tailwind Oxide. Use pnpm supported architectures and exclude only unused architectures, not the Windows x64 variant.

**Why:** A Linux-only install can pass local checks while a Windows runner fails at the first native module omitted from the lockfile; fixing only Rollup exposed the same issue in lightningcss.

**How to apply:** When adding or changing native frontend/build tooling, verify its Windows x64 package is present in the lockfile and run the Windows release workflow before publishing the installer.