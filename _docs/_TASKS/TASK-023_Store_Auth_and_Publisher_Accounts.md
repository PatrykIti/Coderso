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
```

---

## Sub-Tasks

### TASK-023-01_Publisher_accounts

**Status:** To Do

- Users with roles: author, maintainer, admin.
- Password hashing and reset flow.

---

### TASK-023-02_Publish_tokens

**Status:** To Do

- Token scoped to plugin name.
- Rotation and revoke.

Example token payload:

```json
{
  "plugin": "seo-boost",
  "scopes": ["publish"],
  "expiresAt": "2026-01-01T00:00:00Z"
}
```

---

### TASK-023-03_2FA_requirements

**Status:** To Do

- Enforce 2FA for author/maintainer roles.
- Store 2FA enrollment status.

---

## Testing Requirements

- [ ] Token scope prevents publishing to other plugins.
- [ ] Revoked token is rejected.
- [ ] 2FA required for publish action when enabled.

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
