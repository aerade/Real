---
name: Windows icon padding
description: How to keep the Real Windows icon visually smaller without adding a background.
---

Render the white mark to a fixed smaller canvas before generating the multi-size ICO; use transparent margins rather than scaling the whole canvas with a percentage resize.

**Why:** Percentage-resizing the source before adding the canvas can crop into the logo or create an opaque-looking Windows icon, while a fixed render followed by a transparent extent keeps the mark smaller and preserves alpha.

**How to apply:** Generate the white mark at roughly 70% of a 1024px transparent canvas, center it, then create the 256/128/64/48/32/24/16px ICO resources.