# 643. Trivy scanner source scope

**Date:** 2026-04-14
**Version:** 0.1.0
**Tasks:** TASK-174

## Key Changes

### Security Tooling
- Updated the local Trivy wrapper to mirror non-runtime path exclusions from `.semgrep.yml`: `_docs`, `node_modules`, `dist`, `build`, and `.next`.
- `_docs/` contains documentation, reference fixtures, and vendored UI snapshots rather than runtime dependency surfaces; the other excluded paths are generated dependency/build output.
- Recorded scanner-scope owner, reason, review date, and ticket context in `_docs/SECURITY_SPEC.md`.
- Kept Semgrep and Gitleaks scope unchanged.

### Validation
- Ran:
  - `bun -e "const pkg = await Bun.file('package.json').json(); console.log(pkg.scripts['scan:trivy'])"`
  - `bun run scan:trivy`
  - `git diff --check`
- Result:
  - Trivy now scans `bun.lock` only for the current repo scope after matching non-runtime path exclusions.
  - Remaining findings are runtime dependency findings in `bun.lock` and should be handled by dependency/security remediation, not by docs/build-output exclusions.
