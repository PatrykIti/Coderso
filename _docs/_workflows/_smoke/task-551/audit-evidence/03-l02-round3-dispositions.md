# TASK-551-03-L02 — Round-3 dispositions (orchestrator record, 2026-09-25)

Source: Round-2 auditors S1-A/S1-B (services), S2-A/S2-B (UI), S3-A/S3-B
(envelope) over the Round-2 parts 1-2 (file 4368 lines, envelope 319/47/32,
occurrences initial/final). Orchestrator-verified facts:
- `FIELD_NAME_PATTERN = /^[a-z][a-z0-9_]{0,63}$/` (keysetCursor.ts:101) — camelCase
  spec names throw `pagination_cursor_config_invalid`.
- `isValidTextField` counts each UTF-16 surrogate unit as 3 bytes (the `<0x800`
  surrogate branch is dead; keysetCursor.ts:220-234): one astral code point = 6.
- `tests/unit/runtime-smoke/smoke-evidence-inventory.test.ts` is RED at HEAD:
  27 tracked files under `_docs/_workflows/_smoke/task-551/` (impl-*.json …) are
  "un-reconciled tracked smoke evidence outside canonical paths".
- Round-1 finding-ID mapping: R2-07..R2-36 were derived from the Round-1 reports
  (S1-A M1-M7/L1-L8, S1-B H1-H6/M1-M8/L1-L8, S2-A H1/M1-M8/L1-L6, S2-B M1-M9/L1-L5,
  S3-A H1/M1-M8/L1-L4, S3-B M1-M5/L1-L4); the mapping table is appended at the end.

## S1 (services/routes) — HIGH

R3-01 KeysetSpec field names are lower snake_case matching keysetCursor.ts:101:
`updated_at`, `created_at`, `starts_at`, `sort_value`, `name_key`, `id`; fix the
R2-12(f) literal (:3346), C4 (:2278), R2-05 (:3205), R2-15 (:3396); add a DB-free
test in task551BoundedAdminLists.test.ts running every exported spec factory
through `normalizeKeysetSpec`; R2-12(e) sha256 pins computed over the corrected
names, one pin per spec VARIANT for custom-screen (field-text asc/desc, system
timestamp asc/desc, publishedAt) and one per fixed family.
R3-02 Text sort-key cap: 85 code points (85 × 6 = 510 ≤ 512 under the landed
counting) — `left(…, 85)` for `sort_value`, `name_key` and the system `title`
sort; restate the byte proof against keysetCursor.ts:220-234; tests: "85 emoji
page cleanly; 120-emoji source truncates to 85 and still pages"; keysetCursor.ts
stays forbidden (no 03-L01 re-open).
R3-03 Booking exclusion races: `withReservationExclusion` (create + reactivation
single-statement writes) retries SQLSTATE 40P01 (deadlock from concurrent
exclusion checks) at most 2 attempts; the retry then observes the committed
winner and maps 23P01 → `booking_slot_unavailable`; DB-free predicate cases for
40P01; the 50-way race keeps "exactly one active row, 49
`booking_slot_unavailable`, no other code"; cause-walk bound = candidates at depth
0..8 inclusive (9), tests depth 8 true / depth 9 false; global blackout test uses a
marker-unique far-future window deleted in `finally`; the week-cap test scopes to
the marker resource with non-overlapping rows.

## S1 — MEDIUM/LOW

R3-04 Admin-set lock proof independent of the ambient baseline: in
task551AdminWriteConcurrency.test.ts a second session holds
`pg_advisory_xact_lock(551031, 1)`; each of setUserRoles/disableUser/deleteUser/
updateUser/updateRoleWithTransition/deleteRole on marker rows is proven to WAIT
(`pg_locks` locktype advisory, classid 551031, objid 1, objsubid 2,
granted=false) before any count statement; release → completion; keep the
baseline-relative race as extra coverage, pinned to `b ≥ 1` with the `b = 0`
branch stated as not asserted on the shared DB.
R3-05 Backup users-section restore (backupUsersSection.ts:456-551,
backupImport.ts:858-865) is OUT of 03-L02 scope: record the two lockout
definitions (restore counts any-status admins) and a C17 handoff to the backup
owner (no TASK-551 leaf owns it → TASK-9999-eligible? NO — security impact;
record as an explicit follow-on note in C17 for the owner to allocate).
R3-06 `encodeAdminBoundary(spec, keys, values)` and
`ADMIN_LIST_CURSOR_PARAM_SCHEMA` (`{type:"string",minLength:1,maxLength:2048}`)
are owned by `core/services/database/adminListScope.ts` (budget ≤200 re-checked;
raise to ≤260 if needed).
R3-07 Week cache invalidation: bookingClient `createBookingReservation`/
`updateBookingReservationStatus`/`clearBookingCache` and the client's own
cacheBus subscription clear the week Map and bump its generation; BookingPage's
`bookingReservationsList` subscriber force-revalidates the active week query;
bookingClient.test.ts pins same-tab + broadcast invalidation; 10-L02 ADMIN_CACHE_MAP
handoff lists the week key.
R3-08 FINAL download: the route installs the no-store triple
(`Cache-Control: private, no-store` …) before the binary lane result on 200 and
on 403/404/409 — cross-leaf requirement on 08-L03 C1 binary responses (mirror note
in 08-L03); FINAL test asserts all three headers.
R3-09 Export token secret: FINAL requires a configured
`FORM_SUBMISSIONS_EXPORT_TOKEN_SECRET` (documented in `.env.example` via the
10-L02 handoff) and shared artifact storage for multi-replica deployments;
single-replica: restart invalidates tokens — documented in the Security Contract
and C17; test: a token verifies across a different process-local secret when the
env secret is set.
R3-10 Collision inventory adds the two hashtext two-key locks
(`coderso:session-user:v1` C5 O3; `coderso.task551_rollout_advisory_lock`);
rolesService.test.ts DB leg asserts both `hashtext(...) <> 551031`; the suite
advisory lock (R2-31/C13) gets code-owned constants (551_032, 1) in the inventory.
R3-11 Fence codes `native_cms_writer_fence_failed`/`_lost` map to 503 alongside
busy/recovery in both mappers (pinned DB-free).
R3-12 R2-04 Ajv patterns pinned per parameter: linear anchored
`^<uuid>(,<uuid>){0,99}$` with the fixed-width lowercase UUID token; `ids`
lowercased before the duplicate check; mixed-case duplicate case in the route
suite; `fields`/`types`/`tags` analogous with their token rules.
R3-13 R2-05 strict schema shape: `patternProperties`
`^fieldFilter\.[A-Za-z][A-Za-z0-9_-]{0,79}$` and
`^systemFilter\.(title|slug|status|createdAt|updatedAt|publishedAt)$` → string
1..256, `additionalProperties:false`, post-Ajv count ≤ 8 → `validation_error`;
`ids`+`fields` projection owner = customScreenEntryReadService.ts (entryReadService
serves `ids` without `fields`); typed-parent slug lookup at the route is outside
the 3-statement service ceiling (declared).
R3-14 Supersessions: C6 bullet 1 (for FINAL), C3 :2205-2208 (LIMIT 301/201),
C4 route-order test rewritten in FINAL; UTF8 `server_encoding` precondition in
C13 pre-dispatch; anchors listed by S1-A L1 refreshed in one dated pass (or the
preamble states "quoted text is authoritative").

## S2 (clients/UI/tests/smoke) — MEDIUM/LOW

R3-15 Types: `AdminListPage<I> = {items,nextCursor,hasMore}`;
`AdminListEnvelope<I,S,F> = AdminListPage<I> & {summary,facets}`; persisted/stale/
empty results are `AdminListPage<I>`; `useBoundedAdminList` treats a missing
summary as not-loaded (skeleton, never a dereference); `PageListEnvelope`/
`PostListEnvelope` defined explicitly; posts slot stays the D2 three-key shape.
R3-16 Stale-by-generation completions resolve the NEWER in-flight promise for the
same key if present, else verified memory, else the persisted default slot, else
empty; plain empty only on family/installation reset; test: a forced overtake never
resolves the earlier caller to empty while the newer request succeeds.
R3-17 `useBoundedAdminList` pseudocode: signature `(fetchPage, filters,
{hydrate})`, reducer actions with request tokens (ignore non-latest), lazy
initializer hydration, async-callback dispatch only, append dedupes by `id`,
`error` status, summary `S | null`; owning test task551PaginatedListViews with a
duplicate-id append case; `upsertCachedPost` prepend → dedupe on load-more.
R3-18 `adminUsersClient` is memory-only (no persisted slot, no storage key; PII),
exports its default constant; task551PaginatedClients asserts no users list value
reaches storage; reset registration pinned.
R3-19 C11 v3 budgets (measured with glue): UsersRolesPage ≤ 820,
MenuEditorWorkspace ≤ 550, PageEditorToolbar ≤ 910, Media ≤ 900, Booking ≤ 950,
controller ≤ 990; ranges re-anchored (PostEditorCanvas dialog :1464-1523; toolbar
recovery :614-730; UsersRoles :165-261 minus the matchMedia effect :200-207 and
:262-348 minus selection derivations :303-312 which stay in the page;
menu-design-editor harness first range :666-758 incl. the saved-document types).
R3-20 `page-editor-host-contract.test.ts` joins the allowlist + line-count-3;
its new assertion = "imports no Admin client module (core/admin/services/*)" +
type-level `data`-free pin.
R3-21 `w0-revision-vitest` += canvas-editor-panel-toggle-dedupe.test.tsx,
menu-design-editor.test.tsx, page-editor-facade.test.ts,
engine-detail-template-restyle.test.tsx (46/46); C10 v2 states W0 creates the
revision split siblings its gate names.
R3-22 Leg-3 regex gains a directory-index stem for `*/index.ts` allowlist
entries; `tests/integration/routes/pageTemplates.test.ts` joins
`owned-module-consumers-bun` (41/41); leg-3 count re-pinned.
R3-23 Smoke evidence: screenshot dir `03-l02/<session>/` derived from
`input.session`; inventory gloss
`^_docs/_workflows/_smoke/task-551/03-l02/[a-z][a-z0-9-]{2,63}/[a-z0-9-]+\.png$`;
10-L01 root artifacts routed through a gloss this leaf adds; PLUS the family
receipt gloss: `^_docs/_workflows/_smoke/task-551/(impl-[a-z0-9-]+\.json|audit-evidence/.*|inventory-rebase-kit/.*)$`
so the inventory test (RED at HEAD, 27 tracked files) turns green as a W0
precondition fix owned by 03-L02 (the test is allowlisted); record the HEAD-red
fact in C14 v3.
R3-24 C9 v2 reset clears the persisted slot — supersede the Round-1 C9 bullet
(:2503-2504 "storage envelopes stay with L04 FINAL") explicitly; reset test pins
the clear.
R3-25 Posts: `listPosts(filters = DEFAULT_POST_LIST_FILTERS, cursor = null)`
stays the exported name (no `listPostsPage`), keeping postsClient.test.ts:13/:59 1:1.
R3-26 LOW bundle: caption anchors (video :904-907, audio :1010-1013, image has
no fallback; C12 "caption detail read" superseded); `digestExactOwnedRowIdentity`
→ suite-local owner in worker-operations.ts; registry land-order note adds
TASK-414-11-L01; browser-action materialization test for task-490
browser-actions.ts (allowlisted, FINAL) + forms-submissions-restyle in
final-line-count; editor-surface-dead-code.test.ts as an execution-only receipt
after new files are staged; `displayField` nested-path drop → 10-L02 handoff;
controller anchors :123-127/:258-263; harness-consumer count 14; SiteSettings
:258 uses `pagesMountOptions.force`, :325 subscriber call.
R3-27 10-L01 mirror: dated correction citing C15 v2 — cleanup = RunFixtureLedger
exact ownership (prefix is a human marker only), profiles fast+certification,
root-artifact gloss handoff.

## S3 — (appended after S3-A/S3-B reports)

R3-28 (S3-B HIGH) Admin-set lock shape: rolesService exports a tx-scoped
`acquireAdminSetLock(tx)`; every locked writer that is a fence owner keeps its OWN
`db.transaction(async (tx) => { await acquireNativeCmsWriterFence(tx); await
acquireAdminSetLock(tx); … })` (deleteUser keeps exactly one `transaction(` whose
callback starts with the fence call, so nativeCmsWriterFenceInventory.test.ts
:347/:414 stays green); each usersService function keeps exactly one
`update(users)` site (updateUser: one locked write, no separate unlocked write);
`withAdminSetLock` is not a transaction owner. Supersede :2984-2990, :3015.
R3-29 (S3-B M1) `none`-profile execution for bun-test and vitest lanes is a closed
map: `env -i PATH=<PATH> HOME=<HOME> DATABASE_URL=postgresql://127.0.0.1:1/none`
— no other DB/maintenance keys; the orchestrator never sources `.env` for `none`
commands; mirrored in Validation Commands (:1127-1144).
R3-30 (S3-B M2) Type/lint gates (`core-lint-types`, `core-lint`, `repo-lint-types`)
are judged at W0, W1, after W3 (covering W2+W3 together because W2 changes client
signatures the views adapt only in W3) and at closure; the W2 "by path" subset is
replaced by a named envelope command `w2-client-vitest` listing only the pure
client suites (task551PaginatedClients + the eight *Client*.test.ts + formsClient
+ pagesClientPagination); `repo-lint-types` carries the sibling pre-leaf baseline
rule (07-L01 :1617-1620 / 09-L04 :1184 form).
R3-31 (S3-B M3) `line-count-1..3` run only at W4 and closure; C14 v3 states the
orchestrator parses `wc -l` output and any per-file count > 1,000 or a missing
path fails; prose gate `bash /home/coder/project/Coderso/.claude/scripts/line-gate.sh
<pre-family baseline>` run with cwd = worktree; the W4 file assignments
(adapter/worker files + tests, bookingPageFixtureState/Mocks/Harness.tsx) move
from the FAZA-0 record into C14 v3.
R3-32 (S3-B L1-L4) C17 query-inventory delta adds the R2-01 usersService/
rolesService rows (countUsersWithRoles/getAdminUserIdsExcluding/userHasAdminRole
replaced by countActiveAdminUsers/isActiveAdmin + lock statements) and the R2-02
bookingMutationService rows; sentinel rule in C13 (fixture-target bootstrap output,
32–512 UTF-8 bytes, no NUL, never hand-authored); FINAL pre-dispatch check names
the exact 08-L03 exported binary-lane type/helper (pinned by the FINAL FAZA-0
amendment; absence fails dispatch); cross-stream whitespace failures in
diff-check are triaged as cross-stream (C14 v3 note).

R3-33 (S3-A HIGH) tests/unit/workflows/task551AuthorAudit.test.ts pins
`occurrenceCount: 32` at :327, :336, :742, :991 → 33 (verified RED: 3 fail);
owner TASK-551-11 (allowlist :86): dated 11 correction + mechanical re-pin;
the TASK-551 parent R2-06 correction records the handoff; rerun DB-free.
R3-34 (S3-A M2) pageService.ts is owned by TASK-551-09-L02 (allowlist :328), not
03-L02: correct 06-L02 :696-698; 09-L02 dated mirror takes the hash-only author
email rule for legacy `listPages` (`author` null when no resolved email — same rule
as 06-L02 R6) or records it stays unchanged; 03-L02 C10 v3 pins the same rule for
the new `pageReadService` DTO with a route-suite assertion.
R3-35 (S3-A M3) C13 v3 pre-dispatch precondition adds: all 89 online indexes of
`0081_task551_online_indexes.sql` present with `indisvalid AND indisready` on
coderso02 (provisioned 2026-09-25; sha256 35399069…b092) — blocking for
`admin-list-performance-test` and `bounded-admin-list-bun-tests`; PII keys: owned
DB suites seed test-only `PII_HASH_KEY`/`PII_ENC_KEY` (`||=` precedent
usersService.test.ts:16-17); foreign-suite failures caused only by the closed env
are reported, not fixed.
R3-36 (S3-A M4 = S3-B M2) `repo-lint-types` adopts the 07-L01 C1(e) rule: root-tsc
baseline captured before W0; fail only on NEW errors located in 03-L02
allowlisted files.
R3-37 (S3-A LOWs) TASK-551-03 child mirror (8 scenarios; order "… 08-L03 FINAL →
03-L02 FINAL → 03-L03 …"); C17 v3 wording: 10-L01/TASK-551-10 carry
`wf551l01admin`/`certification`, 10-L02 documents 03-L02's `wf55103l02` run;
bun-lane-manifest: 01-L01 FINAL regenerates it through the classifier including
03-L02's new Bun suites (recorded as open in the parent until 01-L01 mirrors it);
03-L02 Dependencies header records the FINAL dependency on the 08-L03 FINAL binary
lane; 03-L03 header clarified ("03-L02 INITIAL transitively; no FINAL edge");
harness-consumer count 15 → 14; pageService.test.ts anchor :197 → :198;
`final-line-count` += forms-submissions-restyle.test.tsx; `none` child env stated
in C14 v3 (R3-29).
