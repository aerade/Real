---
name: Lead search history
description: Rules for preventing repeated lead search results while preserving an explicit opt-in to show prior results.
---

The default lead search result set is user-specific: a company returned to a user is hidden from that user's later searches, while assigned companies and leads no longer in the new stage are always hidden. The user can explicitly enable previously found companies.

**Why:** Search results are treated as seen even when the user does not claim a company, so repeated searches do not keep presenting the same untouched leads.

**How to apply:** Keep this filtering on the server with persistent per-user history; record only cards actually returned to the user, not parser results beyond the response limit.