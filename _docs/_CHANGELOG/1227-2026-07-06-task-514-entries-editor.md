# 1227 - TASK-514 Entries Editor — Prototype Fidelity & Entry Visibility

Date: 2026-07-06
Version: Unreleased
Tasks: TASK-514, TASK-514-01, TASK-514-02, TASK-514-03, TASK-514-04, TASK-514-05, TASK-514-06

## Key Changes

Brings the **Entries** area (list + single-entry editor) to prototype fidelity
(`_docs/_PROTOTYPE/src/pages/advanced/EntriesPage.tsx` + `EntryEditorPreview.tsx`,
mirroring the Engine sibling), matching the TASK-479 Soft-Violet redesign, AND adds
the schema the prototype implies (**entry Visibility**: public / private / password).
The current admin's richer functionality (publish checklist, taxonomy quick-add, SEO
snippet, bulk actions, runtime preview, duplicate) is PRESERVED and re-homed into the
prototype's `SectionCard` structure — a layout/structure fidelity + additive-control
task, not a feature reduction.

- **Entry Visibility schema, migration, service, validation, routes (514-01, migration
  `0069_past_leopardon`):** two additive columns on `content_entries` — `visibility text
  NOT NULL DEFAULT 'public'` (enum `public|private|password`) and `access_password text`
  (nullable argon2 hash, write-only). Journal `idx:69`, `meta/0069_snapshot.json`. Legacy
  rows read byte-identical (`public`, no password). `entryService` gains
  `EntryVisibility`, extends `EntryDetail`/`EntryListItem` with `visibility` +
  derived `hasPassword` (`access_password IS NOT NULL`), and NEVER selects the secret
  into any read/list/detail projection (all three projections carry `visibility` +
  `hasPassword`). `updateEntryMetadata` hashing branch is keyed on `visibility` (not
  password presence): a precondition rejects `password` + no supplied password + no
  existing hash with `entry_password_required` BEFORE any status/publish write (combined
  `{status,visibility}` PATCH fails atomically); `password` + supplied password → hash +
  store; `password` + omitted password + existing hash → keep; `public`/`private` → clear
  the hash. `duplicateEntry` copies `visibility` but downgrades a `password` source to
  `private` and never copies the hash. `contentEntryMetadataSchema` adds the
  `visibility` enum + write-only `accessPassword` (`maxLength:200`) inside the intact
  `additionalProperties:false` allowlist (unknown key / out-of-enum → 400); the route
  passes both through and maps `entry_password_required` → 400.
- **Admin client visibility round-trip (514-02):** `entriesClient` mirrors
  `EntryVisibility` and adds `visibility` + `hasPassword` to the SHARED `EntrySummary`
  (so both list and detail models carry them), extends the cache projection
  (`toEntrySummary`) so cached list/detail reads never silently drop `visibility`, and
  extends the metadata-update payload with `visibility?` + `accessPassword?` (send-only —
  `accessPassword` never lands on any cached read model). `hasPassword` is refreshed from
  the server response, never inferred client-side.
- **Entry editor prototype-fidelity layout (514-03):** replaced the `AdminShell` sticky
  action bar with an in-page `PageHeader` (breadcrumbs `Entries › {type}` + title +
  Save-draft / Publish / **History** actions) and a `lg:grid-cols-[1fr_320px]` grid. The
  per-field `Card`s become `SectionCard`s driven by the EXISTING authored grouping
  (`resolveTabLabel` + `layout.tab`/`layout.section`): the default "Content" group is the
  prototype's Content card (Title/Slug render at its top), the "Media" group is the Media
  card, and any additional authored group renders as its own `SectionCard` — multi-group
  content types NEVER lose their grouping (guards against a two-card flatten). Repurposed
  the previously-orphaned `EntryEditorHeader`. Added a `revisionsSlot?: ReactNode` seam +
  History trigger for TASK-487-02-L02's drawer (no revision fetch/render here). Visibility
  state threads through the metadata-save path (optimistic → server confirm →
  `hasPassword` refresh).
- **Metadata panel — Publish / Taxonomy / Metadata cards (514-04):** restructured
  `EntryMetadataPanel` into prototype `SectionCard`s in the 320px column. **Publish** adds
  a Visibility `Select`; when `password`, a password `Input` reveals with a placeholder
  reflecting `hasPassword` (blank on save = unchanged). There is NO standalone
  clear-password control — removing a password = switching Visibility to public/private
  (the only service-supported clear path). **Metadata** is a new `dl` showing REAL
  `createdAt`/`updatedAt`/`author.name`/`id` (`font-mono` Entry ID) instead of the
  prototype's mock values; the author no longer duplicates in a footer. The SEO card keeps
  only the existing `description` field (TASK-487-03-L02 owns the extra SEO inputs).
- **Entries list — list/grid toggle + row fidelity (514-05):** wired a real list/grid view
  toggle in `EntryFilters` (`view`/`onViewChange`, aria-pressed) with `view` state owned by
  `EntryList` and persisted via the existing filter-state pattern; `EntryList` renders
  `EntryTable` (list) or the now-live `EntryGrid` (grid) fed the SAME data + handlers. Both
  row/card surfaces show a `visibility` Badge for non-public entries (Private / Password
  with `EyeOff`/`Lock` icons) and a real short-id mono sub-line (`entry.id.slice(0,8)`, not
  the prototype's non-persisted `title.length` mock hash). The region-owned leaf test
  (`analytics-settings-entries-seo-leafs.test.tsx`) was updated in lockstep with the
  `EntryGrid`/`EntryFilters` prop-contract change.
- **Tests, docs & closure (514-06):** completed the closure test surface — Bun route
  error-mapping + wiring lane (`contentEntriesRoutes.test.ts`: `entry_password_required` →
  400 without leaking the secret, no new RBAC bucket), the DB service round-trip lane
  (`entryService.test.ts`: public→private→password round-trip, `hasPassword` never echoing
  the secret, present-only omit, clear on public/private, reject-before-write atomicity,
  duplicate downgrade, all three read projections), the `contentSchemas` allowlist lane
  (`schemaValidator.test.ts`: enum accept/reject, unknown-key reject, `accessPassword`
  maxLength), the client cache round-trip (`entriesClient.test.ts`: visibility/hasPassword
  round-trip, `accessPassword` never cached), the editor layout + visibility groups
  (`entry-editor-visibility-groups.test.tsx`), the metadata cards
  (`entry-metadata-panel.test.tsx`), and NEW `entry-list-visibility-view.test.tsx` closing
  the non-public visibility Badge + list/grid toggle gap the leaf test left. Synced
  `DATA_MODEL.md` (visibility columns + write-only-secret + duplicate rule); closed board +
  all task files.

## Scope

- Migration `0069_past_leopardon` (TASK-480 owns `0066`, TASK-512 owns `0067`, TASK-513
  owns `0068`). Additive with defaults → safe on existing rows.
- Security: `accessPassword` is hashed (argon2 via `hashPassword`) before any persistence,
  never stored/logged in plaintext, and `access_password` is OMITTED from every read/list
  projection — responses expose only the derived boolean `hasPassword`. The metadata PATCH
  rides the EXISTING `content:write` permission (no new endpoint / RBAC bucket). The
  request schema stays `additionalProperties:false` (unknown key / out-of-enum → 400).
  Clearing the credential is authorized under the same write permission via a
  visibility switch.
- Public-front ENFORCEMENT of `private`/`password` on the render path is OUT OF SCOPE —
  514 persists + surfaces + respects-in-admin only; enforcement is deferred to the separate
  **TASK-517** (Entry Visibility — Public Front Enforcement). TASK-487 (revision drawer +
  extra SEO fields) slots into the seams 514 leaves (History trigger + `revisionsSlot`, SEO
  card).

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/tsc -p tsconfig.json --noEmit`
- `bun run test:bun`
- `bun run test:vitest`
- `bun run gates:coderso`
- Live ≥5-scenario prototype-fidelity playwright smoke (editor layout side-by-side
  light+dark, visibility public→private→password round-trip + `hasPassword`, visibility
  clear, Metadata card real values, list↔grid toggle persistence, publish/checklist +
  taxonomy regression) deferred to the orchestrator post-merge (the running dev host serves
  the main tree, not this worktree).
