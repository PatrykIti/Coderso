# TASK-004-03: Password Hashing and Sessions
# FileName: TASK-004-03_Password_hashing_and_sessions.md

**Priority:** High
**Category:** Core/Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-001
**Status:** Done (2026-01-27)

---

## Overview

Implementacja hashowania hasel i sesji. Zadanie zakonczone.

---

## Implementation Summary

Zaimplementowane w:
- `core/services/auth/password.ts` (argon2id, verify)
- `core/services/auth/sessionService.ts` (create/revoke/find sessions)
- `core/db/schema.ts` (tabele `sessions` i powiazania)

Zasady:
- Token sesji przechowywany jako hash (sha256) w DB.
- Cookie httpOnly + secure + sameSite=strict.
- TTL domyslnie 14 dni.

---

## Tests

- `tests/unit/auth/password.test.ts`
- `tests/unit/auth/sessionService.test.ts`

---

## Documentation Updates

- `_docs/AUTH_SPEC.md`
- `_docs/SECURITY_SPEC.md`

---

## Changelog Entry

- `_docs/_CHANGELOG/004-2026-01-25-auth-rbac-admin-api.md`
