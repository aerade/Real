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

When Parser2GIS can run but `/api/leads/search` is logged as `request aborted` at exactly 60 seconds,
check the reverse proxy before changing parser code; the API parser limit is three minutes and a
default Nginx `proxy_read_timeout 60s` can close the client connection first.

**Why:** The VPS healthcheck succeeded after the venv fix, while searches consistently disconnected
at about 60 seconds without producing the API's own parser-timeout error.

**How to apply:** Raise the existing API proxy location's read/send timeout above three minutes,
then reload Nginx and retest the same search.

On some VPS networks, Parser2GIS can leave a background 2GIS XHR open indefinitely even after
the search-result links are available, causing its hard-coded request wait to time out.

**Why:** The same Parser2GIS revision returned five Krasnoyarsk cards locally but stalled in the
VPS browser until its internal `_wait_requests_finished` timeout.

**How to apply:** Run Parser2GIS through the project wrapper, which gives pending requests a
short grace period and continues with the loaded result DOM instead of waiting indefinitely.

Ubuntu's `/snap/bin/chromium` launcher can fail for a non-root systemd service with a
`not a snap cgroup` error; the real executable is under the mounted snap revision.

**Why:** The API service user could not establish Chromium's DevTools connection through the
launcher, while the launcher also differed from the binary selected by an interactive shell.

**How to apply:** Prefer `/snap/chromium/current/usr/lib/chromium/chromium` when it exists,
before `/usr/bin/chromium-browser` or other snap wrapper paths.

When launching the direct Chromium snap binary from a systemd service, remove inherited
`DBUS_SESSION_BUS_ADDRESS` and `DISPLAY` values; an invalid DBus address can delay CDP startup
for minutes even when all shared libraries are installed.

**Why:** The same direct binary opened DevTools promptly after those variables were unset, while
the inherited service environment produced repeated DBus parsing errors and delayed startup.

**How to apply:** Delete those two environment keys for the snap Chromium child process, while
keeping the snap and host library directories in `LD_LIBRARY_PATH`.

Parser2GIS's `max_records` limit counts only successfully captured item responses; failed
responses still consume the parser's per-item retry waits and can keep it walking result pages.

**Why:** A missing item XHR could trigger three upstream 30-second waits per link and exceed the
API request limit even though the requested record count was only five.

**How to apply:** Override item-response and navigation waits in the VPS wrapper, and keep a
short process-level deadline so one broken 2GIS endpoint cannot block the desktop search.

On the VPS, waiting for `window.openHTTPs == 0` through CDP can block the CDP call itself when
2GIS leaves an XHR pending; the parser's timeout decorator does not reliably interrupt that call.

**Why:** Parser2GIS connected and completed navigation, then remained inside its page-XHR wait
until the outer API deadline even though the loaded DOM was already available.

**How to apply:** After navigation, read the loaded DOM without waiting for every background XHR;
keep short item-response and process-level limits as separate safeguards.

The current 2GIS search UI can render business links as `/<city>/firm/<id>` without the older
`?stat=` query payload; a parser that accepts only the legacy link shape reports zero results.

**Why:** The VPS DOM contained real firm links and many anchors, but the upstream link predicate
rejected every one because it required a base64-like `stat` query.

**How to apply:** Accept both `/firm/<id>` and `/station/<id>` paths, with or without query
parameters, when extracting result nodes for Parser2GIS.

When the current 2GIS search page renders firm links but emits no `items/byid` responses, fetch
each exact firm/station URL with the accepted-risk cookie and parse its SSR `initialState`.

**Why:** The live VPS page had usable card HTML but no item XHRs; CDP navigation/evaluation could
also remain pending or expose the previous card, while direct card HTTP returned the requested
profile quickly and reliably.

**How to apply:** Keep Parser2GIS for Chromium search and link discovery, then use each discovered
2GIS URL as the fallback response source. Do not infer a card from the current browser document
after a timed-out navigation, or records can be duplicated.

On this VPS, the `real` systemd user has no home directory and the snap Chromium process can take
roughly 50 seconds to establish CDP; a full card search can exceed 90 seconds.

**Why:** The service reached Chromium only after using the direct mounted snap binary with its
library paths, and the first complete Parser2GIS smoke run took about 103 seconds.

**How to apply:** Run the parser with the project virtualenv Python, set `HOME` and XDG cache paths
to a writable project directory, pass the direct snap binary environment, and keep the API/proxy
deadlines above the observed full-search duration.