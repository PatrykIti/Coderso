# TASK-514-01: Entry Visibility — Schema, Migration, Service, Validation, Routes

# FileName: TASK-514-01-Entry-Visibility-Backend-Schema-Service-Routes.md

**Parent Task:** TASK-514
**Priority:** High
**Category:** Services / Content / Schema / Migration
**Estimated Effort:** Medium
**Dependencies:** none (foundation of TASK-514; 514-02..05 consume it)
**Status:** ⏳ To Do

---

## Overview

Backend keystone of TASK-514. The prototype entry editor's **Publish** card
exposes a **Visibility** control (Public / Private / Password protected) that has
no persisted home. This subtask adds it: one new enum column + one nullable
hashed-password column on `content_entries`, threaded through the entry service
types + reads + writes, added to the reject-unknown validation allowlist on the
**existing** metadata write path, and mapped in the metadata route. **No new
endpoint, no new RBAC bucket, no `schemaVersion` concept** (content_entries is a
plain table). Nothing renders here — 514-02 (client) + 514-04 (panel) consume it.

**Owned files (sole writer):**
- `core/db/schema.ts` — the `contentEntries` `pgTable` block (`:774-814`): two new
  columns.
- `core/db/migrations/<NNNN>_<slug>.sql` + `core/db/migrations/meta/<NNNN>_snapshot.json`
  + `core/db/migrations/meta/_journal.json` (append entry) — `<NNNN>` is the
  ACTUAL next-free number allocated by `bun run db:generate` AT LAND TIME, NOT a
  hard-pinned literal. Against the CURRENT tree the free number is `0067` (last is
  `0066_dashboard_layouts.sql`, journal `idx:66` — `0066` is ALREADY consumed by
  the staged dashboard_layouts migration), but do **not** commit that
  literal in isolation. **Cross-task coordination (mandatory):** `0066` is
  ALREADY taken by `dashboard_layouts`, so the next free slot is `0067` — and
  two sibling in-flight tasks BOTH currently target that SAME `0067` slot:
  TASK-512-01 (media schema) pins `0067_*` (SQL + `meta/0067_snapshot.json` +
  journal `idx:67` + its number-embedding test `media-schema-0067.test.ts`), and
  TASK-513-01 (content-type config) pins the "next free idx currently 67". So all
  three (512-01, 513-01, 514-01) contend for `0067` and will resolve to
  `0067`/`0068`/`0069` at land time. Only one can be `0067`. Therefore, whoever
  lands first (strict cross-task land order among 512-01/513-01/514-01) takes the
  then-free number, and each subsequent lander bumps to the next (`0068`, `0069`, …). The
  implementer MUST run `bun run db:generate` immediately before committing so the
  SQL filename, `<NNNN>_snapshot.json`, and the appended `_journal.json` entry all
  agree with whatever number is actually free at that moment; never hand-renumber
  or hand-pin. (Model on the TASK-487-style cross-task coordination note.)
- `core/services/content/entryService.ts` — types (`EntryDetail`, `EntryListItem`,
  `UpdateEntryMetadataInput`, `CreateEntryInput`), `entryListSelection` +
  `EntryListSelectionRow` + `mapEntryListSelectionRow` (`:435-494`), `getEntry`
  read map (`:602-664`), **`listEntriesWithContentTypes` (`:542-600`) — its OWN
  inline selection object (`:544-564`) + its OWN inline row mapper (`:570-599`);
  it does NOT reuse `entryListSelection`/`mapEntryListSelectionRow`, so it must be
  patched separately (see §3)**, `getEntryBySlug` (`:670-676`) — narrow its
  `db.select()` to an explicit projection that OMITS `access_password` (see Security
  Contract), `publishEntry` (`:816-856`) + `unpublishEntry` (`:858-882`) — narrow
  their `.returning()` (`:830-839` / `:859-868`) to an explicit projection that OMITS
  `access_password` (see Security Contract), `createEntry` (`:678`),
  `duplicateEntry` (`:702`), `updateEntryMetadata` (`:884-960`).
- `core/server/validation/contentSchemas.ts` — `contentEntryMetadataSchema`
  (`:74-111`) + `contentEntryCreateSchema` (`:39-48`).
- `core/server/routes/contentEntryRoutes.ts` — the metadata route body type +
  call (`:231-289`) and create route (`:189-203`).

**Do NOT** edit the admin client (514-02), any admin UI (514-03/04/05), README,
changelog, or any other task file.

---

## Security Contract

**Additive column on an existing table, threaded through the EXISTING validated
`content:write` metadata write path — no new route, RBAC bucket, endpoint, or
auth path; a stored secret (access password) that MUST never leave the server.**

Verified (Read + `grep -an`):

- **Route (existing).** `router.patch("/content/:type/entries/:id/metadata",
  requirePermission("content:write"), …)` — `contentEntryRoutes.ts:231-234`. The
  `published`-transition already elevates to `content:publish`
  (`:258-260`). Visibility rides the SAME PATCH envelope + validated body; it
  adds no route/RBAC/method. Create rides `POST /content/:type/entries`
  (`requirePermission("content:write")`, `:189`).
- **Reject-unknown at the edge.** `validate(contentEntryMetadataSchema, ctx.body)`
  (`:236`) runs BEFORE the handler; `additionalProperties:false` (`:110`) already
  rejects unknown keys. The new `visibility` + `accessPassword` keys MUST be added
  to the schema `properties` so they are ACCEPTED, and constrained (enum + type +
  maxLength) — a new validated key **consciously joins** the allowlist.
- **Access password is a WRITE-ONLY secret.**
  - Stored **hashed** via `hashPassword` from `core/services/auth/password.ts:8`
    (the same hasher used by `userService`/`apiKeysService`) — NEVER stored plain.
  - **Never exposed via a typed read map.** The narrow, explicitly-projected read
    maps — `getEntry`, `entryListSelection`, and `listEntriesWithContentTypes`'s
    inline selection — MUST NOT select `access_password`; they expose only
    `visibility: "public"|"private"|"password"` and `hasPassword: boolean`
    (computed `access_password IS NOT NULL`). Add `access_password` to NO
    explicit selection map.
  - **Select-all reads/`.returning()` that WOULD now materialize the hash in a
    RETURNED row — audited, and each RETURNED shape must be narrowed by projection.**
    Three functions use `db.select()` / `.returning()` with NO explicit projection over
    `content_entries`, so after this migration the new `access_password` column would be
    present on the returned rows unless narrowed:
    1. `getEntryBySlug` (`:670-676`, `.select().from(contentEntries)`) — RETURNS the
       raw row to callers. → narrow the `.select()` to an explicit projection.
    2. `publishEntry` (`:816-856`) — has an INTERNAL `tx.select().from(contentEntries)`
       (`:818`) used only for validation (`entry.data`/`entry.typeId`) and NOT returned
       (leave as-is), AND a `tx.update(...).returning()` (`:830-839`) whose result
       `updated` IS RETURNED to callers (and consumed by the assistant
       `actionExecutorService:5133` as `record.slug`/`record.id`). → narrow the
       `.returning()`.
    3. `unpublishEntry` (`:858-882`) — a `db.update(...).returning()` (`:859-868`)
       whose `row` IS RETURNED. → narrow the `.returning()`.

    (`listEntryRevisions` at `:962-968` is NOT a vector: it selects
    `.from(contentRevisions)`, a different table with no `access_password` column. The
    `deleteEntry` `.returning()` at `:666` and `duplicateEntry`/`createEntry`
    `.returning()` are covered by their own explicit handling in §3.)

    Verified current consumers do NOT serialize the field — `publicSite.tsx:1265-1270`
    uses the `getEntryBySlug` row only for `isEntryPublished` + `.id` then re-fetches
    via `getEntry`; assistant `actionExecutorService:5133` reads only `record.id`/
    `record.slug` from `publishEntry`; the publish/unpublish routes (`:356`/`:371`)
    ignore the return entirely (`return { ok: true }`); internal `updateEntryMetadata`
    (`:908`/`:910`) ignores it; cache invalidation inside each function reads only
    `.id`/`.typeId`/`.slug`. So NO returned field beyond `{id,typeId,slug,status,
    publishedAt,scheduledAt,updatedAt}` is consumed. **To make the "never leaves the
    server" guarantee provable by construction (not by an unenforceable select-all
    assertion): narrow ALL THREE returned shapes to explicit projections that OMIT
    `access_password`** — mirror the `getEntryBySlug` narrowing across `publishEntry`'s
    and `unpublishEntry`'s `.returning()`:
    ```ts
    .returning({
      id: contentEntries.id,
      typeId: contentEntries.typeId,
      slug: contentEntries.slug,
      status: contentEntries.status,
      publishedAt: contentEntries.publishedAt,
      scheduledAt: contentEntries.scheduledAt,
      updatedAt: contentEntries.updatedAt,
    })
    ```
    This projection covers every field the internal cache-invalidation
    (`id`/`typeId`/`slug`) and the sole external consumer
    (`actionExecutorService` → `record.slug`/`record.id`) actually read, and OMITS
    `access_password` (and `visibility`, which these publish-transition returns do not
    need). The AC#2b / return-shape assertion is then SATISFIABLE by construction —
    the guarantee holds by projection, not by an impossible assertion over a select-all
    read. (The `getEntryBySlug` projection must additionally include the fields its
    callers use — `id`, `status` for `isEntryPublished`, and whatever `publicSite`'s
    re-fetch path relies on — plus `visibility` + `hasPassword` per §3, but NEVER
    `access_password`.)
  - Setting `accessPassword: ""`/`null` when `visibility !== "password"` clears
    the stored hash (write `null`); switching to `password` without a password AND
    with no existing hash → reject `400 entry_password_required` (mapped in the
    route's `withContentEntryErrors`/`mapEntryMetadataError` chain). This reject
    MUST fire BEFORE any write commits — including the status side-effects on a
    combined `{status,visibility}` PATCH — so a rejected request never leaves a
    partial write (see the split precondition in Execution-Ready Plan §3).
- **Present-only / byte-identity.** Omitting `visibility` from a metadata PATCH
  leaves the stored value untouched (partial update — mirror the existing
  `status`/`scheduledAt` optional handling at `:271-277`); legacy rows default to
  `'public'` (DDL default) so existing behavior is byte-identical.
- **No secret in logs.** `accessPassword` must not be echoed in error messages,
  audit entries, or the returned record.

No auth/nonce/HMAC/reCAPTCHA change: the write is already `content:write`-gated
with the app's CSRF/session envelope; this task neither loosens nor adds an auth
path.

---

## Execution-Ready Plan

### 1. Schema (`core/db/schema.ts`, inside `contentEntries` `:774-814`)

Add two columns after `status` (`:786`):

```ts
    status: text("status").notNull().default("draft"),
    // TASK-514-01: entry visibility (prototype Publish card). 'public' default
    // = legacy behavior byte-identical. accessPassword is a HASHED secret,
    // never selected into any read map (see entryService).
    visibility: text("visibility").notNull().default("public"), // public|private|password
    accessPassword: text("access_password"),                     // hashed; null unless visibility='password'
```

No new index (visibility filtering is client-side over the loaded list in this
task; add a partial index only if 514-05 needs SQL pushdown — it does not).

### 2. Migration artifacts (full set — DDL ships all three)

- `core/db/migrations/<NNNN>_<drizzle-slug>.sql` (`<NNNN>` = land-time next-free
  number per the cross-task coordination caveat above — `0067` if 514-01 lands
  first (0066 is already taken by dashboard_layouts), else `0068`/`0069`):
  ```sql
  ALTER TABLE "content_entries" ADD COLUMN "visibility" text DEFAULT 'public' NOT NULL;
  ALTER TABLE "content_entries" ADD COLUMN "access_password" text;
  ```
- `core/db/migrations/meta/<NNNN>_snapshot.json` — regenerate via the project's
  drizzle generate: `bun run db:generate` (a ROOT `package.json` script that runs
  `bunx drizzle-kit generate --config core/db/drizzle.config.ts`; there is NO
  `db:generate` in `core/package.json`, so `bun --cwd core db:generate` would fail)
  so the snapshot mirrors the prior migration + the two new columns; do NOT
  hand-edit shape drift.
- `core/db/migrations/meta/_journal.json` — append the new `<NNNN>` entry (generator
  does this; verify idx/when/tag match the allocated number).
- Verify against the resettable local DB: `bun run db:migrate` up applies clean;
  `bun run db:seed:admin` still seeds; a re-run is idempotent.

### 3. Service types + reads + writes (`entryService.ts`)

- **Types.** Add to `EntryDetail` (`:35-50`) and `EntryListItem` (`:52-60`):
  ```ts
  visibility: "public" | "private" | "password";
  hasPassword: boolean;
  ```
  Add to `UpdateEntryMetadataInput` (`:75-84`):
  ```ts
  visibility?: "public" | "private" | "password";
  accessPassword?: string | null; // plaintext in; hashed before store; null clears
  ```
- **List selection (`:435-451`).** Add `visibility: contentEntries.visibility` and
  a computed `hasPassword`. Prefer `hasPassword: isNotNull(contentEntries.accessPassword)`
  — `isNotNull` is ALREADY imported in `entryService.ts` (`:1`, used at `:532`) and
  yields exactly the boolean `access_password IS NOT NULL` SQL with no new import and
  no raw-SQL interpolation, so it never selects the hash itself. (If you instead use
  a raw `sql<boolean>\`${contentEntries.accessPassword} is not null\`` expression you
  MUST add `sql` to the `import { … } from "drizzle-orm"` list at `:1`, which
  currently imports `and, desc, eq, inArray, isNotNull, max, ne, type SQL` and NOT
  `sql` — prefer `isNotNull` to avoid the extra import.) Add `visibility`/`hasPassword`
  to `EntryListSelectionRow` + `mapEntryListSelectionRow` (`:471-494`). **Never** put
  `accessPassword` on the returned object.
- **`getEntry` (`:602-664`).** Add `visibility` to the row select + map;
  `hasPassword: isNotNull(contentEntries.accessPassword)` (same already-imported
  helper as the list map — apply consistently); do NOT select the hash into the
  returned detail.
- **`listEntriesWithContentTypes` (`:542-600`) — MANDATORY, not optional.** This
  function is typed `Promise<EntryListItem[]>` (`:542`) but has its OWN inline
  selection object (`:544-564`) and its OWN inline row mapper (`:570-599`) — it
  does NOT go through `entryListSelection`/`mapEntryListSelectionRow`. Because §3
  adds `visibility` + `hasPassword` as REQUIRED (non-optional) fields on
  `EntryDetail` — and `EntryListItem = Omit<EntryDetail, "seo"|"taxonomy"> & {…}`
  (`:52`) so they are required on `EntryListItem` too — this hand-built return
  object will (a) FAIL root `tsc` compile (returned object missing the two now-
  required fields; the memory-noted missing-prop trap) and (b) functionally OMIT
  `visibility` from the `GET /content-entries` all-entries list that feeds
  514-05's list-view visibility work. Therefore add to the inline selection
  (`:544-564`): `visibility: contentEntries.visibility` and
  `hasPassword: isNotNull(contentEntries.accessPassword)` (same already-imported
  helper); and add `visibility: row.visibility as EntryVisibility` (or the inline
  union) + `hasPassword: row.hasPassword` to the inline mapper's returned object
  (`:570-599`). **Never** put `accessPassword` on this returned object. This is a
  functional requirement (all-entries list visibility), not merely a type fix.
- **`createEntry` (`:678`).** Default `visibility: 'public'` (rely on DDL default;
  no input field needed unless the create drawer sends one — it does not, keep
  create minimal to avoid touching 487-03-L01's EntryCreateDrawer surface).
- **`duplicateEntry` (`:702-777`).** Copy `visibility` from source; **do NOT copy
  the access password** (a duplicate starts with no password → if source was
  `password`, downgrade the copy to `private` OR keep `password` + `hasPassword:false`
  and require re-entry; RECOMMEND: copy `visibility`, leave `access_password` null,
  and if `visibility==='password'` set the copy to `'private'` so it is never
  silently public — document in closure).
- **Return-shape narrowing (`getEntryBySlug` / `publishEntry` / `unpublishEntry`) —
  MANDATORY for AC#2b satisfiability.** Because the migration adds `access_password`
  as a real column, any `db.select()`/`.returning()` with no projection over
  `content_entries` would return it. Narrow each RETURNED shape to an explicit
  projection that omits `access_password` (see Security Contract for the exact
  `.returning({...})` object):
  - `getEntryBySlug` (`:670-676`): replace `.select()` with `.select({...})` that
    projects the fields its callers use PLUS `visibility` + `hasPassword`
    (`isNotNull(contentEntries.accessPassword)`), never `access_password`.
  - `publishEntry` (`:830-839`) + `unpublishEntry` (`:859-868`): narrow the
    `.returning()` to `{id,typeId,slug,status,publishedAt,scheduledAt,updatedAt}` —
    every field the internal cache-invalidation and the assistant
    `actionExecutorService:5133` (`record.slug`/`record.id`) actually consume. Leave
    `publishEntry`'s INTERNAL validation `tx.select()` (`:818`, not returned) as-is.
  This makes the AC#2b/return-shape assertion pass by construction rather than
  contradicting a select-all read.
- **`updateEntryMetadata` (`:884-960`).** This function is NOT wrapped in a
  `db.transaction` today (verified: no `db.transaction(` in the body; writes are
  the conditional status-transition side-effects — `publishEntry`/`unpublishEntry`
  and the status `set()` — at `:906-920` that run ONLY when the status changes,
  plus the ALWAYS-evaluated `metadataUpdate` conditional block at `:929-945`, plus
  a separate SEO upsert — the writes are non-atomic today; making them atomic is
  OUT OF SCOPE here). **BECAUSE the status side-effects at `:906-920` COMMIT a
  publish/unpublish/status write BEFORE any visibility handling at `:929`, the
  `entry_password_required` precondition MUST be split from the hash write** —
  otherwise a combined PATCH such as `{status:"published", visibility:"password"}`
  with no password and no existing hash would PUBLISH the entry (side effect
  committed) and only THEN throw, leaving a partial, non-atomic write (a new
  partial-failure window that does not exist today; the prototype Publish card
  carries Status AND Visibility in one card behind a single Publish button, so a
  combined PATCH is realistic). Split it into two placements:
  - **Precondition — reject BEFORE any write.** Add the reject check to the
    early-validation block alongside the `scheduledAt` checks (`:896-904`, BEFORE
    the status side-effects at `:906`). All inputs it needs are already available
    there: `entry.hasPassword` (from `getEntry` at `:889`), `input.visibility`,
    `input.accessPassword`:
    ```ts
    // TASK-514-01: reject password-gating with no password BEFORE the status side-effects
    if (input.visibility === "password" && !input.accessPassword && !entry.hasPassword) {
      throw new Error("entry_password_required");
    }
    ```
    This guarantees a combined `{status,visibility}` PATCH fails atomically — no
    publish/unpublish/status write commits when the visibility input is invalid.
  - **Hash write/clear — in the metadataUpdate object.** Visibility + the hash
    assignment/clear MUST be merged into the ALWAYS-evaluated `metadataUpdate`
    object at `:929`, NOT the status-transition `set()` (that block is skipped on a
    visibility-only PATCH with no status change, which would silently drop the
    write and break acceptance #3/#5/#6). The local read is named `entry` (from
    `getEntry`), not `existing`. Add, right after the existing `metadataUpdate`
    assignments (`:929-938`) and before the `if (Object.keys(metadataUpdate).length
    > 0)` write guard (`:940`):
    ```ts
    if (input.visibility !== undefined) metadataUpdate.visibility = input.visibility;
    if (input.visibility === "password") {
      if (input.accessPassword) metadataUpdate.accessPassword = await hashPassword(input.accessPassword);
      // else: existing hash guaranteed by the precondition above → keep it (accessPassword omitted = unchanged)
    } else if (input.visibility === "public" || input.visibility === "private") {
      metadataUpdate.accessPassword = null; // clear secret when not password-gated
    }
    ```
    Adding these to the existing `metadataUpdate` object reuses the single
    conditional write + present-only semantics (`:940-945`), so a visibility-only
    PATCH still writes. Import `hashPassword` from `../auth/password`.

### 4. Validation (`contentSchemas.ts`)

`contentEntryMetadataSchema.properties` (`:76-108`) — add:
```ts
    visibility: { type: "string", enum: ["public", "private", "password"] },
    accessPassword: { type: ["string", "null"], maxLength: 200 },
```
(`additionalProperties:false` stays.) Leave `contentEntryCreateSchema` unchanged
unless create must accept visibility (it does not in this task — keep minimal).

### 5. Route (`contentEntryRoutes.ts:231-289`)

- Extend the destructured body type (`:242-256`) with `visibility?` +
  `accessPassword?`.
- Pass `visibility: body.visibility, accessPassword: body.accessPassword` into the
  `updateEntryMetadata(entry.id, { ... }, ctx.user?.id)` call (`:269-279`).
- Map the new service error: extend `mapEntryMetadataError` (already wrapped at
  `:280-283`) so `entry_password_required` → `ApiError(…, 400)` with a stable
  user message ("A password is required for password-protected entries."); ensure
  the secret never appears in the message.
- Verify the returned `metadata` (from `updateEntryMetadata`) carries
  `visibility` + `hasPassword` and NOT `accessPassword`.

---

## Acceptance Criteria

1. Migration `<NNNN>` — the land-time next-free number (SQL + snapshot + journal,
   all three sharing that same number) — applies clean on the local DB; re-run
   idempotent; snapshot matches schema.
2. `EntryDetail`/`EntryListItem` expose `visibility` + `hasPassword`; NO read path
   ever returns `accessPassword`. Two-part proof:
   (a) grep the file: `access_password`/`accessPassword` appears only in the write
   map + `hashPassword` call, never in an EXPLICIT select/`.returning()` map's
   returned object; and
   (b) a runtime return-shape assertion that `getEntryBySlug`, `publishEntry`, and
   `unpublishEntry` — now ALL narrowed to explicit projections (see §3 Return-shape
   narrowing) — return objects with NO `accessPassword`/`access_password` key. Because
   each return is now an explicit projection that omits the column, this assertion is
   satisfiable by construction (it does not depend on proving a select-all read safe).
3. Metadata PATCH `{visibility:"password", accessPassword:"s3cret"}` → 200, stored
   hash set, response `hasPassword:true`, `visibility:"password"`, no secret echoed.
4. PATCH `{visibility:"password"}` with no password and no existing hash → 400
   `entry_password_required`.
5. PATCH `{visibility:"public"}` clears the stored hash (`hasPassword:false`).
6. PATCH omitting `visibility` leaves stored value + hash untouched (present-only).
7. Unknown key in the metadata body still 400s (reject-unknown intact).
8. Legacy row (no visibility written) reads as `visibility:"public"`,
   `hasPassword:false` — byte-identical behavior.
9. `duplicateEntry` copies visibility per the documented rule and never copies the
   password hash.
10. Combined PATCH `{status:"published", visibility:"password"}` with no password
    and no existing hash → 400 `entry_password_required` with NO write committed:
    the entry stays in its prior status (NOT published) and no visibility/hash is
    written — the precondition rejects BEFORE the status side-effects run
    (reject-before-write atomicity; no partial-failure window).
11. **All THREE read projections return `visibility` + `hasPassword`** (the
    contract 514-02 hard-depends on): (a) per-type `entryListSelection` /
    `mapEntryListSelectionRow` (`:435-494`, feeding `listEntries` /
    `listEntriesForListing`), (b) the all-entries `listEntriesWithContentTypes`
    inline select + map (`:542-600`, feeding `GET /content-entries` which primes
    514-05's list badge via the raw all-entries cache prime), and (c) `getEntry`
    (`:602-664`). A regression asserts a row from EACH of the three carries
    `visibility` (default `"public"` for legacy rows) and `hasPassword` (`false`
    when `access_password` is NULL) — none may omit them (root `tsc` would fail on
    the required `EntryListItem`/`EntryDetail` fields, and the all-entries list
    would surface `undefined` at runtime — see 514-02 "Hard dependency").

---

## Testing Requirements

Per `_docs/TESTING_STRATEGY.md`. Shared local DB is resettable — isolate rows by
unique slugs; do not assume empty tables.

### Bun — entry route/integration suite (this subtask's direct concern)

- Metadata PATCH visibility round-trip (public→private→password→public), asserting
  `hasPassword` transitions and that `accessPassword` is ABSENT from every
  response body (serialize + assert key not present).
- `entry_password_required` 400 path.
- **Combined `{status:"published", visibility:"password"}` (no password, no
  existing hash) → 400 `entry_password_required` AND the entry's status is
  UNCHANGED afterward (re-read asserts it did NOT publish) — proves the
  reject-before-write ordering leaves no partial write.**
- Reject-unknown 400 for a junk key alongside a valid visibility.
- **Return-shape no-leak assertion:** after storing a password hash on an entry,
  call `getEntryBySlug`, `publishEntry`, and `unpublishEntry` — all now narrowed to
  explicit projections (§3) — and assert their returned objects have NO
  `accessPassword`/`access_password` key (proves the projected `.select()`/
  `.returning()` returns over `content_entries` omit the secret; AC#2b).
- Migration applied assertion (column exists / default applies to a pre-existing row).
- **All-three-projections read assertion (AC#11):** a row from `listEntries` (per-type
  selection), `listEntriesWithContentTypes` (all-entries), and `getEntry` each carries
  `visibility` + `hasPassword` (default `"public"`/`false` for a legacy-style row),
  proving the third projection is covered per 514-02's hard dependency.

### Vitest — Bun-free

- `contentEntryMetadataSchema` accepts valid visibility + `accessPassword`,
  rejects a bad enum value, rejects an over-`maxLength` password, rejects an
  unknown key (allowlist assertion).

### SMOKE

Live visibility flow is exercised at **TASK-514-06** (set public→private→password
in the redesigned Publish card; reload shows `hasPassword`; password never visible
in network response).

---

## Deferred (not in this task)

Public-front ENFORCEMENT of `private` (auth-gate) / `password` (prompt-gate) on
the entry render path — persisted + surfaced only here (see parent open
question). SQL pushdown index on `visibility`. Accepting `visibility` in the
create drawer (leave EntryCreateDrawer to TASK-487-03-L01).
