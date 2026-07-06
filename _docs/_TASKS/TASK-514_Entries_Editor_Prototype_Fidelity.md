# TASK-514: Entries Editor — Prototype-Fidelity UI/UX (sibling of Engine)

# FileName: TASK-514_Entries_Editor_Prototype_Fidelity.md

**Priority:** High
**Category:** Admin UI / Entries / Schema
**Estimated Effort:** Large
**Dependencies:** TASK-479 (Soft-Violet admin redesign; `PageHeader`/`SectionCard`/`StatusTabs`/`AdminShell` shared patterns), TASK-468 (entries model + editor foundations), relates to **TASK-487** (revision history/restore + SEO-field surfacing — scopes kept DISTINCT; this task leaves a clean seam, see Coordination)
**Status:** ⏳ To Do

---

## Overview

The **Entries** area is the sibling of the **Engine** (content-type) area: Engine
defines the schema, Entries authors instances of it. The Engine editor was
brought to prototype fidelity in the TASK-479 redesign (in-page `PageHeader` +
underline `Tabs` + `SectionCard` grid + right settings column). The **Entries
editor was NOT** given the same treatment — it still runs the older
`AdminShell` + custom sticky action-bar + full-height fixed `w-96` aside shape,
each field wrapped in its own `Card`. This task closes that gap: bring the
Entries list + entry editor to prototype fidelity, mirroring the Engine editor's
`SectionCard`-grid approach adapted to entries, add the schema field the
prototype implies (**Visibility**), and wire full functionality (not a cosmetic
shell) with maximum configuration flexibility.

**Live gap analysis performed** (2026-07-05, session `wf514author`):
- Prototype list `http://localhost:5180/#/advanced/entries` vs current admin
  `http://coderso-a.localhost:5173/admin/entries` → screenshots
  `_docs/_workflows/_smoke/wf514-proto-list.png`, `wf514-admin-list.png`.
- Prototype editor `#/advanced/entries/article/sample` vs current admin
  `/admin/entries/:type/:id` → `wf514-proto-editor.png`, `wf514-admin-editor.png`.
- Prototype SOURCE read: `_docs/_PROTOTYPE/src/pages/advanced/EntriesPage.tsx`,
  `EntryEditorPreview.tsx`, and the Engine sibling `ContentTypeEditorPreview.tsx`.
- Current SOURCE read: `core/admin/ui/entries/*` (EntryEditor 1005 lines,
  EntryList 604, EntryMetadataPanel 553, EntryTable 262, EntryGrid 94 UNUSED,
  FieldRenderer, EntryFilters), `core/admin/services/entriesClient.ts`,
  `core/services/content/entryService.ts` (1006 lines), routes
  `core/server/routes/contentEntryRoutes.ts`, validation
  `core/server/validation/contentSchemas.ts`, schema `core/db/schema.ts`
  (`contentEntries` block @ `:774-814`).

## Gap Summary (prototype vs current admin — grounded)

1. **Editor chrome.** Prototype uses an **in-page `PageHeader`** (breadcrumbs
   `Entries › Article`, title "Edit entry", description, right actions Save
   draft / Publish). Current uses `AdminShell` breadcrumbs + a **sticky action
   bar** (`EntryEditor.tsx:715-762`) with no in-page PageHeader — diverges from
   the Engine editor which DOES use in-page `PageHeader` (`ContentTypeEditor.tsx:459`).
2. **Content grouping.** Prototype groups the whole body into ONE **"Content"
   `SectionCard`** (Title, Slug, Body) + a **"Media" `SectionCard`**. Current
   wraps **every field in its own `Card`** inside a `Tabs`/section grid
   (`EntryEditor.tsx:858-909`). The Engine editor uses `SectionCard` grouping;
   Entries should mirror that.
3. **Right column.** Prototype right column is an in-grid **`320px` column of
   stacked `SectionCard`s** (Publish, Taxonomy, Metadata) that flows with the
   page. Current is a **full-height fixed `w-96` `<aside>`** with an internal
   `ScrollArea` (`EntryEditor.tsx:920-945`) — heavier chrome than the prototype.
4. **Visibility control — MISSING (schema gap).** Prototype "Publish" card has a
   **Visibility** select (Public / Private / Password protected). No `visibility`
   column on `content_entries`, no client field, no UI. → schema extension.
5. **Metadata card — MISSING.** Prototype has a dedicated **"Metadata"**
   `SectionCard` (Created / Updated / Author / Entry ID). Current only shows the
   author at the panel footer (`EntryMetadataPanel.tsx:538-550`); created/updated/
   id are not surfaced.
6. **List view toggle — MISSING.** Prototype `FilterBar` has a **list/grid view
   toggle**. Current renders only `EntryTable`; `EntryGrid.tsx` is **unused by the
   admin runtime but exercised by one UI test** (its sole importer is
   `tests/vitest/ui/analytics-settings-entries-seo-leafs.test.tsx:13`, verified — no
   admin route/page imports it). → wire a real toggle (and update that test in
   lockstep, per 514-05 §6).
7. **List row fidelity (verify-only nicety).** Prototype row = icon tile + title
   + mono sub-line + `Badge variant="soft"` type + `StatusBadge` + author `Avatar`.
   **Correction (grounded 2026-07-05):** the current `EntryTable` ALREADY renders
   a mono sub-line (`EntryTable.tsx:196-198` → `entry.slug`) AND an author `Avatar`
   with initials + name (`EntryTable.tsx:224-239`), plus content-type + status
   columns. The prototype's `#hex` sub-line
   (`EntriesPage.tsx:45-47` → `#{(row.title.length * 137 + 1024).toString(16)}`)
   is a **fabricated mock derived from `title.length`**, NOT a persisted id — real
   entries have UUID `id`s. So there is NO id-hash gap. The only genuine delta is
   the mono sub-line CONTENT: the prototype shows a short, mono, hash-like
   identifier under the title, so — per the prototype-fidelity mandate ("do NOT
   invent conservative decisions that keep the old approach") — **514-05 §4a is the
   committed source of truth: replace the current `entry.slug` sub-line with
   `entry.id.slice(0, 8)`** in the existing mono styling (matching the prototype's
   visual structure using REAL data, not the non-persisted `title.length` hash).
   This is a single-line content swap, NOT a rebuild.

Note: the current admin is FUNCTIONALLY richer than the non-functional prototype
(publish checklist, taxonomy quick-add, SEO snippet, bulk actions, runtime
preview, duplicate). **Preserve all of that** — this is a layout/structure
fidelity + additive-control task, NOT a feature reduction. Do not drop the
checklist, taxonomy, bulk actions, or runtime preview; re-home them into the
prototype's `SectionCard` structure.

## Schema-Extension Plan

**One additive schema extension: entry `visibility`.**

- `content_entries.visibility` — `text NOT NULL DEFAULT 'public'`, enum
  `public | private | password`.
- `content_entries.access_password` — `text` nullable, stores a **hashed**
  password (argon2 via the app's existing hasher `core/services/auth/password.ts`
  → `hashPassword`) used only when `visibility = 'password'`; NEVER selected into
  any read projection and NEVER returned in API responses.
- Full migration artifacts: `core/db/migrations/0067_*.sql` + matching
  `core/db/migrations/meta/0067_snapshot.json` + `_journal.json` entry (verified
  2026-07-05: the last present migration is `0066_dashboard_layouts.sql`
  (`meta/0066_snapshot.json` + journal `idx:66` `tag:"0066_dashboard_layouts"`
  both exist), so the next FREE number is `0067`. **CROSS-TASK 0067 THREE-WAY
  CO-CLAIM: `0067` is contended by THREE sibling tasks that all branch off the
  same `0066` baseline — TASK-512-01-Schema-And-Migration.md (`0067_<media>.sql` +
  `meta/0067_snapshot.json` + journal `idx:67` + its DB-lane test
  `tests/integration/server/media-schema-0067.test.ts`), TASK-513-01 (content-type
  `config` schema extension, index computed at land time — see TASK-513 §141-146 /
  §228-231 which correctly names all three), and this TASK-514-01. Only ONE sibling
  can be `0067`. Re-verify the journal tail at land time; whichever of
  TASK-512-01/TASK-513-01/TASK-514-01 lands SECOND takes `0068` and the THIRD takes
  `0069` — i.e. this task renumbers to `0068` OR `0069` depending on land position,
  across ALL its artifacts — SQL filename, `meta/NNNN_snapshot.json`, journal
  `idx`/`tag` (and, for TASK-512, its number-embedding test filename) — bumping
  accordingly).

**Read/write asymmetry (resolves the round-trip vs never-echo tension):**
`visibility` and `accessPassword` are NOT symmetric fields, so they carry
DIFFERENT round-trip contracts:

- **`visibility`** is a normal read/write enum column. It joins the
  **reject-unknown allowlist** in `contentEntryMetadataSchema` (enum
  `public|private|password`, default `public`), is surfaced on `EntryDetail`, and
  gets the **byte-identical round-trip persistence test** (set → read back →
  equal). Existing rows / omitted-field writes are **present-only / byte-identical**
  (absent `visibility` in a metadata PATCH leaves the stored value untouched;
  `public` default means legacy rows behave exactly as today).
- **`accessPassword`** is a **write-only** metadata key: accepted on the PATCH
  body, hashed on write, and NEVER echoed. Byte-identity/round-trip does NOT apply
  to it (a hash cannot round-trip to the plaintext). Its read-side projection is
  the derived boolean **`hasPassword`** on `EntryDetail` (`access_password IS NOT
  NULL`). **Write/clear is keyed on `visibility`, NOT on `accessPassword` presence —
  514-01 §3 is the sole writer + authoritative spec of this branch.** Submission
  semantics:
  - `visibility: "password"` + `accessPassword: "<string>"` → `hashPassword` →
    store hash.
  - `visibility: "password"` + no `accessPassword` + an existing stored hash →
    keep the existing hash (password omitted = unchanged).
  - `visibility: "password"` + no `accessPassword` + NO existing hash → reject
    **`400 entry_password_required`** (precondition fires BEFORE any write — see the
    combined-`{status,visibility}`-PATCH atomicity note in 514-01 §3).
  - `visibility: "public"` OR `"private"` → **clear** the stored hash
    (`access_password = NULL`, `hasPassword = false`).
  - `visibility` (and `accessPassword`) **absent** from the PATCH body → unchanged
    (present-only).
  - Its dedicated tests are behavioural, not byte-identity: set → `hasPassword`
    true; omit → unchanged; switch to public/private → cleared; the
    `entry_password_required` reject path; and a route test asserting the raw
    password/hash is NEVER present in any response payload.
- **Front-end enforcement of `private`/`password` on the public render path is an
  OPEN QUESTION (see below), NOT assumed in this task's default scope.** Default
  scope: persist + round-trip + surface + respect in admin/preview. See 514-01.

## Subtask Breakdown (single-writer file ownership)

| Sub | Title | Sole-writer files |
|-----|-------|-------------------|
| 514-01 | Entry Visibility — schema, migration, service, validation, routes | `core/db/schema.ts` (contentEntries block), `core/db/migrations/0067_*` + meta, `core/services/content/entryService.ts`, `core/server/validation/contentSchemas.ts`, `core/server/routes/contentEntryRoutes.ts` |
| 514-02 | Entries admin client — visibility types + cache round-trip | `core/admin/services/entriesClient.ts` |
| 514-03 | Entry editor prototype-fidelity layout (PageHeader + SectionCard grid + Content/Media grouping + visibility wiring + revisions seam) | `core/admin/ui/entries/EntryEditor.tsx`, `core/admin/ui/entries/EntryEditorHeader.tsx` |
| 514-04 | Entry metadata panel — Publish (Status+Visibility+Schedule) / Taxonomy / **Metadata** cards | `core/admin/ui/entries/EntryMetadataPanel.tsx` |
| 514-05 | Entries list — list/grid view toggle (wire `EntryGrid`) + row fidelity | `core/admin/ui/entries/EntryList.tsx`, `EntryTable.tsx`, `EntryGrid.tsx`, `EntryFilters.tsx`; **region-owned** `tests/vitest/ui/analytics-settings-entries-seo-leafs.test.tsx` (ONLY the `EntryGrid`/`EntryFilters` render blocks — coupled to the `EntryGrid` prop-contract change, same commit; see 514-05 §6) |
| 514-06 | Tests, docs, closure (changelog **1226**) | changelog + README rows (orchestrator), `_docs/DATA_MODEL.md` note |

## Subtask Execution Detail (execution-ready pseudocode)

### 514-01 — Entry Visibility: schema, migration, service, validation, routes

**Schema (`core/db/schema.ts`, `contentEntries` block @ `:774-814`).** Add two
columns after `status` (`:786`):
```ts
visibility: text("visibility").notNull().default("public"), // 'public'|'private'|'password'
accessPassword: text("access_password"),                    // nullable argon2 hash, write-only
```
No new index required (visibility is a low-cardinality filter served by existing
scans; do NOT add a btree unless the front-enforcement follow-up needs it).

**Migration artifacts (FULL set, sequential number 0067 — `0066` is TAKEN by
`0066_dashboard_layouts`; `0067` is THREE-WAY CO-CLAIMED by TASK-512-01,
TASK-513-01, AND this TASK-514-01, so the SECOND lander renumbers to `0068` and the
THIRD to `0069` (i.e. this task ends up `0067`/`0068`/`0069` depending on land
position) across SQL filename + `meta/NNNN_snapshot.json` + journal `idx`/`tag` —
re-verify the journal tail at land time; see the Schema-Extension Plan cross-task
note above).**
- `core/db/migrations/0067_entry_visibility.sql`:
  ```sql
  ALTER TABLE "content_entries" ADD COLUMN "visibility" text DEFAULT 'public' NOT NULL;
  ALTER TABLE "content_entries" ADD COLUMN "access_password" text;
  ```
  (down/reset: DROP both columns — the local DB is resettable per memory.)
- `core/db/migrations/meta/0067_snapshot.json` — regenerate via drizzle so the
  snapshot matches the new columns; do NOT hand-edit divergently.
- Append the `0067` entry to `core/db/migrations/meta/_journal.json` (`idx:67`,
  `tag:"0067_entry_visibility"`, following `idx:66` `0066_dashboard_layouts`).

**Types (`entryService.ts`).**
- `export type EntryVisibility = "public" | "private" | "password";`
- Extend `EntryDetail`: add `visibility: EntryVisibility;` and
  `hasPassword: boolean;` (NO `accessPassword` field on any read type).
- **List-variant fallout (MANDATORY — typecheck-scope-gotcha class).**
  `EntryListItem = Omit<EntryDetail, "seo" | "taxonomy"> & {...}`
  (`entryService.ts:52`) does NOT omit `visibility`/`hasPassword`, so adding them
  as REQUIRED on `EntryDetail` makes them REQUIRED on `EntryListItem` too.
  `listEntriesWithContentTypes(): Promise<EntryListItem[]>` is explicitly typed
  (`entryService.ts:542`) → root `tsc -p tsconfig.json --noEmit` +
  `bun --cwd core lint:types` WILL error unless the list projections also carry
  these fields. Both list functions feed the admin list route
  (`contentEntryRoutes.ts:177` → `listEntriesWithContentTypes()`, `:185` →
  `listEntries(type.id)`), and **514-05 renders a `visibility` badge on list
  rows** — so populating the list projection is the correct choice (NOT declaring
  the fields optional). 514-01 (sole writer of `entryService.ts`) MUST extend BOTH
  list projections in this same subtask:
  - `entryListSelection` (`:435`): add
    `visibility: contentEntries.visibility,` and
    ``hasPassword: sql<boolean>`${contentEntries.accessPassword} is not null`,``
    (NEVER select `accessPassword` itself). Import `sql` from `drizzle-orm`
    (line 1 currently imports `and, desc, eq, inArray, isNotNull, max, ne, type SQL`
    — add `sql`).
  - `EntryListSelectionRow` type (`:453`): add
    `visibility: string;` and `hasPassword: boolean;`.
  - `mapEntryListSelectionRow` (`:471`): add
    `visibility: row.visibility as EntryVisibility,` and
    `hasPassword: row.hasPassword,` to the returned object (this feeds
    `listEntries` `:496` + `listEntriesForListing` `:515`).
  - `listEntriesWithContentTypes` inline select (`:544`) + mapping (`:570`): add
    the same `visibility` + `hasPassword` (`sql<boolean> ... is not null`) select
    entry and the two mapped fields.
  These are read projections over the SAME `content_entries` row — no extra query;
  `hasPassword` is a derived boolean, never the secret. Regression assertion (Bun
  DB lane): a `listEntriesWithContentTypes()` / `listEntries()` row carries
  `visibility` (default `"public"` for legacy rows) and `hasPassword` (`false`
  when `access_password` is NULL).
- Extend `UpdateEntryMetadataInput`: add
  `visibility?: EntryVisibility; accessPassword?: string | null;`

**`getEntry` read projection (`entryService.ts:602-664`).** Add
`visibility: contentEntries.visibility` to the `.select({...})`. Derive
`hasPassword` WITHOUT selecting the secret:
`hasPassword: Boolean(contentEntries.accessPassword)` — but Drizzle can't boolean
a column in select cleanly, so select a computed flag instead:
`hasPassword: sql<boolean>\`${contentEntries.accessPassword} is not null\``, and
map `visibility: row.visibility as EntryVisibility`, `hasPassword: row.hasPassword`
in the returned object. **NEVER add `accessPassword` to the select.**

**`updateEntryMetadata` hashing branch (`entryService.ts:884-960`).** Keyed on
`input.visibility` (NOT `accessPassword` presence) — **514-01 §3 is the
authoritative spec**; two placements. (a) A **precondition BEFORE the status
side-effects** (`:906`) rejects `visibility:"password"` with no password and no
existing hash so a combined `{status,visibility}` PATCH fails atomically (no
publish/status write commits before the reject):
```ts
if (input.visibility === "password" && !input.accessPassword && !entry.hasPassword) {
  throw new Error("entry_password_required");
}
```
(b) The visibility + hash assignment/clear merged into the ALWAYS-evaluated
`metadataUpdate` accumulator (the `Partial<$inferInsert>` block @ `:929-938`):
```ts
if (input.visibility !== undefined) metadataUpdate.visibility = input.visibility;
if (input.visibility === "password") {
  if (input.accessPassword) metadataUpdate.accessPassword = await hashPassword(input.accessPassword);
  // else keep existing hash (guaranteed by the precondition above)
} else if (input.visibility === "public" || input.visibility === "private") {
  metadataUpdate.accessPassword = null; // clear the secret when not password-gated
}
```
Data flow: route validates+parses → service rejects (precondition) or hashes →
single `update().set()` (the existing `if (Object.keys(metadataUpdate).length > 0)`
write @ `:940-945` now also carries visibility/hash). Error handling: the ONE new
throw is `entry_password_required` (mapped to 400 at the route); switching to
public/private is a valid clear, not an error. Import `hashPassword` at top of
`entryService.ts`.

**Validation (`contentSchemas.ts`, `contentEntryMetadataSchema` @ `:74-111`).**
Add to `properties` (still `additionalProperties: false` — reject-unknown intact):
```ts
visibility: { type: "string", enum: ["public", "private", "password"] },
accessPassword: { type: ["string", "null"], maxLength: 200 },
```
(No `minLength` — an empty/omitted password is a valid state, not a validation
error. The password-required case is enforced SEMANTICALLY in the service via the
`entry_password_required` precondition, not a JSON-schema length rule.)

**Route (`contentEntryRoutes.ts`, metadata PATCH @ `:231-286`).** The handler
already `validate(contentEntryMetadataSchema, ctx.body)` then builds the
`UpdateEntryMetadataInput` and calls `updateEntryMetadata`. Extend the input
mapping to pass `visibility` and `accessPassword` through, and extend the existing
`mapEntryMetadataError` chain (`contentEntryRoutes.ts:56,281`) so the service's
`entry_password_required` throw maps to `400` with a stable user message. Return
value is `getEntry(...)` which already excludes the secret and includes
`hasPassword` — no response shaping change needed beyond that.

**Security Contract (514-01).**
- **Authz:** the metadata PATCH is already gated by
  `requirePermission("content:write")` (`contentEntryRoutes.ts:231-235`) — the
  admin-only write path; visibility/password ride that same permission. No new
  public route is introduced.
- **Hash on write:** plaintext `accessPassword` is hashed with the app's argon2
  hasher (`core/services/auth/password.ts` → `hashPassword`) inside
  `updateEntryMetadata` BEFORE any persistence. Plaintext is never stored, never
  logged.
- **Never select / never echo:** `access_password` is deliberately OMITTED from
  the `getEntry` select and from every other read/list projection. The read side
  exposes only the derived boolean `hasPassword`. Route responses therefore cannot
  leak the hash or plaintext.
- **Enum enforcement via allowlist:** `visibility` is constrained by the
  `contentEntryMetadataSchema` enum + `additionalProperties: false`; any unknown
  key or out-of-enum value → 400 at the route boundary.
- **Clear semantics (visibility-keyed, per the authoritative "Read/write
  asymmetry" table above):** the stored credential is cleared (`access_password =
  NULL`) when `visibility` is set to `public`/`private`. Under
  `visibility === "password"` a falsy `accessPassword` (`null`/`""`) instead KEEPS
  the existing hash (omitted = unchanged) — there is no clear-while-password path.
  Clearing is intentional and authorized under the same write permission.
- **Security tests (Bun route lane):** (a) PATCH with `accessPassword` set → 200
  and the response body contains NEITHER the plaintext NOR any hash, only
  `hasPassword: true`; (b) subsequent GET/detail also never contains the secret;
  (c) reject-unknown: PATCH with a stray key → 400; (d) out-of-enum `visibility`
  → 400; (e) `visibility:"password"` with no password and no existing hash → 400
  `entry_password_required` (and for a combined `{status:"published"}` PATCH the
  entry stays unpublished — reject-before-write atomicity).

**Regression-test shapes (514-01).**
- Bun route/integration: visibility PATCH round-trip (`public→private→password`)
  → 200, read-back `visibility` equals; password set → `hasPassword: true`; clear
  → `hasPassword: false`; reject-unknown 400; password-never-echoed assertion.
- Bun DB/migration: apply `0067` on the resettable local DB, insert a legacy-style
  row without visibility → defaults to `public`, `accessPassword` NULL.
- Vitest (Bun-free) `contentSchemas`: enum accept/reject, unknown-key reject,
  `accessPassword` present-only (absent leaves prior value; empty-string allowed).

### 514-02 — Admin client: visibility types + cache round-trip

**File:** `core/admin/services/entriesClient.ts` (sole writer).

**Type mirror — add to the SHARED base, not just detail (grounded 2026-07-05).**
The client models `EntryListItem = EntrySummary & {...}` (`:37`) and
`EntryDetail = EntrySummary & {...}` (`:52`) — both extend the shared
`EntrySummary` (`:14`). Because 514-05 renders a `visibility` badge on LIST rows
(fed by `EntryListItem`), add the new read fields to **`EntrySummary`** so they
flow to both the list and detail models:
```ts
visibility: EntryVisibility;  // add to EntrySummary
hasPassword: boolean;         // add to EntrySummary
```
Also add `export type EntryVisibility = "public" | "private" | "password";`
(mirror the service type; NO `accessPassword` on any read model).

**Cache-projection fallout (MANDATORY).** `toEntrySummary` (`:98`) explicitly
copies each summary field into the cached object — it does NOT spread. Add
`visibility: entry.visibility,` and `hasPassword: entry.hasPassword,` to that
projection, or cached list/detail reads will SILENTLY DROP `visibility`
(breaking the 514-02 cache round-trip promise and 514-05's badge on cache hits).

Extend the metadata-update request payload type (`EntryMetadataPayload` `:69`) to
allow `visibility?: EntryVisibility; accessPassword?: string | null`.

Data flow: the update method serializes only the fields the caller set (present-
only) and posts to the metadata PATCH; the response is re-hydrated into the cached
`EntryDetail`. **Admin cache contract:** if this client caches entry detail (follow
the existing cache pattern in the file — do NOT invent a new one), the visibility
field must round-trip through the cache read/write unchanged, and `hasPassword`
must be refreshed from the server response after a password write (never inferred
client-side). Regression-test shape (Vitest admin lane): mock the PATCH response,
assert the client parses `visibility` + `hasPassword` and that a cached detail read
returns the updated `visibility` (cache round-trip), and that no `accessPassword`
key ever appears on the parsed read model.

### 514-03 — Entry editor prototype-fidelity layout

**Files:** `core/admin/ui/entries/EntryEditor.tsx` (main),
`core/admin/ui/entries/EntryEditorHeader.tsx`.

**Current-state anchor — `EntryEditorHeader` is ORPHANED (grounded 2026-07-05).**
`EntryEditorHeader.tsx` (exports `EntryEditorHeader` + `EntryEditorHeaderActions`)
is **NOT imported or rendered by `EntryEditor.tsx`** (EntryEditor renders its
sticky action bar inline @ `EntryEditor.tsx:715`; there is no `EntryEditorHeader`
import). Its only references are two Vitest mocks:
`tests/vitest/ui/entry-editor-shell-wave.test.tsx:365` and
`tests/vitest/ui/post-classic-editor-shell-wave.test.tsx:293`. **Decision (this
subtask): REPURPOSE it** into the prototype's in-page `PageHeader` — move the
Save-draft / Publish / History actions into `EntryEditorHeader`/`...Actions` and
render it at the top of `EntryEditor` (replacing the inline sticky bar), matching
`ContentTypeEditor.tsx:459`. If repurposing proves heavier than an inline
`PageHeader`, the fallback is to DELETE `EntryEditorHeader.tsx`. **Either path MUST
update the two Vitest mocks** — if repurposed, the mock's prop surface
(`entryLabel`, `status`, actions) must track the new signature; if deleted, remove
both `vi.mock` blocks and any assertions that depend on them. Note this test impact
in the closure.

**Layout target (mirror `EntryEditorPreview.tsx`).** Replace `AdminShell` sticky
bar with:
```
<PageHeader breadcrumbs={[{Entries→/entries},{contentType.name}]}
  title="Edit entry" description=... actions={[SaveDraft, Publish, HistoryTrigger]} />
<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
  <div className="flex flex-col gap-6">
    <SectionCard title="Content"> Title + Slug + <Content-group dynamic fields> </SectionCard>
    <SectionCard title="Media"> <Media-group dynamic fields> </SectionCard>
    {/* + any additional authored groups as their own SectionCards, see below */}
  </div>
  <EntryMetadataPanel .../>  {/* 514-04 owns its internals; rendered as the 320px col */}
</div>
```

**Field-grouping decision (MANDATORY — the prototype is a fixed 2-card MOCK; real
entries render CONTENT-TYPE-AUTHORED dynamic fields, so DO NOT hard-flatten to two
literal cards).** Grounded in current source (`EntryEditor.tsx:651-692`,
`FieldRenderer.tsx:220`):
- **Title + Slug are top-level entry columns**, held as their own `title`/`slug`
  state (`EntryEditor.tsx:141-142`, synced into `values` only when the schema
  declares those field names @ `:347-356`). They render at the TOP of the
  **Content** `SectionCard` (dedicated inputs + "Generate slug" affordance @
  `:489-490`), NOT as dynamic `FieldRenderer` cards.
- **Everything else is content-type-defined dynamic fields.** The current code
  ALREADY derives grouping via `resolveTabLabel` + `layout.section`
  (`EntryEditor.tsx:651-692`): a field's group = `field.layout.tab` if authored,
  else by type (`media`→"Media", `relation`→"Relations", else "Content"); within a
  group, `field.layout.section` yields labeled sub-sections. **PRESERVE this
  authored grouping — the layout change is card CHROME (each authored group/section
  becomes a `SectionCard` using its label as the card title, replacing the
  per-field `Card` @ `:869-897`), NOT a data-model flatten.** Concretely:
  - Map the existing `tabGroups` → one `SectionCard` per group: the group labeled
    **"Content"** is the prototype's Content card (Title/Slug render above its
    fields); the group labeled **"Media"** is the prototype's Media card; any OTHER
    authored group (e.g. "Relations" or a custom `layout.tab`) renders as its OWN
    additional `SectionCard` in the left column — **never dropped**.
  - **"Media" is defined precisely** = the group produced by `resolveTabLabel`
    (fields with `field.type === "media"` or an explicit `layout.tab === "Media"`),
    NOT a literal "second card". Do NOT invent a new heuristic.
  - Preserve `field.layout.section` sub-labels as sub-headings inside each
    `SectionCard`, and keep `field.help`/`field.label` per field (previously the
    per-field `CardTitle`/`CardDescription`).
  - **When only the default single "Content" group exists** the layout collapses to
    the prototype's Content(+Media) shape naturally; **when a content type authors
    multiple groups/tabs**, render each as its own `SectionCard` (retain a `Tabs`
    wrapper only if there are enough groups to warrant it — matching the prototype
    is the visual bar for the common single/dual-group case, but multi-group content
    types MUST NOT lose their authored grouping). This satisfies the max-config
    flexibility + "no feature loss" mandate.
- `tabGroups`/`resolveTabLabel` currently live inline in `EntryEditor.tsx`
  (514-03's sole file) — the grouping logic is reused/adapted, not deleted.

Re-home ALL current functionality (publish checklist, taxonomy quick-add, SEO
snippet, runtime preview, duplicate) into these `SectionCard`s — no feature loss.
Wire the new `visibility` value from `EntryDetail` into the panel props
(514-04 renders the control; 514-03 threads state + the onChange → metadata PATCH).

**Revisions seam (NOT the drawer):** add a `History`-icon `Button` in the
PageHeader actions AND a `revisionsSlot?: ReactNode` prop (default `undefined`,
renders nothing) that 487-02-L02's `EntryRevisionDrawer` plugs into. No revision
fetch/render here.

Error handling: preserve existing save/publish error toasts; visibility/password
changes flow through the same metadata-save path (optimistic → server confirm →
`hasPassword` refresh). Regression-test shape (Vitest admin/UI): render editor,
assert PageHeader + Content/Media `SectionCard`s present; **assert a content type
with an EXTRA authored group/tab (e.g. a `layout.tab`/`layout.section` field)
renders that group as its own `SectionCard` and does NOT drop the field** (guards
against the two-card flatten); assert Title/Slug render at the top of the Content
card; assert visibility control change triggers the metadata save with the expected
payload; assert the History trigger + `revisionsSlot` insertion point render.

### 514-04 — Metadata panel: Publish / Taxonomy / Metadata cards

**File:** `core/admin/ui/entries/EntryMetadataPanel.tsx` (sole writer). Restructure
the panel into three prototype `SectionCard`s inside the 320px column:
- **Publish** — Status `Select` (existing), NEW **Visibility** `Select`
  (`public|private|password`), Schedule row (existing), Separator, Publish +
  Save-draft buttons. When `visibility === "password"`, reveal a password `Input`
  (type=password) with placeholder reflecting `hasPassword` (e.g. "Set password" vs
  "•••••• (set)"); leaving it blank on save = no change. Removing a stored password
  is done by switching Visibility to public/private (the only service-supported clear
  path — see the "Read/write asymmetry" semantics above); there is NO
  standalone clear-while-password button. onChange handlers surface
  `{ visibility, accessPassword? }` (accessPassword typed `string`) up to 514-03's
  save path.
- **Taxonomy** — Category `Select` + Tags (existing quick-add preserved).
- **Metadata** — `dl` with Created / Updated / Author / **Entry ID** rows sourced
  from real `EntryDetail` (`createdAt`, `updatedAt`, `author.name`, `id` in
  `font-mono`). This replaces the mocked prototype values with persisted data;
  the prototype's `ent_8f21a0` is a mock — render the real UUID (or a short
  prefix) instead.

Keep the SEO `SectionCard` present but only the existing `description` field
(487-03-L02 owns the extra SEO inputs; 514-04 only establishes the card).
Data flow: props in = `EntryDetail` fields + change callbacks; no fetch here.
Regression-test shape (Vitest UI): assert three cards render; Visibility change to
`password` reveals the password input; Metadata card shows real created/updated/
author/id; NO standalone clear-password button (removing a password = switching
Visibility to public/private, which the service clears).

### 514-05 — Entries list: list/grid view toggle + row fidelity

**Files:** `EntryList.tsx` (main), `EntryTable.tsx`, `EntryGrid.tsx` (unused by
the admin runtime but imported by one UI test —
`tests/vitest/ui/analytics-settings-entries-seo-leafs.test.tsx:13`, updated in
lockstep per 514-05 §6), `EntryFilters.tsx`.

Wire a real list/grid toggle in `EntryFilters` (mirror the prototype `FilterBar`
view toggle): a `view: "list" | "grid"` state owned by `EntryList`, persisted
however the file's existing filter state is (do NOT invent new persistence).
`EntryList` renders `EntryTable` when `view === "list"` and the now-imported
`EntryGrid` when `view === "grid"` — both fed the SAME `entries` data + handlers
(`onEdit`/`onDuplicate`/`onDelete`). `EntryGrid` must reach real parity (currently
94 lines, verify it handles the live entry shape; extend if it lags).

**Row fidelity is a small tweak, not a rebuild (see corrected Gap #7 + 514-05
§4a, the committed source of truth):** the mono sub-line and author `Avatar`
already exist in `EntryTable` — do NOT add the prototype's non-persisted
`title.length` mock hash. Per 514-05 §4a, swap the sub-line CONTENT from
`entry.slug` to `entry.id.slice(0, 8)` in the existing mono styling (short, real,
prototype-faithful id), and per §4b trim the author column to the first name
token. Add the `visibility` badge (non-`public` only) to the row — its data
source is guaranteed by 514-01 (list projections carry `visibility`) mirrored
onto the client `EntrySummary` by 514-02, so the badge reads `entry.visibility`
directly with no extra fetch.
Regression-test shape (Vitest UI): toggle switches between table and grid, both
render the same entries; author avatar + short-id (`entry.id.slice(0,8)`) mono
sub-line present; visibility badge renders when non-public.

## Coordination with TASK-487 (scopes distinct — DO NOT duplicate)

TASK-487 (all subtasks currently `⏳ To Do`) owns: revision backend + restore
(487-01), **admin revision drawer UI** (487-02-L02), entries-client revision
methods (487-02-L01), entry-create tags input (487-03-L01), and **full SEO-field
surfacing** title/canonicalUrl/robots (487-03-L02).

TASK-514 therefore:
- **Leaves a clean revisions seam, does NOT build the drawer.** 514-03 adds a
  "History" trigger affordance (a `History`-icon `Button` in the PageHeader
  actions + a `revisionsSlot?: ReactNode` prop / documented insertion point) that
  487-02-L02's `EntryRevisionDrawer` plugs into. No revision fetch/render in 514.
- **Does NOT add SEO title/canonicalUrl/robots inputs.** 514-04 restructures the
  SEO `SectionCard` layout and keeps ONLY the existing `description` field; the
  extra SEO inputs are 487-03-L02's job — 514 establishes the card they slot into.
- **Shared-file conflict flag:** `EntryMetadataPanel.tsx` (514-04 vs 487-03-L02 SEO,
  487-02-L02 drawer trigger), `EntryEditor.tsx` (514-03 vs 487-02-L02),
  `entriesClient.ts` (514-02 vs 487-02-L01), `entryService.ts`/`contentEntryRoutes.ts`
  (514-01 vs 487-01). See Land Order + openQuestions for the rebase decision.

## Sequential Land Order (strict)

1. **514-01** (backend: schema + migration + service + validation + routes)
2. **514-02** (admin client: visibility types round-trip) — needs 514-01 shapes
3. **514-04** (metadata panel: Publish/Visibility/Metadata cards) — needs 514-02 field
4. **514-03** (editor layout wires the panel + visibility + revisions seam) — needs 514-04
5. **514-05** (list view toggle + row fidelity) — needs 514-02 for the visibility badge
6. **514-06** (tests/docs/closure, changelog 1226)

## Validation (whole task)

- Bun lanes: entry route/integration suite (visibility PATCH round-trip 200 +
  reject-unknown 400 + password never echoed), migration up/down against the
  resettable local DB.
- Vitest (Bun-free): `contentSchemas` allowlist (visibility enum, reject unknown,
  `accessPassword` present-only), admin UI render/interaction for the redesigned
  editor + list toggle.
- Gates: root `tsc -p tsconfig.json --noEmit` (tests included — see the typecheck
  scope gotcha), `bun --cwd core lint:types`, `gates:coderso`.
- **Runtime smoke (mandatory, ≥5 real-flow scenarios, 514-06):** live admin
  `coderso-a.localhost:5173`, light + dark, 0 console errors — (1) edit entry:
  Content/Media/right-column layout matches prototype side-by-side; (2) set
  Visibility public→private→password (password field appears/persists, reload
  shows `hasPassword`); (3) Metadata card shows real Created/Updated/Author/Entry
  ID; (4) list list↔grid toggle renders both real views; (5) publish flow +
  checklist + taxonomy still work in the new layout. Screenshots to
  `_docs/_workflows/_smoke/`.

## Non-Goals / Deferred

- Revision drawer (TASK-487-02-L02) — seam only.
- SEO title/canonical/robots inputs (TASK-487-03-L02) — card only.
- Public-front enforcement of `private`/`password` visibility — **owner-confirmed 2026-07-06:
  deferred to its own task, `TASK-517` (Entry Visibility — Public Front Enforcement).** 514
  persists + surfaces + respects-in-admin; 517 gates the public render path (private→auth/404,
  password→prompt). Do NOT implement front enforcement in 514.
- Entry-create drawer redesign / tags input (TASK-487-03-L01) — untouched here.
