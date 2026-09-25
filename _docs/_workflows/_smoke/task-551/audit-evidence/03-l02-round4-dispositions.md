# TASK-551-03-L02 — Round-4 dispositions (orchestrator record, 2026-09-25)

Source: Round-3 auditors (S1-A 0/3, S1-B 1/3, S2-A 0/5, S2-B 0/3, S3-A 0/3,
S3-B 0/7 HIGH/MEDIUM) over Round-3 parts A/B (file 5,683 lines; envelope
321/52/33). Orchestrator-verified: httpServer.ts:495 percent-decodes query
values; nativeCmsWriterFence runs two SELECTs (try-lock + marker read);
TASK-551-11's contract self-cap (sh fence ~:971, ≤999 lines) fails at 1,011;
task551AuthorAudit.test.ts is 1,241 lines (11 split pre-authorized).

## S1 (services)
R4-01 (S1-B HIGH) Reservation serialization replaces the 40P01 retry: at the
start of the createBookingReservation and reactivation transactions, BEFORE the
preflight conflict read and the write, take `pg_advisory_xact_lock(551_033,
hashtext(<resource_id>))` (two-int4 form; hashtext is int4; reservations always
carry a non-null resource_id — writer verifies bookings.ts); contenders then run
sequentially and observe committed rows, so conflicts surface as the preflight
`booking_slot_unavailable` or as 23P01 → `booking_slot_unavailable`; the public
path shares the service; blackouts unchanged (no lock); drop
RESERVATION_WRITE_MAX_ATTEMPTS and the 40P01 branch; 40P01 is asserted NOT to
occur in the 50-way race ("no other code"); namespace 551_033 joins the collision
inventory (rolesService.test.ts pin + hashtext ≠ constants).
R4-02 (S1-A/B M) ADMIN_LIST_SPEC_VARIANTS gains the booking blackouts row
(`bookingBlackoutListSpec` | `booking-blackouts` | starts_at timestamp
non-null desc + id) → 18 rows (10 fixed + 8 variants); a variant→family pairing
table for shared variants (e.g. booking-name-key used by resources and
services) so the scope-version bump rule is defined per family.
R4-03 (S1-A M) Wire vs decoded test literals: route-suite wire `tags=a%252Cb`
(route receives `a%2Cb` → one tag `a,b`), `tags=%25E0%25A4` (route receives
`%E0%A4` → malformed-decode → validation_error), negative `tags=a%2Cb` → two
tags; `ids=<U>,<u>` labelled a pattern-rejection case; the duplicate proof uses
`<u>,<u>`; lowercase-only acceptance recorded in the Security Contract/CMS_API
handoff.
R4-04 (S1-A/B M) Statement classifier: the `lock` bucket = statements matching
`pg_(try_)?advisory_xact_lock(_shared)?\(` PLUS the fence marker SELECT on
`solution_kit_install_runs`; `assertRoleIdsExist(roleIds)` moves INSIDE the
locked transaction on `tx` after the lock (supersede :3022); the lock-wait proof
asserts zero counted statements issued after BEGIN on the writer's transaction.
R4-05 (S1-A LOWs) fence-code 8-row pin owner = the DB-free block in
tests/integration/server/task551AdminWriteConcurrency.test.ts;
bookingMutationService declares its own private `readOwnDataValue`/
`bookingErrorCandidates` (no import from mediaFoldersService.ts); R3-13 base
properties enumerated from body matrix :424 / C3 (q ≤200, status enum, limit,
authorId, facet fields); part-A preamble notes the +18 line shift; 10-L02 owed
items listed in R4-15.

## S2 (clients/UI)
R4-06 (S2-A/S2-B M) useBoundedAdminList has two declared modes per view (C11
view table): `paged` — next/previous REPLACE the page; revalidate refetches the
current cursor; `append` — Load more accumulates; no previous; revalidate
refetches pages from `null` up to the current depth sequentially (bounded
MAX_APPEND_DEPTH = 20) and replaces the accumulated list atomically only when all
pages resolve, else keeps the old list and sets status `error`; smoke scenario
(1) covers paged views, (4) both modes; owning test task551PaginatedListViews
(append + revalidate keeps depth; previous in paged mode).
R4-07 (S2-B M) resolveOvertakenPageRead re-checks generation AND token after
EVERY await; on family/installation reset or identity transition → empty page
with status `reset` (never rows installed after the reset); if the newer
request rejects → the overtaken caller propagates the error (status `error`),
never memory/slot rows; users client: memory-only, same rule; test (c) adds a
reset-during-await case and a newer-rejects case.
R4-08 (S1-B M / S2) Week cache: BookingPage ignores non-latest week responses
(request token); the week Map, in-flight map and subscription are registered
with registerAdminModuleCacheReset and guarded by the installation token; a
stale completion is never rendered nor cached.
R4-09 (S2-B M) UsersRolesPage budget ≤ 850 (call-site + hook glue counted);
bookingPageFixtures.tsx (1,123) split moves to W2: W2 creates
bookingPageFixtureState/Mocks/Harness.tsx by cohesive responsibility with ZERO
behaviour change (pure move, suites green), W3 then adapts the mocks — never add
behaviour to the over-limit file (AGENTS "split before adding behaviour").

## S3 (envelope/validation)
R4-10 (S3-A/B, S2-B M) Smoke-evidence inventory glosses: family receipts are
NOT filed under ADAPTER_DECLARED_SCREENSHOT_GLOSS; add a separate bounded
`FAMILY_RECEIPT_GLOSS` list (no `.`/`..` segments possible):
`^_docs/_workflows/_smoke/task-551/impl-[a-z0-9-]+\.json$`,
`^_docs/_workflows/_smoke/task-551/audit-evidence/[a-z0-9-]+\.(md|json)$`,
`^_docs/_workflows/_smoke/task-551/inventory-rebase-kit/(README\.md|[a-z0-9-]+\.(json|md))$`,
`^_docs/_workflows/_smoke/task-551/runtime/redis-smoke-v1\.json$` (10-L01),
`^_docs/_workflows/_smoke/task-551/03-l02/[a-z][a-z0-9-]{2,63}/[a-z0-9-]+\.png$`;
executable `.ts` files under inventory-rebase-kit are pinned individually by
exact path (writer lists them from disk) with a comment naming their owner
(01-L01), never by wildcard; rejection tests: `../`, an unpinned `.ts`, uppercase,
a second-level dir; new W0 command `w0-smoke-inventory` = `bun --env-file=/dev/null
test tests/unit/runtime-smoke/smoke-evidence-inventory.test.ts` (profile none,
minimum 1); runtime-smoke-registry-tests stays W4.
R4-11 (S3-A/B M) Validation Commands prose is REGENERATED from the envelope
(all 33 commands, exact argv, the closed none-env and db-env maps, FINAL lines
incl. task490-browser-actions.test.ts and forms-submissions-restyle.test.tsx,
line gate `bash /home/coder/project/Coderso/.claude/scripts/line-gate.sh
<pre-family baseline>` with cwd = worktree, type gates at W0/W1/after-W3/closure)
so it mirrors the fence exactly; a one-line rule: the fence is authoritative.
R4-12 (S3-A/B M) Line-gate triage: the family-wide line-gate.sh run is judged on
files in the 03-L02 allowlist or touched by 03-L02 only; foreign over-limit
files are cross-stream findings recorded in the receipt; precondition: the
TASK-551-11 split (task551AuthorAudit.test.ts 1,241 → ≤700 ×3) lands before W0.
R4-13 (S3-B M) repo-lint-types: any NEW root-tsc error anywhere in tests/,
scripts/ or packages/ after a wave (diff of error sets vs the pre-W0 baseline)
is a blocking 03-L02 finding, not only errors in allowlisted files (Vitest does
not type-check consumers); supersede R3-36's narrower rule.
R4-14 (S3-B M) Sentinel wording: TASK551_FIXTURE_DATABASE_SENTINEL is an
operator-supplied input validated at 32–512 bytes/no NUL (the bootstrap does not
print it); the pinned value for this leaf's gates is the orchestrator constant
`task551-fixture-sentinel-2026-09-25-coderso02-orchestrator`.

## Mirrors
R4-15 TASK-551-10-L02 Round-3 mirror: four fence codes → 503 (supersede the
two-code sentence), `.env.example` keys FORM_SUBMISSIONS_EXPORT_TOKEN_SECRET +
artifacts dir with the multi-replica rule, week cache key in ADMIN_CACHE_MAP,
memory-only users list (no storage), displayField nested-path drop, copy
authority = C17 v3.
R4-16 TASK-551-11: the contract-file self-cap (sh fence ~:971 `awk 'NR > 999'`)
applies to the CONTRACT file only and is raised to ≤ 1,300 with reason (task
docs are exempt from the AGENTS 1,000-line gate; sidecar code/test paths keep
≤ 999); the three extra 11-owned edits for the split
(task-551-worktree-compatibility.mjs:111-115 ownedTests;
task551WorkflowContracts.test.ts:121-125 expectedL11SidecarTests;
task551EvidenceContract.test.ts:901 reads all split files + helper) are binding;
the split lands before 03-L02 W0.
