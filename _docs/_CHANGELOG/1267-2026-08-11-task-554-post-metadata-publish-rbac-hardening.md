# 1267 - TASK-554 Post Metadata Publish RBAC Hardening

**Date:** 2026-08-11
**Version:** Unreleased
**Tasks:** TASK-554

## Key Changes

- Required `content:publish` together with `content:write` for Post metadata publication fields while preserving present-only writer metadata updates.
- Added exact RFC3339 calendar validation, one-snapshot RBAC coverage, and race-safe Admin cache/editor hydration.
- Registered the shared `task-554` smoke suite with seven verified publication flows.
