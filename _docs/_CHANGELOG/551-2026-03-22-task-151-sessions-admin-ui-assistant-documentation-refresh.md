# 551. TASK-151 sessions admin UI assistant documentation refresh

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-151

## Key Changes

### Assistant Docs
- Split Sessions out of the broader Security Settings assistant coverage by
  adding `docs/screens/sessions.md`.
- Rewrote the route guidance against the shipped UI instead of leaving it as a
  sub-section inside the broader security article.
- Documented the real route workflow: active sessions table, current-session
  marker, revoke controls, revoke-all action, and security follow-up guidance.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/settings/security/sessions` now maps
  to `docs/screens/sessions.md`.
- Left `/settings/security` and `/settings/security/login-alerts` on the
  broader security settings doc for now.

### Validation
- Completed:
  - authenticated CDP walkthrough of local `/admin/settings/security/sessions`
  - sessions page shell and active-session view
  - source verification against local Sessions modules
- No automated lint or test commands were run because this was a docs-only
  change.
