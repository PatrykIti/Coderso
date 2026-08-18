# 1296 - TASK-574 Popup Runtime Start Stop Generation Guard

**Date:** 2026-08-18
**Version:** Unreleased
**Tasks:** TASK-574

## Key Changes

### Popups (Runtime)
- The popup runtime keeps the existing early `started` guard, the
  `shouldShowPopup` frequency-gate filter, and the fire-time recheck callback,
  and adds ONLY a generation token plus a stale check around the existing
  arming loop: repeated `start()`/`stop()` cycles (watchdog restarts, session
  storage clears, editor save cycles) can no longer arm duplicate timers or
  mount multiple dialogs.
- The generation guard preserves `session_once` semantics: after
  sessionStorage is cleared the popup returns as exactly one dialog, never a
  fan-out of watchers.

## Validation
- `bun --cwd core lint` + `lint:types` green; popup runtime tests (start/
  stop/restart cycles, generation staleness, session-once reset) green.
- Runtime smoke (`wf574smoke`): create + publish popup through the admin
  editor; public front shows the dialog only after the configured delay;
  close dismisses for the session; after sessionStorage clear the popup
  returns as exactly 1 dialog (generation guard). Screenshots in
  `_docs/_workflows/_smoke/evidence/task-574/wf574smoke/`.
