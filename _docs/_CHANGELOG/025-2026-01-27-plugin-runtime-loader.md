# Changelog: Plugin Runtime Loader and Registry

Date: 2026-01-27
Task: TASK-015

## Summary
- Added plugin registry tables (`plugins`, `plugin_settings`) with error tracking.
- Implemented runtime loader with manifest validation, compatibility checks, and ESM imports.
- Added safe mode, error recording with auto-disable threshold, and watchdog helper.
- Exposed plugin asset mapping helpers and static asset handler.
- Added admin error boundary for plugin UI failures.
- Added unit + integration tests for compatibility, loader, registry, safe mode, auto-disable, and assets.

## Notes
- Default safe mode flag: `PLUGINS_SAFE_MODE=1`.
- Error threshold env: `PLUGIN_ERROR_THRESHOLD` (default 3).
- Watchdog env: `PLUGIN_TIMEOUT_MS` (default 5000ms).
