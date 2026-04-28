# 080 - Plugin safe mode in security settings

**Date:** 2026-01-30  
**Version:** 0.1.0  
**Tasks:** TASK-020

## Key Changes

### Core/Plugins
- Added DB-backed safe mode toggle to skip runtime plugin loading.
- Safe mode can still be forced via `PLUGINS_SAFE_MODE` environment override.

### Admin/UI
- Added Plugin Safety section to Security Settings for toggling safe mode.

### Tests
- Extended security settings tests to include plugin safe mode state.
- Added integration coverage for safe mode via settings (DB-backed).

### Docs
- Updated `_docs/SECURITY_SPEC.md` and `_docs/CMS_API.md` with the new setting.
