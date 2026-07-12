# TASK-537-03-L01: DB Rollback, Cache After Commit, and Closure

# FileName: TASK-537-03-L01-Db-Rollback-Cache-After-Commit-And-Closure.md

**Parent Task:** TASK-537
**Parent Subtask:** TASK-537-03
**Priority:** High
**Category:** DB Tests / Reliability / Security / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-537-02-L01
**Status:** ✅ Done
**Started:** 2026-07-12
**Completed:** 2026-07-12
**Changelog:** 1249

---

## Scope and ownership

Tests-and-docs-only closure leaf. Source leaves have already updated their
changed-behavior and compatibility assertions before their gates. This leaf may add only
cross-domain DB-fault/rollback/cache-after-commit cases to the relevant
entry/taxonomy/SEO/cache test files and rerun source-owner assertions read-only; it must
not weaken or re-baseline them. It also owns an additive cacheBus assertion in
`tests/vitest/admin/entriesClient.test.ts`; `core/admin/services/entriesClient.ts`
remains read-only. It must update `_docs/RBAC_SPEC.md` with the permission and snapshot
contract below. It may also edit `_docs/CONTENT_TYPES_SPEC.md`, `_docs/CMS_API.md`,
`_docs/SECURITY_SPEC.md`, and `_docs/ADMIN_CACHE.md` when their owned contract changes,
plus this family’s statuses, `_docs/_TASKS/README.md`, changelog 1249, and
`_docs/_CHANGELOG/README.md`. It must not edit production source or TASK-517. Read
TASK-517 and record a fresh audit; route required changes into its own future contract
rather than editing it here.

## Implementation Pseudocode

~~~ts
beforeEach:
  create uniquely prefixed content type, entry, taxonomy, terms, SEO, and actor fixtures;
afterEach:
  delete only records created by this test in FK-safe order;

test invalid taxonomy after requested publish:
  snapshot entry/status/revisions/assignments/SEO;
  call updateEntryMetadata;
  expect stable domain error;
  assert every snapshot unchanged and zero cache events;

test invalid SEO after valid taxonomy:
  assert the same full rollback boundary;

for each injected write seam:
  use entryService's internal dependency/executor seam to throw deterministically;
  assert no partial status/revision/taxonomy/visibility/hash/schedule/SEO state;

for each async taxonomy/SEO apply seam:
  supply a deferred prepare/apply dependency without mutable module mocks;
  assert outer transaction has not resolved and site-cache count remains zero;
  resolve -> assert commit then the exact post-commit cache effect;
  reject -> assert rollback and zero site-cache effects;

test locked-state serialization:
  race password clear-to-public against password/omit;
  assert the final row is never visibility=password with a null hash;
  race two standalone publishes;
  assert the shared SELECT FOR UPDATE serializes distinct increasing revision versions;

test route authorization and schedule presence:
  assert every route mutation rechecks content:write from one joined minimal
    user_roles -> roles SELECT on the locked transaction executor;
  assert a real transition checks content:write + content:publish as all-of from that same
    statement snapshot;
  assert role/user-role commits before the joined statement starts are visible and later
    commits do not retroactively change the current decision;
  assert legacy string allow/deny, all-of allow/deny, wildcard allow, and empty-list
    forbidden (including wildcard) behavior;
  assert DB_POOL_MAX=1 completes without a second global connection;
  assert already-published ordinary metadata remains content:write-only;
  assert omitted scheduledAt is absent from service input;
  assert explicit null cannot leave resulting status=scheduled without a date;
  assert seo_canonical_invalid and seo_robots_invalid map to HTTP 400;

test cache effect matrix:
  SEO mutation -> one global clear and zero targeted invalidations after commit;
  changed non-SEO metadata/status -> one targeted invalidation after commit;
  no-op or rollback -> zero site-cache effects;
  post-commit invalidator failure -> stable redacted telemetry, committed result/HTTP success,
    DB state stays durable, and client reconciliation/cacheBus still runs;
  subscribe to cacheBus in the existing entries-client Vitest: successful metadata response
    emits the exact list/type, list/all, and detail reconciliation events; rejected HTTP emits
    zero events; admin cacheBus remains client-owned and is not counted as an entry-service side effect;

test projections:
  inspect named projection keys and static/query shape;
  assert stored accessPassword is absent from update/publish/delete/metadata read and
    return projections; permit a transient freshly prepared hash only inside the
    coordinator's DB-write path (local preparation and write plan);
  permit only the SQL-derived access_password IS NOT NULL -> hasPassword boolean;
  assert delete returns id/title, publish returns cache fields, and update has no returning.

test SEO prepare/apply order:
  import ContentTerm/EntryTaxonomyPlan and SeoAnalysis/PreparedSeoMutation plus exact prepare/apply helper
    exports directly from their owning service modules;
  make canonical/robots normalization reject and assert no write seam was reached;
  assert the prepared plan exists before the first entry write;
  inject a DB failure in apply and assert the outer transaction rolls back;
~~~

Tests must not truncate shared tables or assume a clean global database.
Every fault/deferred/concurrency case uses uniquely prefixed fixtures and cleans only its
own entry, revisions, assignments, SEO document, taxonomy/terms, type, actor, role, and
user-role link in FK-safe order. A DB_POOL_MAX=1 child sets its env before fresh imports,
has an internal deadline, calls `process.exit`, and is killed plus awaited in parent
`finally` before cleanup if it hangs. Do not install shared DB triggers, truncate tables,
or mutate process-global service deps.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bun x tsc -p tsconfig.json --noEmit
set -a && source .env && set +a && bun test --timeout=15000 \
  tests/unit/content/entryService.test.ts \
  tests/unit/auth/rbac.test.ts \
  tests/unit/content/taxonomyService.test.ts \
  tests/unit/seo/seoService.test.ts \
  tests/integration/routes/contentEntriesRoutes.test.ts \
  tests/integration/routes/contentTypes.test.ts \
  tests/integration/runtime/detail-page-preview-cache.test.ts \
  tests/integration/runtime/detail-page-runtime.test.ts \
  tests/integration/runtime/detail-page-composer-runtime.test.tsx
set -a && source .env && set +a && bun test --timeout=15000 \
  tests/security/codersoSecurityGate.test.ts
NODE_ENV=test bunx vitest run --config vitest.config.ts \
  tests/vitest/admin/entriesClient.test.ts
set -a && source .env && set +a && bun run test
set -a && source .env && set +a && bun run precommit:check
semgrep --error --timeout 120 --timeout-threshold 0 \
  --config .semgrep.yml --config p/owasp-top-ten --config p/security-audit \
  --config p/nodejs --config p/typescript \
  core/services/content/taxonomyService.ts core/services/seo/seoService.ts \
  core/services/content/entryService.ts core/server/routes/contentEntryRoutes.ts \
  core/server/routes/index.ts \
  core/services/auth/roleService.ts core/server/middleware/rbac.ts
bun run gates:coderso
bun run scan:security:strict
git diff --check
~~~

The two global commands are mandatory in addition to the exact eleven targeted test
files. Run them before smoke and before any status becomes Done. If a final-drift fixer
changes source, tests, or documentation, rerun both commands before closure continues.

Re-run each named failure once in isolation. If DATABASE_URL is unavailable, do not
claim closure; record the blocker and rerun after recovery.

## TASK-517 dependency audit

After all tests pass, read TASK-517’s task/leaf files against the post-537 source.
Verify its proposed hash loader is the only explicit secret projection, its helpers
match new executor signatures, and it cannot bypass the transaction/cache contract.
The closeout must explicitly record, without editing TASK-517:

- TASK-517 must add TASK-537 as a dependency before implementation;
- all `entryService.ts` symbol/line anchors must be freshly grounded after the new
  projections, locked loader, and coordinator land;
- its proposed `getEntryAccessPasswordHash` remains the sole raw-hash projection and
  must not be merged into the locked public/detail projection;
- its parent and TASK-517-03 pin changelog `1236`, which is already occupied by
  TASK-526, while the board and changelog index still reserve stale `1230`; the
  TASK-517 owner must select a currently free pin and synchronize its parent,
  TASK-517-03, board, and changelog index before implementation;
- TASK-517 must consume the post-537 cache timing: its proposed memoized gated-route
  signal must invalidate through the post-commit seam and may not reintroduce
  pre-commit invalidation or bypass the locked mutation contract.

Record those blockers in TASK-537 closeout and leave every TASK-517 file/status open for
its future owner.

## Closure Evidence

- Targeted Bun closure gate: 109/109 tests, 663 assertions, 0 failures across the
  ten task-owned runtime/service/route/security files. The named entry-service suite
  passed 29/29 tests and 208 assertions; entries-client Vitest passed 19/19.
- Full validation: Bun 1,680 pass / 1 optional live OpenAI skip / 0 fail across
  261 files with 8,866 assertions; Vitest 836/836 files and 6,746/6,746 tests;
  core lint/types, root TypeScript, formatting, `precommit:check`, and release gates
  5/5 passed. Targeted Semgrep was clean. The strict scan's sole remaining finding is
  the unchanged TASK-545-owned workflow-script finding; audit, Trivy, and Gitleaks were
  clean and no allowlist/configuration changed.
- The six canonical live flows used `coderso-dev-core-host` plus separate full
  `playwright-cli -s=wf537smoke ...` commands, covered both themes and both wide/narrow
  viewports, asserted visible persisted/front effects, and recorded zero console errors,
  warnings, or page errors. Eight valid, unique PNGs were captured under
  `_docs/_workflows/_smoke/`; all created database rows, front routes, preferences,
  sessions, ports, and helper processes were verified cleaned or restored.
- Non-canonical setup/debug/cleanup probes intentionally encountered the existing
  Radix description warning or expected 4xx resource responses. They were discarded
  before measured runs and are not represented as zero-error acceptance scenarios.

| Screenshot | SHA-256 | Viewport |
|---|---|---|
| `task-537-wf537smoke-01-taxonomy-seo-light-wide.png` | `728fe2539a1e1a0ae41ffe81819a79c6f735113390494ce61e68385ff95fc9db` | 1440x1000 |
| `task-537-wf537smoke-02-schedule-omit-dark-narrow.png` | `b7e230ca79ad27c70cfb1ca9004148df56d54a10541ed2b4c581faf9b7645ff6` | 390x844 |
| `task-537-wf537smoke-03-schedule-null-reject-light-wide.png` | `4e2938ed56d35fe13f49846b8dde038b4e8f3168a3a29baaa0b4863872bcf9f3` | 1440x1000 |
| `task-537-wf537smoke-04-password-has-password-light-wide.png` | `89a47de5d6731a1db40175832bf484a602868f1cc4181fe8011a77d6e578c4fe` | 1440x1000 |
| `task-537-wf537smoke-04-password-public-light-wide.png` | `91cb4740ac88a10365aa8ffcdc8aae93855078de1fdb4a22d7f3f1944f5bf02b` | 1440x1000 |
| `task-537-wf537smoke-05-publish-invalid-taxonomy-rollback-dark-narrow.png` | `75ac955b625e73c56c510c0f4a38fce3516bc7f963654df5efcf9bfee26f3b68` | 390x844 |
| `task-537-wf537smoke-06-published-front-dark-wide.png` | `889dbc941b0776e0699c0d8e342c4363e4bf55444e65da62d9a79c0806e091f1` | 1280x720 |
| `task-537-wf537smoke-06-unpublished-front-dark-wide.png` | `049136e4a8a375649b6e6fd05f2cb6ebcf9a23806310f363b43071451459d5a8` | 1280x720 |

## Documentation and closure

Document one metadata transaction, before-first-write validation, after-commit cache
timing, and secret-minimal projections without exposing hashes. In `_docs/RBAC_SPEC.md`,
document that a legacy string becomes a one-element requirement, every non-empty array is
all-of, an empty array fails closed even for wildcard actors, and `*` satisfies any
non-empty requirement. Document that locked entry mutations build permissions with one
minimal joined `user_roles` -> `roles` SELECT on the transaction executor, with commits
before the READ COMMITTED statement snapshot visible and later commits affecting only the
next guard. Run fresh post-audits. Then create changelog 1249, mark all physical
descendants Done, close the parent, and synchronize task/changelog indexes. No descendant
may remain open.
