# 649. TASK-176 scanner strict mode and closure

**Date:** 2026-04-14
**Version:** 0.1.0
**Tasks:** TASK-176, TASK-176-06

## Key Changes

### Security Tooling
- Added strict scanner scripts:
  - `scan:security:strict`
  - `scan:semgrep:strict`
  - `scan:trivy:strict`
  - `scan:gitleaks:strict`
- Strict mode fails on Semgrep blocking findings, Trivy HIGH/CRITICAL findings, or Gitleaks leaks.
- Documented strict scanner usage in `_docs/SECURITY_SPEC.md` and `_docs/CODERSO_RELEASE_GATES.md`.
- Recorded the single CORS Semgrep inline suppression with owner, reason, review date, and task id.
- Closed `TASK-176` after the scanner baseline reached Semgrep 0, Trivy 0, and Gitleaks clean.

### Validation
- Ran:
  - `bun run scan:security:strict`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/integration/routes/cors.test.ts`
