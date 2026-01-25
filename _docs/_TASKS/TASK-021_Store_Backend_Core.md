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

store/tests/unit/
  signingService.test.ts
```

## Commands (if needed)

No new dependencies.

---

## Sub-Tasks

### TASK-021-01_Store_DB_schema

**Status:** To Do

Tables (example):
- `plugins` (name, owner_id, created_at)
- `plugin_versions` (plugin_id, version, metadata, checksum, scan_status)
- `revocations` (plugin_id, version, reason, created_at)

Rules:
- `plugins.name` unique.
- `plugin_versions` unique on `(plugin_id, version)`.
- Store `download_url` and `metadata_sig` for quick reads.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `store/db/schema.ts` | plugins, plugin_versions, revocations |
| `store/db/migrations/*` | migration files |

Schema sketch:

```ts
export const pluginVersions = pgTable("plugin_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  pluginId: uuid("plugin_id").notNull(),
  version: text("version").notNull(),
  metadata: jsonb("metadata").notNull(),
  checksum: text("checksum").notNull(),
  scanStatus: text("scan_status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

---

### TASK-021-02_Public_API_endpoints

**Status:** To Do

- `GET /plugins`
- `GET /plugins/:name`
- `GET /plugins/:name/versions/:version/metadata`
- `GET /plugins/:name/versions/:version/metadata.sig`
- `GET /plugins/:name/versions/:version/download`
- `GET /revocations.json`

Rules:
- Add cache headers for metadata (short TTL) and downloads (long TTL).
- `revocations.json` returns only active revocations.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `store/server/routes/publicRoutes.ts` | public routes |
| `store/services/pluginService.ts` | list + fetch |

Route sketch:

```ts
router.get("/plugins/:name", async (req) => {
  const plugin = await getPlugin(req.params.name);
  return json(plugin);
});
```

Download sketch:

```ts
router.get("/plugins/:name/versions/:version/download", async (req) => {
  return streamFile(getZipPath(req.params.name, req.params.version));
});
```

---

### TASK-021-03_Metadata_signing

**Status:** To Do

- Canonicalize JSON before signing.
- Use ed25519 for detached signatures.
- Store key id used to sign (`keyId`).

Example:

```ts
const payload = canonicalizeJson(metadata);
const signature = signEd25519(payload, privateKey);
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `store/services/signingService.ts` | signing helpers |

Signing sketch:

```ts
export function signMetadata(meta) {
  const payload = canonicalizeJson(meta);
  return signEd25519(payload, PRIVATE_KEY);
}
```

---

## Testing Requirements

- [ ] `store/tests/unit/signingService.test.ts` validates signatures.
- [ ] `store/tests/integration/publicRoutes.test.ts` validates endpoints.
- [ ] `store/tests/integration/publicRoutes.test.ts` returns cache headers.

---

## New Files to Create

- `store/db/schema.ts`
- `store/db/migrations/*`
- `store/services/pluginService.ts`
- `store/services/signingService.ts`
- `store/server/routes/publicRoutes.ts`
- `store/tests/unit/signingService.test.ts`
- `store/tests/integration/publicRoutes.test.ts`

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
