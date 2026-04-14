# 643. Trivy docs scan scope

**Date:** 2026-04-14
**Version:** 0.1.0
**Tasks:** TASK-174

## Key Changes

### Security Tooling
- Updated the local Trivy wrapper to skip `_docs/`, which contains documentation, reference fixtures, and vendored UI snapshots rather than runtime dependency surfaces.
- Recorded scanner-scope owner, reason, review date, and ticket context in `_docs/SECURITY_SPEC.md`.
- Kept Semgrep and Gitleaks scope unchanged.

### Validation
- Ran:
  - `bun -e "const pkg = await Bun.file('package.json').json(); console.log(pkg.scripts['scan:trivy'])"`
  - `git diff --check`
