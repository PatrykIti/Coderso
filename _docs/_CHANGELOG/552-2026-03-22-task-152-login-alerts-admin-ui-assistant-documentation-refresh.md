# 552. TASK-152 login alerts admin UI assistant documentation refresh

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-152

## Key Changes

### Assistant Docs
- Split Login Alerts out of the broader Security Settings assistant coverage by
  adding `docs/screens/login-alerts.md`.
- Rewrote the route guidance against the shipped UI instead of leaving it as a
  sub-section inside the broader security article.
- Documented the real route workflow: suspicious-login toggles, brute-force
  threshold, recipients, notification channels, and save/discard flow.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/settings/security/login-alerts` now
  maps to `docs/screens/login-alerts.md`.
- Left `/settings/security` on the broader security settings doc.

### Validation
- Completed:
  - authenticated CDP walkthrough of local `/admin/settings/security/login-alerts`
  - page shell and alert-policy sections
  - source verification against local Login Alerts modules
- No automated lint or test commands were run because this was a docs-only
  change.
