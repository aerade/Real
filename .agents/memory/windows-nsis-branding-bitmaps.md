---
name: NSIS branding bitmaps
description: Bitmap format compatibility for branded electron-builder NSIS installers on Windows runners
---

Use opaque classic Windows 3.x 24-bit BMPs for electron-builder NSIS header and sidebar artwork. A valid-looking 32-bit BMP can compile and be embedded successfully while rendering as blank in the real installer window.

**Why:** The Windows desktop verification showed the 32-bit assets in the source but not in the installer; converting the same artwork to 24-bit BMP made the Real sidebar render in the captured finish page.

**How to apply:** When changing installer artwork, keep the configured dimensions and verify the rendered installer screenshot, not only that NSIS compilation succeeds.