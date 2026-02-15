# Filename: 204-2026-02-15-security-hardening-and-settings-ux.md

# 204. Security Hardening and Settings UX

**Date:** 2026-02-15  
**Version:** 0.1.0  
**Tasks:** TASK-020-11-01, TASK-020-11-02, TASK-020-11-03, TASK-020-11-04, TASK-020-11-05, TASK-020-11-06

## Key Changes

### Core / Security
- Added rate-limit buckets for auth, admin (read/write), public (read/write), and assistant traffic.
- Added smarter rate-limit keying (userId when authenticated, IP + User-Agent + identifier when anonymous).
- Added reCAPTCHA v3 bot protection for login/reset and public form submissions.
- Added optional password pepper support for argon2 hashing.
- Added email encryption at rest (HMAC hash + AES-GCM payload columns).

### Admin / UI
- Expanded Security Settings UI with tabs, presets, and reCAPTCHA controls.
- Added validation/error states for security inputs.

### Database
- Added `email_hash` and `email_encrypted` fields on `users` with a unique index.

### Docs
- Updated Security Spec, Settings matrix, and CMS API notes for new protections.
