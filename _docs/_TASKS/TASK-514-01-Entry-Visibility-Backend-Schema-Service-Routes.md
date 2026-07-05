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
- `core/db/schema.ts` — the `contentEntries` `pgTable` block (`:757-797`): two new
  columns.
- `core/db/migrations/0066_<slug>.sql` + `core/db/migrations/meta/0066_snapshot.json`
  + `core/db/migrations/meta/_journal.json` (append entry) — verified next number
  is **0066** (last is `0065_backup_run_metadata.sql`).
- `core/services/content/entryService.ts` — types (`EntryDetail`, `EntryListItem`,
  `UpdateEntryMetadataInput`, `CreateEntryInput`), `entryListSelection` +
  `EntryListSelectionRow` + `mapEntryListSelectionRow` (`:435-494`), `getEntry`
  read map (`:602-664`), `createEntry` (`:678`), `duplicateEntry` (`:702`),
  `updateEntryMetadata` (`:884-960`).
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
  - **NEVER returned** by any read. `getEntry`/`entryListSelection` do NOT select
    `access_password`; `EntryDetail`/`EntryListItem` expose only
    `visibility: "public"|"private"|"password"` and `hasPassword: boolean`
    (computed `access_password IS NOT NULL`). Add `access_password` to NO
    selection map.
  - Setting `accessPassword: ""`/`null` when `visibility !== "password"` clears
    the stored hash (write `null`); switching to `password` without a password AND
    with no existing hash → reject `400 entry_password_required` (mapped in the
    route's `withContentEntryErrors`/`mapEntryMetadataError` chain).
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

### 1. Schema (`core/db/schema.ts`, inside `contentEntries` `:759-776`)

Add two columns after `status` (`:769`):

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

- `core/db/migrations/0066_<drizzle-slug>.sql`:
  ```sql
  ALTER TABLE "content_entries" ADD COLUMN "visibility" text DEFAULT 'public' NOT NULL;
  ALTER TABLE "content_entries" ADD COLUMN "access_password" text;
  ```
- `core/db/migrations/meta/0066_snapshot.json` — regenerate via the project's
  drizzle generate (`bun --cwd core db:generate` or the repo's documented script;
  `core/db/drizzle.config.ts` present) so the snapshot mirrors 0065 + the two new
  columns; do NOT hand-edit shape drift.
- `core/db/migrations/meta/_journal.json` — append the 0066 entry (generator does
  this; verify idx/when/tag).
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
  a computed `hasPassword` — either select `access_password` **only to derive the
  boolean and DROP it** in `mapEntryListSelectionRow`, or better use a SQL
  expression `sql<boolean>\`${contentEntries.accessPassword} is not null\``. Add
  `visibility`/`hasPassword` to `EntryListSelectionRow` + `mapEntryListSelectionRow`
  (`:471-494`). **Never** put `accessPassword` on the returned object.
- **`getEntry` (`:602-664`).** Add `visibility` to the row select + map;
  `hasPassword` from the same `is not null` expression; do NOT select the hash into
  the returned detail.
- **`createEntry` (`:678`).** Default `visibility: 'public'` (rely on DDL default;
  no input field needed unless the create drawer sends one — it does not, keep
  create minimal to avoid touching 487-03-L01's EntryCreateDrawer surface).
- **`duplicateEntry` (`:702-777`).** Copy `visibility` from source; **do NOT copy
  the access password** (a duplicate starts with no password → if source was
  `password`, downgrade the copy to `private` OR keep `password` + `hasPassword:false`
  and require re-entry; RECOMMEND: copy `visibility`, leave `access_password` null,
  and if `visibility==='password'` set the copy to `'private'` so it is never
  silently public — document in closure).
- **`updateEntryMetadata` (`:884-960`).** In the same transaction that writes
  status/scheduledAt/tags:
  ```ts
  const patch: Partial<...> = {};
  if (input.visibility !== undefined) patch.visibility = input.visibility;
  if (input.visibility === "password") {
    if (input.accessPassword) patch.accessPassword = await hashPassword(input.accessPassword);
    else if (!existing.hasPassword) throw new Error("entry_password_required");
    // else: keep existing hash (accessPassword omitted = unchanged)
  } else if (input.visibility === "public" || input.visibility === "private") {
    patch.accessPassword = null; // clear secret when not password-gated
  }
  ```
  Merge `patch` into the existing `set({...})`. Import `hashPassword` from
  `../auth/password`.

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

1. Migration 0066 (SQL + snapshot + journal) applies clean on the local DB;
   re-run idempotent; snapshot matches schema.
2. `EntryDetail`/`EntryListItem` expose `visibility` + `hasPassword`; NO read path
   ever returns `accessPassword` (grep the file: `access_password`/`accessPassword`
   appears only in the write map + hash call, never in a select map's returned
   object).
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

---

## Testing Requirements

Per `_docs/TESTING_STRATEGY.md`. Shared local DB is resettable — isolate rows by
unique slugs; do not assume empty tables.

### Bun — entry route/integration suite (this subtask's direct concern)

- Metadata PATCH visibility round-trip (public→private→password→public), asserting
  `hasPassword` transitions and that `accessPassword` is ABSENT from every
  response body (serialize + assert key not present).
- `entry_password_required` 400 path.
- Reject-unknown 400 for a junk key alongside a valid visibility.
- Migration applied assertion (column exists / default applies to a pre-existing row).

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
