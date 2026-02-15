# TASK-020-11-06: PII (Email) Encryption Decision + Implementation
# FileName: TASK-020-11-06_PII_Email_Encryption.md

**Priority:** Medium  
**Category:** Core/Security + Data Model  
**Estimated Effort:** Large  
**Dependencies:** TASK-020-11-02  
**Status:** To Do  

---

## Overview

Implement email encryption at rest while preserving login by email and uniqueness using hash + encrypted columns.

---

## Decisions

- Use separate keys for hashing and encryption.

## Recommended Approach

Use **HMAC hash for lookup** and **AES-256-GCM encryption for display**.
- Store `email_hash` (HMAC-SHA256 of normalized email, keyed).
- Store `email_encrypted` (AES-256-GCM with random IV).
- Query by `email_hash`, never by plaintext.

---


## Env Keys

- `PII_HASH_KEY` (HMAC key for `email_hash`)
- `PII_ENC_KEY` (AES-256-GCM key for `email_encrypted`)

Add these to `.env.example` with comments.


## Pseudocode

```ts
// on write
const normalized = normalizeEmail(email);
const emailHash = hmacSha256(normalized, HASH_KEY);
const emailEncrypted = encryptAesGcm(normalized, ENC_KEY);

// on lookup
SELECT * FROM users WHERE email_hash = hmacSha256(input, HASH_KEY);
```

---

## Implementation Checklist

| File | Action |
| --- | --- |
| `core/db/schema.ts` | Add columns `email_hash`, `email_encrypted` |
| `core/services/users/*` | Write/read encryption helpers |
| `core/services/auth/*` | Use hash for lookup |
| `tests/unit/security/*` | Validate hashing + encryption consistency |
| `migrations/*` | Backfill hashes for existing users |

---

## Open Questions

1. Should we add a migration to backfill existing users?

---

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/DATA_MODEL.md`
