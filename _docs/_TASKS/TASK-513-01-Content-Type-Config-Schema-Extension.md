# TASK-513-01: Content-Type `config` Schema Extension (DB + Service + Validation + Client)

# FileName: TASK-513-01-Content-Type-Config-Schema-Extension.md

**Parent Task:** TASK-513
**Priority:** High
**Category:** Content (Engine) / DB Migration / Service Contract / Validation
**Estimated Effort:** Medium
**Dependencies:** none (foundation — lands FIRST)
**Status:** ✅ Done
**Completed:** 2026-07-06

---

## Scope (single-writer)

**513-01 is the SOLE WRITER of:**
- `core/db/schema.ts` (the `contentTypes` table block, lines ~684-692)
- `core/db/migrations/00NN_*.sql` + `core/db/migrations/meta/00NN_snapshot.json` +
  `core/db/migrations/meta/_journal.json` (the **next free idx** produced by `db:generate` —
  currently **67**, since idx 66 = `0066_dashboard_layouts` is already staged on this branch; do
  NOT hardcode — if another migration lands first, `db:generate` auto-increments past it) —
  generated, not hand-edited. 513-01 owns ONLY its own `00NN` artifacts (it does NOT touch
  `0066_dashboard_layouts.*`, which belongs to the sibling TASK-480 migration).
- `core/services/content/contentTypeConfig.ts` (**new** — db/Bun-free module: `normalizeContentTypeConfig`,
  `CONFIG_KEYS`, `CAP_KEYS`, `isRecord`, `ContentTypeConfig`/`ContentTypePermissionCapabilities` types)
- `core/services/content/typeService.ts`
- `core/server/validation/contentSchemas.ts`
- `core/admin/services/contentTypesClient.ts` (types + payloads only)

It ships the **content-type-level `config`** column and its full normalize / reject-unknown /
round-trip path. **Nothing renders `config` yet** — the Type-settings card (513-03) and
Permissions panel (513-04) consume it. This subtask makes ZERO edits to any `ui/content-types/*`
component or `schemaMapping.ts`.

**Land order (strict):** 513-01 (this) → 513-02 → 513-04 → 513-03 → 513-05 → 513-06.

---

## Security Contract

**Schema-first, additive, reject-unknown; extends the existing validated write envelope — no new
endpoint / RBAC bucket / HTTP method.** `config` rides `POST /content-types` (`content:write`) and
`PATCH /content-types/:id` (`content:write`) via `contentTypeCreateSchema` /
`contentTypeUpdateSchema` (both `additionalProperties:false`). The request schema gains a typed
`config` object with a **closed** property set; the *authoritative* normalization is
`normalizeContentTypeConfig` (defined in the db-free `contentTypeConfig.ts` module, §2, and applied
server-side by `typeService` on every write — client input is never trusted):
- Unknown top-level config key OR unknown per-role capability key ⇒ throw
  `content_type_config_invalid` → mapped to `ApiError(..., 400)` in `contentTypeRoutes`.
- Bad scalar value (wrong type) ⇒ **fail-soft omit** (never persisted raw).
- Present-only: keys at resolved default (`draftsEnabled=true`, `versioning=false`) and empty
  strings are dropped so a default type persists `config = {}` (legacy rows read byte-unchanged).
- The migration is additive with `DEFAULT '{}'::jsonb` — existing rows are safe; no backfill DDL
  beyond the default.
- **Read trap note:** the stored-read path returns `config` verbatim from the column (already
  normalized on write); no fail-open widening. Duplicate copies `config` through the same
  normalizer.

---

## What this subtask ships (anchors verified 2026-07-05)

### 1. DB column (`core/db/schema.ts`)
Add to the `contentTypes` pgTable:
```ts
config: jsonb("config").notNull().default({}),
```
(place after `status`:689, before `createdAt`:690 — the real `contentTypes` pgTable is at
schema.ts:684-692). Confirm `jsonb` is already imported (it is — used by `schema` in the same
table). Generate migration: `bun run db:generate` ⇒ `00NN_<name>.sql` (next free idx, currently
**67** — do NOT hardcode 66; that tag is taken by `0066_dashboard_layouts`)
(`ALTER TABLE "content_types" ADD COLUMN "config" jsonb DEFAULT '{}'::jsonb NOT NULL;`) +
`meta/00NN_snapshot.json` + `_journal.json` entry (idx 67). Run `bun run db:migrate` against the
local TEST DB to verify apply. **Land-order dependency:** because the idx is auto-assigned, 513-01
must land its migration before any later 513 subtask (per the strict land order below) and rebase
if a non-513 migration lands 67 first.

### 2. Config type + normalizer (`core/services/content/contentTypeConfig.ts` — new db-free module)
The normalizer and its allowlist constants live in a **new, db/Bun-free module** —
`core/services/content/contentTypeConfig.ts` — NOT in `typeService.ts`. Rationale: `typeService.ts`
does `import { db } from "../../db/client"` (line 2), and `db/client.ts` throws when
`DATABASE_URL` is unset and instantiates a `postgres` pool at module load. Importing the normalizer
from `typeService.ts` into the Vitest pure lane would drag in `db/client`/`postgres` and break the
Bun-free boundary (the same reason the resolve helpers are relocated to `contentTypesClient.ts`).
By defining `normalizeContentTypeConfig` + `CONFIG_KEYS`/`CAP_KEYS`/`isRecord` + the
`ContentTypeConfig`/`ContentTypePermissionCapabilities` types in this pure module, both
`typeService.ts` (server) and the Vitest pure-lane test import it with no db pull-in.
`typeService.ts` re-exports the types (`export type { ContentTypeConfig, ... } from "./contentTypeConfig"`)
and imports `normalizeContentTypeConfig` from it. `isRecord` — if a shared util already exists, reuse
it; otherwise define locally here.
```ts
export type ContentTypePermissionCapabilities = {
  read?: boolean; create?: boolean; update?: boolean; delete?: boolean; publish?: boolean;
};
export type ContentTypeConfig = {
  singularName?: string;
  pluralName?: string;
  draftsEnabled?: boolean;   // resolved default true
  versioning?: boolean;      // resolved default false
  permissions?: Record<string, ContentTypePermissionCapabilities>;
};

const CONFIG_KEYS = new Set(["singularName","pluralName","draftsEnabled","versioning","permissions"]);
const CAP_KEYS = new Set(["read","create","update","delete","publish"]);
const MAX_NAME = 120;
const MAX_ROLES = 50;

export function normalizeContentTypeConfig(input: unknown): ContentTypeConfig {
  if (input === undefined || input === null) return {};
  if (!isRecord(input)) throw new Error("content_type_config_invalid");
  for (const key of Object.keys(input)) {
    if (!CONFIG_KEYS.has(key)) throw new Error("content_type_config_invalid"); // reject-unknown
  }
  const out: ContentTypeConfig = {};
  // strings: trim, drop empty, cap length (fail-soft on non-string)
  const s = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, MAX_NAME) : "");
  const sn = s(input.singularName); if (sn) out.singularName = sn;
  const pn = s(input.pluralName);   if (pn) out.pluralName = pn;
  // booleans: present-only, DROP when at resolved default
  if (typeof input.draftsEnabled === "boolean" && input.draftsEnabled === false) out.draftsEnabled = false;
  if (typeof input.versioning === "boolean" && input.versioning === true) out.versioning = true;
  // permissions: reject unknown cap keys; keep only true caps; drop empty role entries
  if (input.permissions !== undefined) {
    if (!isRecord(input.permissions)) throw new Error("content_type_config_invalid");
    const roleKeys = Object.keys(input.permissions);
    if (roleKeys.length > MAX_ROLES) throw new Error("content_type_config_invalid");
    const perms: Record<string, ContentTypePermissionCapabilities> = {};
    for (const role of roleKeys) {
      const caps = input.permissions[role];
      if (!isRecord(caps)) throw new Error("content_type_config_invalid");
      for (const capKey of Object.keys(caps)) {
        if (!CAP_KEYS.has(capKey)) throw new Error("content_type_config_invalid");
      }
      const kept: ContentTypePermissionCapabilities = {};
      for (const cap of CAP_KEYS) if (caps[cap] === true) kept[cap as keyof ...] = true;
      if (Object.keys(kept).length) perms[role] = kept;
    }
    if (Object.keys(perms).length) out.permissions = perms;
  }
  return out;
}
```
Resolved-default helpers: `resolveDraftsEnabled(cfg) => cfg.draftsEnabled ?? true`,
`resolveVersioning(cfg) => cfg.versioning ?? false`. These are **pure, Bun/db-free** functions.
`typeService.ts` is **server-only** (`import { db } from "../../db/client"`), so the admin UI CANNOT
import from it (that would drag drizzle/db server code into the client bundle — boundary break).
Therefore these two helpers are **canonically defined and exported from the client-side file
`core/admin/services/contentTypesClient.ts`** (§5 below) so the UI (513-03) imports them from
`@/services/contentTypesClient`. `typeService.ts` may keep its own identical copies for server-side
resolution, but the **UI-consumed source is `contentTypesClient.ts`** — the consumer (513-03) must
never reach into `typeService`.

### 3. Wire into create/update/duplicate (`typeService.ts`)
- `CreateContentTypeInput` / `UpdateContentTypeInput` gain `config?: ContentTypeConfig`.
- `createContentType`: `config: normalizeContentTypeConfig(input.config)` in the insert `.values`.
- `updateContentType`: compute `const config = input.config !== undefined ?
  normalizeContentTypeConfig(input.config) : undefined;` and include in `.set` (drizzle skips
  `undefined`). Do NOT normalize when the caller omits `config` (partial PATCH must not wipe it).
- `duplicateContentType`: carry the source config into the new row via
  `config: source.config as ContentTypeConfig`. **Why the cast:** the jsonb column carries no
  `.$type<>()` (neither `schema` nor the new `config` column use it — confirmed in `schema.ts`),
  so drizzle infers `contentTypes.$inferSelect.config` as `unknown`; passing bare `source.config`
  (unknown) into `createContentType`'s `config?: ContentTypeConfig` param yields TS2322 and breaks
  the root `tsc -p tsconfig.json --noEmit` gate. Mirror the existing `source.schema as ContentSchema`
  cast on the adjacent line (typeService.ts:265). The value is re-normalized inside
  `createContentType` (`normalizeContentTypeConfig(input.config)`), so the cast is safe — no
  fail-open widening. Do NOT add `.$type<ContentTypeConfig>()` to the column instead: it would force
  `schema.ts` to import `ContentTypeConfig` from `typeService.ts`, creating a schema→service import
  cycle.
- `listContentTypes` select: add `config: contentTypes.config` and add `contentTypes.config` to
  the `groupBy` list (it uses an aggregate `count`). The selected `config` field is inferred
  `unknown` (no `.$type<>()` — see duplicate note above); this needs NO extra server-side typing
  because the list crosses the wire and the client re-asserts the shape via the
  `apiRequest<ContentTypeSummary[]>` generic (`ContentTypeSummary.config?: ContentTypeConfig`, §5).
  Server callers of `listContentTypes` do not read `.config` directly. `getContentType`/
  `getContentTypeBySlug` use `select()` (all columns) — already include `config`, no change.

### 4. Request validation (`contentSchemas.ts`)
Add a shared `contentTypeConfigSchema` fragment and reference it in create + update:
```ts
const contentTypeConfigSchema = {
  type: "object",
  properties: {
    singularName: { type: "string" },
    pluralName: { type: "string" },
    draftsEnabled: { type: "boolean" },
    versioning: { type: "boolean" },
    permissions: {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          read: { type: "boolean" }, create: { type: "boolean" },
          update: { type: "boolean" }, delete: { type: "boolean" }, publish: { type: "boolean" },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};
```
Add `config: contentTypeConfigSchema` to `contentTypeCreateSchema.properties` and
`contentTypeUpdateSchema.properties` (config stays optional; not in `required`). The JSON-Schema
layer is a coarse gate; `normalizeContentTypeConfig` is the authoritative allowlist (defense in
depth). `contentTypeRoutes.ts` needs the new error case — add `"content_type_config_invalid"` to
the `mapContentTypeError` 400 switch group (route file is NOT owned here; the mapping addition is
a 1-line switch case — **flag to orchestrator**: `contentTypeRoutes.ts` must gain this case;
scope it to 513-01 as a caveat single-line edit or hand to 513-06 — see Coordination).

### 5. Client types + resolve helpers (`contentTypesClient.ts`)
- Add `ContentTypeConfig` + `ContentTypePermissionCapabilities` exported types (mirror service).
  **Coordination — single-source for the permissions matrix:** `ContentTypePermissionCapabilities`
  (`{ read?; create?; update?; delete?; publish?: boolean }`) and
  `ContentTypeConfig["permissions"]` (`Record<string, ContentTypePermissionCapabilities>`) are the
  authoritative per-role matrix shape. 513-04 must ALIAS these (`RoleCapabilities =
  ContentTypePermissionCapabilities`; `PermissionsMatrix =
  NonNullable<ContentTypeConfig["permissions"]>`) rather than re-declare an independent
  `Partial<Record<Capability, boolean>>`, because 513-03 §6 passes `config.permissions` straight
  into `<ContentTypePermissionsPanel permissions=… />`. Keep this cap set in sync with the server
  `CAP_KEYS` allowlist (§2) and 513-04's `CAPABILITIES` const if it ever changes.
- **Export the resolved-default helpers here** (pure, no db/Bun import) as the client-importable
  source consumed by 513-03:
  ```ts
  export function resolveDraftsEnabled(cfg: ContentTypeConfig | undefined): boolean {
    return cfg?.draftsEnabled ?? true;
  }
  export function resolveVersioning(cfg: ContentTypeConfig | undefined): boolean {
    return cfg?.versioning ?? false;
  }
  ```
  Consumers import via `import { resolveDraftsEnabled, resolveVersioning } from "@/services/contentTypesClient"`.
- `ContentTypeSummary` gains `config?: ContentTypeConfig` (optional — legacy cache entries may
  lack it; `isContentType` stays loose, no tightening needed).
- `ContentTypePayload` gains `config?: ContentTypeConfig`.
- `updateContentType(id, payload)` / `createContentType(payload)` already `JSON.stringify(payload)`
  — pass `config` through unchanged. No cache-shape change (config lives inside the summary
  already cached/broadcast). Confirm `cachePolicy` needs no new key (it does not — config is part
  of the content-type detail/list payloads).

---

## Coordination caveat (route error mapping)

`core/server/routes/contentTypeRoutes.ts` `mapContentTypeError` must map
`content_type_config_invalid` → 400. This is a single switch-case line in a file NOT otherwise
owned by 513. **Decision:** 513-01 owns this one-line addition (it is inseparable from the error
it introduces); note it explicitly in the closure so 513-06/other tasks do not double-edit.
Everything else in `contentTypeRoutes.ts` is untouched.

---

## Testing requirements (lanes + shared-DB safety)

**Bun runtime lane** (`tests/bun/**` or existing content-type service test):
- `normalizeContentTypeConfig`: reject-unknown top-level key throws; reject-unknown cap key throws;
  non-record permissions throws; `>50` roles throws.
- Present-only: default input (`draftsEnabled:true, versioning:false`, empty names) ⇒ `{}`.
- create → read round-trip: `config` with singular/plural/versioning:true/one role persists and
  reads back byte-identical (drop-defaults applied).
- PATCH without `config` preserves existing config (no wipe); PATCH with `config:{}` clears to `{}`.
- duplicate copies config.
- migration: assert the column exists / a create with config succeeds against the migrated TEST DB.
- Each test creates a unique-slug type and deletes it (shared-DB safety).

**Vitest pure lane** (`tests/vitest/**` — Bun/db-free): `normalizeContentTypeConfig` table-driven
cases, importing from the db-free `core/services/content/contentTypeConfig.ts` module (§2) — NOT
from `typeService.ts` (which pulls `db/client`/`postgres` and would break the Vitest lane). This is
why the normalizer is relocated to that pure module. Also cover the resolve helpers
(`resolveDraftsEnabled`/`resolveVersioning` from `contentTypesClient.ts`) here.

**Gates**: `bun --cwd core lint:types` + root `tsc -p tsconfig.json --noEmit` (client type change
ripples into UI tests later; run root tsc), `lint`.

---

## UI/UX-fidelity & max-config-flexibility notes

Backend-only subtask. Flexibility: `config` is an open jsonb column so future content-type-level
settings need no new migration; the normalizer is the single allowlist gate. `permissions` uses
`additionalProperties` role keys (any role slug) for maximum flexibility while capping count.
