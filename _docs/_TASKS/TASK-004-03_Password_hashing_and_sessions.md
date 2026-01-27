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

## Implementation Details (reference)

**Password hashing (argon2id):**
- Algorytm: Argon2id.\n
- Wejscie: raw password (string).\n
- Wyjscie: string hash.\n
- Weryfikacja: `verify(hash, password)`.\n

**Session token:**
- Token generowany losowo (32 bajty).\n
- Hash tokenu: SHA-256 -> hex string.\n
- W DB przechowuj tylko `token_hash`.\n

**Cookie:**
- Name: `SESSION_COOKIE_NAME` (z `sessionService.ts`).\n
- `httpOnly: true`, `secure: true` (prod), `sameSite: "strict"`.\n
- `path: "/"`.\n

**Session revoke:**
- `revokeSessionByToken(token)` ustawia `revoked_at`.\n
- `revokeAllSessions(userId)` (przy reset password) usuwa / revokuje wszystkie.\n

---

## Reference Snippets

```ts
const token = crypto.randomUUID() + crypto.randomUUID();
const tokenHash = createHash("sha256").update(token).digest("hex");
```

```ts
await db.insert(sessions).values({
  userId,
  tokenHash,
  ip,
  userAgent,
  expiresAt,
});
```

---

## Tests (templates)

### `tests/unit/auth/password.test.ts`

```ts
const hash = await hashPassword("secret");
expect(await verifyPassword(hash, "secret")).toBe(true);
expect(await verifyPassword(hash, "wrong")).toBe(false);
```

### `tests/unit/auth/sessionService.test.ts`

```ts
const { token, session } = await createSession(...);
const lookup = await getSessionByToken(token);
expect(lookup?.id).toBe(session.id);
await revokeSessionByToken(token);
const revoked = await getSessionByToken(token);
expect(revoked).toBeNull();
```

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
