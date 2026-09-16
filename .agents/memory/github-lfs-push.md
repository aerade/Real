---
name: GitHub LFS push limitation
description: Full Git pushes can fail in this environment when the branch contains Windows build artifacts tracked through Git LFS.
---

When a full push fails with `LFS: Not Implemented`, publish only the required small source-file changes through the GitHub Contents API instead of retrying the same push.

**Why:** The workspace can access the GitHub repository but cannot upload its LFS objects, while source-only Contents API commits still update the deployment branch.

**How to apply:** Keep installer binaries out of the emergency API fix; update only the relevant source files, then pull and rebuild on the VPS.