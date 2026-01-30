# 079 - Security middleware and settings

**Date:** 2026-01-30  
**Version:** 0.1.0  
**Tasks:** TASK-020, TASK-020-01, TASK-020-02, TASK-020-03, TASK-020-04, TASK-020-05, TASK-020-06, TASK-020-07, TASK-020-08, TASK-020-09

## Key Changes

### Core/Security
- Added DB-backed security settings model with runtime cache and validation.
- Implemented request ID context, CSRF enforcement, CORS allowlist, rate limiting, and security headers.
- Added AJV-based payload validator and wired it into the HTTP server pipeline.

### Admin/UI
- Wired Security Settings page to `/settings/security` with full request pipeline configuration.
- Added UI helpers for list/number parsing and updated security settings UI tests.

### Tests
- Added unit tests for CSRF, rate limiting, request IDs, security settings, and validation.
- Added integration tests for CORS and security headers helpers.

### Docs
- Updated `_docs/SECURITY_SPEC.md`, `_docs/CMS_API.md`, and `_docs/ARCHITECTURE.md`.
