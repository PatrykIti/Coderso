# 645. TASK-176-02 AES-GCM tag length hardening

**Date:** 2026-04-14
**Version:** 0.1.0
**Tasks:** TASK-176, TASK-176-02

## Key Changes

### Security
- Added explicit 16-byte AES-GCM authentication tag length to email and secret encryption/decryption helpers.
- Added fail-closed validation for malformed IV and authentication tag lengths before decrypting.
- Added tests for valid round trips, truncated auth tags, malformed auth tags, and malformed IVs.
- Resolved Semgrep `javascript.node-crypto.security.gcm-no-tag-length.gcm-no-tag-length` findings in:
  - `core/services/security/piiEmail.ts`
  - `core/services/security/secretStore.ts`

### Validation
- Ran:
  - `bun test tests/unit/security/secretStore.test.ts tests/unit/security/piiEmail.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - filtered Semgrep check confirming AES-GCM tag-length findings are resolved
