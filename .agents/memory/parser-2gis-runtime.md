---
name: Parser2GIS runtime
description: Runtime assumptions when invoking the external Parser2GIS GitHub project.
---

Parser2GIS does not reliably discover the workspace Chromium binary automatically, and its JSON writer prefixes output with a UTF-8 BOM.

**Why:** The first real invocation failed at browser discovery, and Node's JSON parser rejected the otherwise valid output until both runtime details were handled explicitly.

**How to apply:** Pass the available Chromium executable explicitly when spawning the parser, and strip a leading BOM before parsing its JSON output.

Parser result files may use either the parser's nested 2GIS shape or a flat export shape
(`website`, `phones`, `rating`, `reviews_count`, `category`). Mapping should accept both
shapes and keep contact types consistent enough for the client UI to recognize phones and email.

**Why:** The deployed parser returned nested review/contact data while the supplied Parsers.me
format documents flat fields; supporting only one shape silently loses business metadata.

**How to apply:** Treat nested fields as the first choice and use flat fields as fallbacks when
normalizing each organization.

On Linux systemd hosts, create the project `.venv` with a system-accessible Python rather than
letting `uv` select an interpreter stored under `/root/.local/share/uv`; otherwise a non-root API
service can fail with `Permission denied` while canonicalizing `.venv/bin/python`.

**Why:** The VPS API reached Parser2GIS successfully, but its service account could not traverse
the root-owned uv-managed Python target created by `uv sync`.

**How to apply:** Recreate `/opt/real/.venv` with `/usr/bin/python3.12` (or the VPS system Python),
then ensure the service account can read and execute the virtualenv before restarting `real-api`.