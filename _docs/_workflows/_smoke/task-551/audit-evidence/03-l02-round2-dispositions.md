# TASK-551-03-L02 — Round-2 dispositions (orchestrator record, 2026-09-25)

Source: six Round-1 auditors (S1-A/S1-B services, S2-A/S2-B UI, S3-A/S3-B envelope)
over the Round-1 corrections (C1–C17) at HEAD 9c5b6666 (dirty: 03-L02 + mirrors).
Every finding below was verified by the orchestrator against files/command output
before disposition. Writers apply these dispositions verbatim as dated,
append-only "Round-2" corrections; they may refine mechanics only where a
disposition says "writer verifies/decides".

Orchestrator facts established 2026-09-25:
- DATABASE_URL3 (coderso02) ledger was 79/80: migration 0081 was missing (no
  `bookings_active_resource_window_excl`). Applied 2026-09-25 by the orchestrator
  (43 statements + ledger insert with the drizzle hash convention verified on
  0080); ledger now 80 = HEAD journal; constraint present. `drizzle-kit migrate`
  exits 1 silently on this DB even though every statement succeeds (tooling quirk,
  recorded, not a product defect).
- `pageService.test.ts` already asserts on `.items` (:198, :273); only
  `pageRevisionAutosave.test.ts:136,:149` still use `toHaveLength` on the envelope.
- `RouteContext.query` is `Record<string,string|undefined>` built with
  `Object.fromEntries(url.searchParams.entries())` (httpServer.ts:495): repeated
  keys collapse to the LAST value; both transport files are forbidden.
- `acquireNativeCmsWriterFence` takes a SHARED advisory lock
  (nativeCmsWriterFence.ts:103): it never serializes two writers.
- `CursorFieldType = "text"|"uuid"|"timestamp"|"integer"|"boolean"` — no numeric.
- Trigram source contract covers pages, content_entries, posts, media, users
  (searchVectorDefinitions.ts:108-140).
- The dispatch parser requires a lone `single` occurrence (dispatch-contract.mjs:873);
  a second occurrence forces `initial`+`final` ids and graph nodes.
- `tests/integration/routes/forms.test.ts` is allowlisted by 09-L01 (:820) and
  forbidden by 03-L02.

## HIGH

R2-01 Role race (S1-A H1, S1-B H1, S3-A M8, S1-B M6). Serialize every admin-set
change (`setUserRoles`, `disableUser`, `deleteUser` in usersService.ts and the
role-level `last_admin` paths in rolesService.ts) on ONE exclusive
`pg_advisory_xact_lock(<ns>,<key>)` with code-owned int4 constants (follow the
revisionAllocation.ts convention; add them to the existing namespace-collision
test), taken inside the transaction BEFORE the admin count; keep the writer fence
as an additional guard. Last-admin semantics become: users with `status='active'`
holding a full-access role (intentional fix, documented in C5 and the usersService
unit test: a disabled admin no longer counts). Map the fence codes
(`native_cms_writer_fence_busy`, `native_cms_writer_recovery_required`) in
`mapAdminUserError` and the roles mapper (503). Envelope: add
`core/services/admin/rolesService.ts` and `tests/unit/admin/rolesService.test.ts`
to the allowlist, `test551-db-unit` and `line-count-3`. Shared-DB precondition
(S3-A M8): the race suite reads the non-marker active-admin baseline under the same
exclusive lock and asserts deltas relative to it (baseline 0 → exactly N-1 of N
fixture demotions succeed; baseline ≥1 → all N succeed); it never deletes foreign rows.

R2-02 Booking races (S1-A M6, S1-B H2). Product rule: a blackout MAY overlap
active reservations (unchanged behaviour); drop the blackout-vs-reservation proof
and all `hashtext(...)` advisory locks. Reservation correctness = migration 0081's
exclusion constraint: `createBookingReservation` and
`updateBookingReservationStatus` (reactivation to pending/confirmed) map SQLSTATE
23P01 on `bookings_active_resource_window_excl` to `booking_slot_unavailable`
(writer verifies whether `bookingReservationExclusion.ts` already exports a
violation predicate; if not, match `constraint_name` in bookingMutationService).
Tests: 50-way create race → exactly one active row; reactivation race against an
overlapping active row → 409 `booking_slot_unavailable`; global blackout create
has no lock and no conflict read.

R2-03 Cursor mapper (S1-A L1, S1-B H3). Supersede C4 :2141-2142: every
`cursor_*` code except `cursor_scope_mismatch` maps to generic `cursor_invalid`
(400); `cursor_scope_mismatch` 400 same-code; `page_limit_invalid` 400;
keyring unavailable 503 `pagination_unavailable`. Pinned in
task551BoundedAdminLists.test.ts.

R2-04 Multi-value query params (S1-A H2, S1-B H4). Single-key comma-separated
encodings: `ids=<uuid>,<uuid>` (1..100 unique, ≤3,700 chars),
`fields=<key>,...` (≤12, `^[A-Za-z0-9_]{1,64}$`), media `types`/`tags`
(≤20 tokens each). The transport collapses repeated keys to the last value
(documented, not detectable at the route); the client serializer never repeats a
key; strict schemas reject malformed lists with `validation_error`; tests at
schema level (route suite) and client level (task551PaginatedClients).

R2-05 D3 custom-screen list (S1-A M4, S1-B H5, S1-A M3). Owner of both D3
statements: NEW `core/services/customScreens/customScreenEntryReadService.ts`
(allowlist, ≤600 lines) — not entryReadService.ts. Sort key: derived-table alias
`sort_value = NULLIF(left(regexp_replace(normalize(data->>key,NFC),'[\x00-\x1F]','','g'),120),'')`
(nullable text, nulls last, ≤120 code points ⇒ ≤480 bytes < 512), the same
expression for the system `title` sort on the `title` column; KeysetSpec field
`sort_value` text nullable + `id`. Accepted UX delta (documented in C3): server
text collation replaces the client's numeric/date-aware `localeCompare` sort;
ISO dates still order correctly. No view-config lookup: the server validates
structurally (fields ≤12, filters ≤8, each value ≤256 chars, keys regex); RBAC
already gates the collection. Filters: scalar `data->>key = $v`; array-valued
`data->key @> to_jsonb($v)` chosen by `jsonb_typeof`. Filter options:
`jsonb_array_elements_text` for arrays UNION scalar text, cap 50 + `truncated`.
Scope digest = sha256(canonicalJson({filters, fields, sortField, sortDir})).
Statement ceiling stays 3.

R2-06 Export download owner (S1-A M7, S1-B H6). 03-L02 gains a FINAL
occurrence: envelope occurrences `initial` (everything now) + `final`
(dependsOn `TASK-551-08-L03:final`; plus `TASK-551-09-L01:single` only if 09-L01
actually edits forms.test.ts — mirror writer verifies). FINAL scope: token-guarded
`GET /forms/:id/export-jobs/:jobId/download` (unified spelling `export-jobs`),
legacy sync export route removal, `forms.test.ts` edits, formsClient +
FormSubmissionsPage switch, Security Contract rows. Ownership of
`tests/integration/routes/forms.test.ts` transfers 09-L01 → 03-L02 (09-L01 keeps
executing it read-only). INITIAL: create/status only; the route returns the
service token but the client discards it and the route applies the no-store
triple; supersede :1094-1097 and :500-502 accordingly (S1-B M2, S1-B L9).
Parent graph: rename node `TASK-551-03-L02:single` → `:initial`, add
`TASK-551-03-L02:final`; 07-L02 `dependsOn` → `TASK-551-03-L02:initial`;
land-order list gains "03-L02 FINAL"; 08-L03 and 09-L01 cite 03-L02 FINAL as the
single owner. Remove 08-L03 FINAL / 09-L01 as owners in C17.

## MEDIUM

R2-07 `database-explain-plans-receipt` → profile `none` (DB-free registry receipt
37/38/76); fix C14 :2561, prose :1125, C1 :1933 (this leaf regenerates no L05 plan).
R2-08 DB lane environment: pin a CLOSED child env in C13/C14/Validation:
`env -i PATH=<PATH> HOME=<HOME> DATABASE_URL=<URL3> TASK551_FIXTURE_DATABASE_URL=<URL3>
TASK551_FIXTURE_DATABASE_NAME=coderso02 TASK551_FIXTURE_DATABASE_SENTINEL=<bootstrap sentinel>
PAGINATION_CURSOR_SECRET=<from .env>`; `DB_MAINTENANCE_URL`, `DB_MAINTENANCE_MODE`,
`DATABASE_DIRECT_URL` unset. It is an orchestrator-run execution of the parent's
`task551-db-test` profile, not a redefinition. Pre-dispatch check: URL3 ledger =
HEAD journal (80 entries, 0081, exclusion constraint) — satisfied 2026-09-25.
The rule covers every `task551-db-test` command file (S3-A L4); drop the bare
before/after global-count option (S3-A L1): suite advisory lock or one transaction.
R2-09 `tests/unit/pages/pageService.test.ts`: 03-L02 takes ownership (09-L02's
transfer stands): move from forbiddenPaths to allowlist + `line-count-3`; stays
execution-only in `test551-db-unit` (no edit expected — it already uses `.items`).
Rewrite C10 (drop "blocked"/"red at HEAD"); W0 owns pageRevisionAutosave.test.ts
:136/:149; fix C12 :2489, C14 row, C17 :2650, prose :1118.
R2-10 10-L01 mirror + TASK-551-10 parent scenario union (5 → 8) — mirror writer.
Until landed, C17 wording is "pending mirror". 10-L01 owns a `gates:coderso:perf`
command (`bun scripts/coderso-release-gates.ts --gate performance`, profile per
its DB need — mirror writer verifies).
R2-11 F-31 `deprecated-unused` assertion → dated 01-L01 FINAL correction (mirror
writer); C17 gains an 01-L01 bullet.
R2-12 03-L01 K5/K8 obligations, as a C-section list with owning files:
(a) spec-vs-schema test: every `nullable:false` KeysetSpec field maps to a
`.notNull()` column (task551BoundedAdminLists); (b) microsecond tie-group walk on
real PostgreSQL under `SET TIME ZONE 'Europe/Warsaw'` (same file); (c) keyset reads
only through the Drizzle client from core/db/client.ts — `deps.db` typed as that
client or a transaction of it, never raw postgres()/sessionClient; (d) sanitized
`EXPLAIN (ANALYZE, BUFFERS)` evidence that the K6 bound is an `Index Cond` per
family (budgets suite); (e) scope-version bump rule on field-order change;
(f) show the `to_char(..., 'YYYY-MM-DD"T"HH24:MI:SS.US') AS updated_at_wire`
projection and a DTO mapper after `toBoundedPage`; wrap specs with `normalizeKeysetSpec`.
R2-13 Perf data source: `tests/perf/database-admin-list-budgets.test.ts` seeds and
cleans its OWN marker-scoped closure on URL3 (bounded: ≤20k rows per family,
child-first delete, zero-residue proof), covering every page/summary/facet
statement incl. the 9 new ones and one `q` plan per family; remove the "read-only
100k profile" claim; supersede acceptance :1148-1152 with descriptor equality +
this leaf's own budgets.
R2-14 `q` search: pages/entries/posts/media/users bind `q` to the 05-L01 trigram
expression via `normalizeTask551TrigramSql` on `search_trigram_text` (index-
compatible, byte-identical); forms/submissions/bookings keep bounded declared-
column ILIKE (small admin tables) with a declared budget; reconcile C3 column
lists with TRIGRAM_SOURCE_SQL.
R2-15 Text keyset caps: every text sort key is capped at 120 code points after a
control-character strip with `NULLIF('')` (nullable spec, nulls last); booking
`name_key` is a derived-table alias over `name` (maxLength 160 → cap 120) with a
declared scan budget; encode-side failure maps to 500
`admin_list_cursor_encode_failed`, never a client 400; round-trip tests for empty,
control-char, escape-heavy and 120-CJK/emoji values.
R2-16 Booking write limits stay 300/200 (revert :394-398, :426-427); F-44 exempts
only the facade read.
R2-17 Read-service budgets and owners: bookingReadService ≤950,
customScreenEntryReadService (new) ≤600, entryReadService ≤800; NEW
`core/services/database/adminListScope.ts` (allowlist, ≤200) owns
`canonicalJson` + `deriveAdminListScope`; the client-side `canonicalJson` lives in
`adminListEnvelope.ts`.
R2-18 Week endpoint: `GET /booking/reservations/week?from&to&resourceId`
(reject-unknown, ≤7 days, `booking:read`, `admin_read` bucket, `starts_at ASC`,
cap 500 + `truncated`), `bookingClient.listReservationsWeek` with cache key
family `bookingReservationsWeek` invalidated by reservation mutations; tests in
task551BoundedAdminLists + the Booking UI suite (paging the table leaves the
calendar unchanged).
R2-19 C12 third discovery leg over `tests/` (imports of every allowlisted
production module + literal list-endpoint URLs), pinned hit count; allowlist the
suites whose assertions change (at minimum `tests/vitest/ui/site-settings.test.tsx`,
`tests/vitest/ui-integration/settings-general-site-restyle.test.tsx`,
`tests/vitest/ui/custom-screen-list-view.test.ts`,
`tests/vitest/ui/page-editor-settings-flow.test.tsx`; writer verifies
menu-item-form.test.tsx); new execution-only commands
`owned-module-consumers-vitest-1/-2` (≤128 argv tokens each) incl.
`tests/vitest/pages/page-editor-host-contract.test.ts`.
R2-20 W0 gate: named command `w0-revision-vitest` (5 revision suites +
page-editor-settings-flow + host-contract + the 16 page-editor harness consumers)
and `test551-db-unit`; C14 gains a wave → command-id table (line-count only at
W3/W4/closure).
R2-21 `PageEditorRevision` stays a structural type in pageEditorHostContract.ts
(`createdAt: string`, no `data`, no client import); pagesClient imports it from there.
R2-22 `caption` joins the `admin-media-by-ids` projection; tests for the
video/audio/gallery caption fallbacks in post-editor-media-controls.
R2-23 Client template: in-flight dedupe (`pagePromises.get(key)` before request)
+ per-key generation `Map`; first-page envelopes persist through
`createMemoryBackedLocalCache` under the existing list key as a versioned
envelope `{v:1, filters, items, nextCursor, hasMore}` (legacy array value ⇒ miss);
stale-epoch discard resolves `{items:[],nextCursor:null,hasMore:false}`;
default filters send no query string; `getCachedPosts()` returns the envelope or
`null` when nothing is cached; TASK-554 site list extended to every array-shaped
assertion (mirror writer). Each client exports one default first-page filter
constant used by the view and adminPrefetch (S2-B L2).
R2-24 `ids` consumers gain MenuDesignEditor, SiteSettingsPage, ThemeEditorPage
with client-side chunking by 100 (bounded parallelism 2); relatedEntryResolver
`displayField` projection rule: top-level scalar only, nested → title fallback.
R2-25 C11: Media ≤900, Booking ≤950, controller ≤990 (no-growth rule) or named
extra ranges; menu-design-editor split moves the shared helpers (:694-758,
:1195-1200, :1528-1561, :1882-1895, :2231-2237, :2458-2466) into the harness;
`postEditorCanvasHelpers.ts` (allowlist) owns :77-199 with import direction
canvas/block-item → helpers; media-controls range narrowed to :1204-1209,
:1212-1277, :1308-1378; MenuEditorPage (:57-222, :853-1081) and UsersRoles
(:165-261, :262-348) ranges named; body :185-193 and :171-173 edited to match.
R2-26 Tooling command `repo-lint-types`
(`["./node_modules/.bin/tsc","-p","tsconfig.json","--noEmit"]`, profile `none`),
orchestrator-run between waves next to core-lint-types.
R2-27 Smoke seed/cleanup per cookbook: registered DB worker
(`worker-entry.ts`, `production-handlers.ts`, `cleanup.ts` under the adapter dir,
allowlisted), RunFixtureLedger exact ownership, set-based delete + absence proof,
equal-sort-boundary timestamps written at DB level; adapter modules DB-free at
import (dynamic import inside handlers); registry land-order note vs TASK-555/556/548.
R2-28 Prefetch suites (`tests/perf/admin-prefetch-budget.test.ts` Bun `none`,
`tests/vitest/admin/admin-prefetch-policy.test.ts`) as W2 execution-only receipts in C14.

## LOW (bundle; apply in the same round)

R2-29 Refresh anchors: K1 landed (keysetCursor.ts:193-199 accepts desc/first);
encode :427, decode :683, toBoundedPage :257-306; entryReadService :212/:227,
:315/:350; C8 inventories add `getEntryBySlug` :179, exported types :202-265,
assistant callers actionExecutorTypes.ts:66,:153 and the DI uses.
R2-30 Query-count ceilings count only DML/SELECT statements (BEGIN/COMMIT/SET
TRANSACTION excluded).
R2-31 Session race: save/restore the global security-settings row under the
suite advisory lock (no injectable seam).
R2-32 C7 map: read exports its normalizers/zoned-time helpers internally, the
facade does not re-export them; mutation symbols listed by name.
R2-33 Author facet ordering: `coalesce(nullif(name,''), email_hash) ASC, id ASC`;
displayed email resolved after the query.
R2-34 C17 handoffs: query-inventory rebaseline call-site delta; 09-L04 FINAL
manifest note for `entriesClientPagination.ts` (+ C9 reset checklist); 10-L02
scenario count 8 (mirror writer).
R2-35 `diff-check-untracked`: `-z` + `\0` split, `\r` in the whitespace class;
orchestrator-run `git diff --check <pre-family baseline>` and
`bash .claude/scripts/line-gate.sh <baseline>` recorded as prose gates; the
root `_TMP-S1-spina.md` is never committed.
R2-36 C6 wording: the client discards the create token and uses the legacy
export for download until FINAL.
