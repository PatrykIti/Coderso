# Filename: 004-2026-01-25-auth-rbac-admin-api.md

# 4. Auth, RBAC, and Admin API Base

**Date:** 2026-01-25  
**Version:** 0.1.0  
**Tasks:** TASK-004

## 🚀 Key Changes

### Core/Auth
- Added password hashing helpers (argon2id).
- Added session service with token hashing and cookie options.
- Added user and role services for lookup and permissions.

### Core/Server
- Added auth and RBAC middleware.
- Added auth routes for login/logout/me.
- Added base router and API error handler.
- Added auth request schemas.

### Tests
- Added unit tests for password hashing, sessions, and RBAC helpers.
