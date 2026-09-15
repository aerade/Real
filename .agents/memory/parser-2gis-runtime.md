---
name: Parser2GIS runtime
description: Runtime assumptions when invoking the external Parser2GIS GitHub project.
---

Parser2GIS does not reliably discover the workspace Chromium binary automatically, and its JSON writer prefixes output with a UTF-8 BOM.

**Why:** The first real invocation failed at browser discovery, and Node's JSON parser rejected the otherwise valid output until both runtime details were handled explicitly.

**How to apply:** Pass the available Chromium executable explicitly when spawning the parser, and strip a leading BOM before parsing its JSON output.