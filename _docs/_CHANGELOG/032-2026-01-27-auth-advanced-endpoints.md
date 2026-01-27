# Filename: 032-2026-01-27-auth-advanced-endpoints.md

# 32. Auth advanced endpoints (CSRF/OTP/Reset)

**Date:** 2026-01-27  
**Version:** 0.1.0  
**Tasks:** TASK-004-02

## Key Changes

### Auth API
- Added CSRF token endpoint and session CSRF storage.
- Added password reset flow (request + confirm) with one-time tokens.
- Added MFA verify endpoint stub (returns `mfa_not_configured` for now).

### Data Model
- Added `password_resets` table and session `csrf_token_hash`.
- Added indexes for reset tokens and CSRF lookup.

### Testing
- Added route registration tests and password reset service test.
