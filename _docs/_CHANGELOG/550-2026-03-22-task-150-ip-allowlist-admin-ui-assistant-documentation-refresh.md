# 550. TASK-150 ip allowlist admin UI assistant documentation refresh

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-150

## Key Changes

### Assistant Docs
- Split IP Allowlist out of the broader Security Settings assistant coverage by
  adding `docs/screens/ip-allowlist.md`.
- Rewrote the route guidance against the shipped UI instead of leaving it as a
  sub-bullet inside the broader security article.
- Documented the real route workflow: active restrictions table, empty state,
  propagation note, CIDR entry flow, and add-range drawer.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/settings/security/ip-allowlist` now
  maps to `docs/screens/ip-allowlist.md`.
- Left `/settings/security`, `/settings/security/sessions`, and
  `/settings/security/login-alerts` on the broader security settings doc for
  now.

### Validation
- Completed:
  - authenticated CDP walkthrough of local `/admin/settings/security/ip-allowlist`
  - route shell and add-range drawer capture
  - source verification against local IP allowlist modules
- No automated lint or test commands were run because this was a docs-only
  change.
