---
name: GitHub Git authentication
description: GitHub API access can be valid while Git over HTTPS rejects a Bearer header.
---

Git operations against the configured GitHub origin work with an HTTP Basic authorization header using the `x-access-token` username format; a Bearer header may return invalid credentials even when the same token works with the GitHub API.

**Why:** The workspace's default Git credential path and a direct Bearer header failed, while the repository API confirmed access and the Basic header successfully fetched and pushed `main`.

**How to apply:** Keep the token value in the workspace secret environment and construct the Basic header only inside the Git command; never print or persist the token.