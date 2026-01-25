# TASK-021: Store Backend Core
# FileName: TASK-021_Store_Backend_Core.md

**Priority:** High
**Category:** Store/Backend
**Estimated Effort:** Large
**Dependencies:** None
**Status:** To Do

---

## Overview

Build the store backend core for public listing, metadata delivery, and
signed artifacts.

**Goals:**
- Public API for listing and metadata.
- Signed `metadata.json` with ed25519.
- Download endpoints for plugin ZIP.

---

## Architecture

```
store/db/
  schema.ts
store/services/
  pluginService.ts
  signingService.ts
store/server/routes/
  publicRoutes.ts
```

---

## Sub-Tasks

### TASK-021-01_Store_DB_schema

**Status:** To Do

Tables (example):
- `plugins` (name, owner_id, created_at)
- `plugin_versions` (plugin_id, version, metadata, checksum, scan_status)
- `revocations` (plugin_id, version, reason, created_at)

---

### TASK-021-02_Public_API_endpoints

**Status:** To Do

- `GET /plugins`
- `GET /plugins/:name`
- `GET /plugins/:name/versions/:version/metadata`
- `GET /plugins/:name/versions/:version/metadata.sig`
- `GET /plugins/:name/versions/:version/download`
- `GET /revocations.json`

---

### TASK-021-03_Metadata_signing

**Status:** To Do

- Canonicalize JSON before signing.
- Use ed25519 for detached signatures.

Example:

```ts
const payload = canonicalizeJson(metadata);
const signature = signEd25519(payload, privateKey);
```

---

## Testing Requirements

- [ ] Metadata signatures validate with public key.
- [ ] Revocations endpoint returns active revocations.
- [ ] Download endpoint streams ZIP correctly.

---

## Documentation Updates Required

- `_docs/STORE_SPEC.md` (API details and signing notes).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-store-backend-core.md`
- Notes: store public API and signing.

---

## Additional Docs

- `_docs/ARCHITECTURE.md`
