# TASK-023: Store Auth and Publisher Accounts
# FileName: TASK-023_Store_Auth_and_Publisher_Accounts.md

**Priority:** Medium
**Category:** Store/Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-021
**Status:** To Do

---

## Overview

Implement store-side accounts and publish tokens for plugin authors.

**Goals:**
- Publisher accounts and roles.
- Scoped publish tokens per plugin.
- Optional 2FA enforcement for publishers.

---

## Architecture

```
store/db/
  schema.ts
store/services/
  authService.ts
  tokenService.ts
store/server/routes/
  authRoutes.ts

store/tests/unit/
  tokenService.test.ts
```

## Commands (if needed)

```bash
# store
bun add @node-rs/argon2 otplib
```

---

## Sub-Tasks

### TASK-023-01_Publisher_accounts

**Status:** To Do

- Users with roles: author, maintainer, admin.
- Password hashing and reset flow.
- Use argon2id for password hashes.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `store/db/schema.ts` | users + roles |
| `store/services/authService.ts` | login + roles |

Auth sketch:

```ts
export async function login(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!verifyPassword(user.passwordHash, password)) throw new Error("invalid");
  return createSession(user.id);
}
```

---

### TASK-023-02_Publish_tokens

**Status:** To Do

- Token scoped to plugin name.
- Rotation and revoke.
- Store only token hash in DB.

Example token payload:

```json
{
  "plugin": "seo-boost",
  "scopes": ["publish"],
  "expiresAt": "2026-01-01T00:00:00Z"
}
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `store/services/tokenService.ts` | create/revoke tokens |
| `store/server/routes/authRoutes.ts` | token endpoints |

Token sketch:

```ts
export async function createToken(pluginName: string) {
  const raw = randomToken();
  await saveTokenHash(hash(raw), pluginName);
  return raw;
}
```

Route sketch:

```ts
router.post("/tokens", requireRole("maintainer"), async (req) => {
  const token = await createToken(req.body.plugin);
  return json({ token });
});
```

---

### TASK-023-03_2FA_requirements

**Status:** To Do

- Enforce 2FA for author/maintainer roles.
- Store 2FA enrollment status.
- Use TOTP (RFC 6238) for v1.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `store/services/authService.ts` | 2FA enforcement |

2FA sketch:

```ts
if (user.requires2fa && !verifyTotp(code, user.totpSecret)) {
  throw new Error("2fa_required");
}
```

---

## Testing Requirements

- [ ] `store/tests/unit/tokenService.test.ts` verifies scope.
- [ ] `store/tests/integration/auth.test.ts` blocks publish without 2FA.
- [ ] `store/tests/integration/auth.test.ts` rejects invalid token hash.

---

## New Files to Create

- `store/services/authService.ts`
- `store/services/tokenService.ts`
- `store/server/routes/authRoutes.ts`
- `store/tests/unit/tokenService.test.ts`
- `store/tests/integration/auth.test.ts`

---

## Documentation Updates Required

- `_docs/STORE_SPEC.md` (auth and tokens).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-store-auth-and-tokens.md`
- Notes: store auth and publisher tokens.

---

## Additional Docs

- `_docs/SECURITY_SPEC.md`
