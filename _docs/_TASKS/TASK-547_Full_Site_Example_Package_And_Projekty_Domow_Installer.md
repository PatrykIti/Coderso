# TASK-547: Full-Site Example Package and Projekty Domów Installer
# FileName: TASK-547_Full_Site_Example_Package_And_Projekty_Domow_Installer.md

**Priority:** High
**Category:** Solution Kits / Site Builder / Reference Examples
**Estimated Effort:** Very Large
**Dependencies:** TASK-190, TASK-417, TASK-418, TASK-420, TASK-455, TASK-459, TASK-482, TASK-521–535
**Status:** 🚧 In Progress
**Reopened:** 2026-07-23 — fresh drift review invalidated the prior final gates,
post-audits and smoke evidence; corrective implementation and revalidation are in
progress in the isolated TASK-547 worktree.
**Changelog:** 1260 pinned

---

## Overview

Create one strict, versioned, declarative full-site package contract and use it
to ship the FormaDom “Projekty Domów” prototype as a complete reference starter.
The package must install seven static Pages plus one dynamic project-detail
route, the global site shell, project content, listing/filter/detail resources,
a real contact form, SEO, and safe site design settings through an idempotent
dry-run/apply/rollback lifecycle.

This is not one enlarged `PageDocumentV2`. A Page document remains owned by
`core/services/pages/pageDocumentV2.ts`; the package is an installer-level graph
whose embedded documents delegate to their domain owners.

- **Owning services:** `core/services/kits/*`, with native domain services as
  resource owners.
- **Reference source:** the twelve pinned files under read-only
  `/home/coder/project/Coderso/_docs/projekty-domow-wow-site/`; their ordered
  `sha256sum` manifest digest is
  `d9cf34b5accf7f52b4ebc6d19516a2745936f746305b1f6a46aedbacd4745a4e`.
- **Legacy partial artifacts to replace, never fidelity sources:**
  `scripts/demo-projekty-domow.tsx`,
  `_docs/_DEMO/projekty-domow.page.json`,
  `scripts/load-projekty-domow.tsx`.
- **Source-of-truth docs:** `_docs/SOLUTION_KITS.md`, `_docs/PAGE_MODEL.md`,
  `_docs/CONTENT_TYPES_SPEC.md`, `_docs/CMS_API.md`, `_docs/ARCHITECTURE.md`,
  `_docs/SECURITY_SPEC.md`, `_docs/TESTING_STRATEGY.md`.

### Product acceptance language

1. **100% functionally represented/installable** means all eight public routes,
   shared shell, project data/filter/detail flow, real form, SEO, and settings
   are installed and work through native CMS contracts.
2. **Best available visual fidelity** means current safe Page/Menu/Form/content
   primitives reproduce the prototype as closely as evidence permits.
3. Pixel-perfect identity is not claimed unless screenshot and geometry
   comparison proves it. Residual arbitrary pseudo-elements, `clip-path`,
   keyframes, or exact custom breakpoints must be recorded explicitly.
4. Reference fidelity includes public copy, facts, prices, contact data, project
   order/categories, form strings, menu/footer behavior, SEO and design tokens.
   Invented public claims are regressions, not acceptable approximations.

## Scope

- Versioned full-site JSON package with stable logical resource keys.
- Strict typed references resolved to generated/current database IDs only during
  planning/apply; unresolved references never enter stored domain documents.
- Seven Pages: `/`, `/oferta`, `/projekty`, `/proces`, `/cennik`, `/o-nas`,
  `/kontakt`.
- Dynamic `/projekty/:slug` content route with six seeded project entries and a
  detail page/template targeting published status through publish-last; Aurora
  proves the eighth public prototype route.
- Primary MenuDocumentV2, Page-v2 footer template, shell settings, contact form,
  form action, listing query/template, filters, SEO, and design settings.
- Deterministic generator, canonical checked-in example JSON, installer-backed
  CLI, tests, documentation, and Playwright CLI runtime smoke.

## Out of Scope

- A public endpoint accepting arbitrary client-supplied package JSON.
- Playwright-driven installation or UI clicking as the persistence mechanism.
- Raw CSS/JavaScript injection, a generic widget surface, or new widget-template
  seeds.
- Secrets, provider credentials, webhook secrets, or raw sensitive data in JSON.
- Binary media import unless a later explicitly scoped child adds a trusted,
  bounded media-source contract.
- Favicon/media installation: this package contract has no asset/media resource
  kind. The reference SVG may be inspected but must not be smuggled into another
  resource kind.

## Security Contract

- **Endpoint visibility:** no package endpoint in this family. Installation is
  service + trusted local CLI only; existing catalog Solution Kit endpoints stay
  unchanged and never accept raw package JSON.
- **Auth model:** trusted local operator for CLI with an explicit actor UUID,
  syntactically validated before any DB access.
- **RBAC:** n/a for CLI. A future API/catalog registration requires a separate
  task and route contract; it must use `solution-kits:write` as the aggregate
  orchestration permission or explicitly define a require-all native matrix.
- **CSRF/rate limit:** n/a in this service+CLI family. Existing unrelated
  Solution Kit routes retain their current policy; a future package route must
  define both explicitly.
- **Validation:** strict package schema, reject unknown keys recursively, then
  delegate embedded payloads to their native schema/normalizer owners.
- **Anti-abuse:** no nonce/HMAC/CAPTCHA because installation is not public.
- **Secrets:** reject secret-like setting keys and credential-bearing sources;
  audit summaries contain IDs/operations, not form payloads or secrets.

## Architecture Invariants

- Reuse `Solution Kit` run/item/audit/rollback infrastructure; do not build a
  second lifecycle ledger.
- Do not extend the frozen legacy `WidgetBlock[]` template phase. New footer and
  page templates use the current Page Template contract.
- Every resource has one stable package key and one owning domain normalizer.
- Every resource seed is exactly `{ key, desired }`; package JSON contains no DB
  IDs, and lifecycle/children appear only where the native owner supports them.
  The complete native intended snapshot is explicit in `desired`.
- References use a closed typed shape, never arbitrary string substitution.
- Validate the complete graph before the first domain write.
- Install in dependency order and rollback in exact reverse order.
- PostgreSQL advisory pair `(548, 0)` is the native-CMS writer fence. One
  PgBouncer-safe `postgres.js` `begin()` (`prepare:false`) holds its exclusive
  transaction lock and then package `(547, hash)` transaction lock for the whole
  lifecycle; session advisory locks and manual unlock SQL are forbidden.
- Only after both exclusive locks are held, a private holder capability may open
  the short reservation transaction. Its statement one is the ordered
  `created_at ASC, id ASC LIMIT 2 FOR UPDATE` marker-key census/row lock; it never
  calls `acquireNativeCmsWriterFence`, tries shared, or exposes a public bypass.
- Before DB planning, apply/dry-run reservation creates or claims the actual
  source owner with a private server generation marker. In the same transaction,
  takeover derives `resumePhase`: absent strict `initializationPlanV1` plus zero
  items is `reserved`; an exact plan plus its complete matching bounded item set
  is `initialized`; partial, malformed or impossible evidence fails closed.
  The safe callback receives only `ownerRunId` and `resumePhase`; generation and
  reservation authority stay private. `initialized` skips planner, preparation,
  reinsertion and native reapply and enters durable recovery/automatic
  compensation. Explicit rollback keeps its separate strict source plus
  incremental-outcome resume path. Its owner is marked; an automatic-compensation
  child is not, because the apply source remains owner.
- Every post-reservation callback branch uses one failure-phase policy. A
  deterministic validation/planning/preparation failure, or initialization
  proven rolled back with zero native effects, atomically fails the owner and
  removes its marker. Exact committed initialization enters recovery. Partial,
  ambiguous or potentially native-effecting work leaves the owner running and
  marked; repeated deterministic errors therefore never globally brick writers.
- Every ordinary writer of a managed root, child, revision or allowlisted
  setting first attempts the shared transaction fence. Contention returns
  `native_cms_writer_fence_busy` without waiting; an acquired shared fence must
  pass the bounded durable-marker census before protected work. A marker left by
  holder loss blocks writes as `native_cms_writer_recovery_required` until an
  exclusive takeover drains the owner row and rotates its generation.
- postgres.js `onclose` closes over the exact private mutable lease and captured
  callback promise rather than consulting `AsyncLocalStorage`. Unexpected close
  marks that lease lost and signals unwind; the outer owner awaits callback
  settlement before client end. Normal revoke/end cannot relabel a lease lost,
  and callback/acquisition/holder-loss primary errors outrank cleanup failures.
- A rollback retry treats durable success outcomes as provisional until one
  exact read-only preflight, while that exclusive fence is held, proves every
  reversed create is still absent, every reversed update/noop still equals its
  exact target, and every setting still
  equals its restored raw presence/value. The preflight detects pre-existing
  drift; the owner-row/fence protocol prevents post-preflight ordinary-writer
  drift until finalization. Finalization synchronously closes the inherited
  context, drains owner-row readers with `FOR UPDATE`, atomically terminalizes
  the owner and removes its marker, then lets the holder transaction commit.
  Every success requires `finalizeOwnedRun` to return exactly
  `desired_terminal`; `different_terminal` throws the fixed safe recovery
  conflict. Explicit rollback passes its validated interrupted apply-source
  transition to that same finalizer, so source failure, rollback-owner success
  and marker removal commit atomically; full-site flows never use legacy
  `finalizeRun`.
- Foreign-key safety is explicit: `deleteUser`'s indirect `SET NULL` mutation is
  fenced; Page/Entry/Form/ContentType conditional deletes lock and reject live
  reverse references; listing-query JSON references take ContentType `KEY SHARE`;
  and intended cascades are exhaustively classified.
- Apply uses a compensation saga, not a new cross-domain transaction abstraction.
- Both legacy and full-site execution use one exported ledger port.
- A resource is managed only when an earlier successful, non-rolled-back run has
  a snapshot whose stored ID matches the current row. Natural-key equality
  without that evidence is an unmanaged conflict.
- A repeated apply creates no duplicates and reports deterministic `noop` or
  intended `update`.
- Never delete or overwrite unmanaged/pre-existing resources during rollback.
- Pages, entries, detail pages and menus are created as drafts. Menu
  items/document/appearance are fully wired before publish; publishing happens
  only after dependencies are complete. Shell/settings are one final reversible
  stage and their prior values are restored on rollback.
- SEO has one writer per layer: TASK-547-04-L01 owns the seven static Page SEO
  documents, TASK-547-03-L02 owns dynamic project-detail SEO, TASK-547-04-L02
  preserves both in the assembled package, and TASK-547-06-L01 proves the public
  runtime output.
- TASK-547-06-L01 registers one thin `task-547` adapter in the shared
  `scripts/runtime-smoke.ts` entry point. Registration updates the exhaustive
  suite/profile contracts in `scripts/runtime-smoke/contracts.ts`,
  `scripts/runtime-smoke/cli.ts`, `scripts/runtime-smoke/registry.ts` and
  `tests/unit/runtime-smoke/cli-registry.test.ts`; the adapter rejects a
  mismatched suite or unsupported profile before any side effect. It composes
  the shared lifecycle, condition polling, profile-scoped workers, set-based DB
  cleanup, `PlaywrightCliDispatcher` from
  `scripts/runtime-smoke/browser/playwright-cli-dispatcher.ts`, and
  `startSupervisedServer(...)`/`SupervisedServerResource` from
  `scripts/runtime-smoke/server/supervised-server.ts` as extracted by
  TASK-552-04. It does not create a second task-local CLI, dispatcher, server
  resource or lifecycle.
- All 18 runtime scenarios remain independently identifiable and assert the same
  product-visible behavior in both profiles. `fast` differs only through shorter
  bounded polling/auth infrastructure windows while retaining the same set-
  based cleanup and persistent-worker batching; `certification` uses production-
  strength waits. This task does not consume checkpoint resume; a future change
  may add it only when the adapter restores renewable state and re-proves the
  exact candidate, canonical preconditions and cleanup end to end.
- One installed fixture and source run remain live through ordered rows 01..18.
  Row 08 proves publish/front and native lifecycle parity without rolling back;
  rows 09..18 reuse that fixture's Form/Page identities. The adapter performs
  set-based submission cleanup, scenario reset and exact-source rollback once in
  its final `finally` phase after row 18, proves prior-state equality, and only
  then may return a passing `SmokeAdapterResult`.
- The adapter takes initial and final `RepositoryGuard` snapshots. Its exact
  allowlist is the derived set of this run's screenshot and report files under
  `_docs/_workflows/_smoke/task-547/`; any other repository mutation fails.
- The only declared fidelity residual IDs are
  `favicon-not-installed`, `theme-color-not-installed`,
  `header-brand-and-floating-frame-approximated`,
  `native-form-heading-approximated`,
  `prototype-css-art-and-motion-approximated`,
  `portfolio-filter-and-card-chrome-approximated`, and
  `exact-breakpoints-approximated`. There is no imagery residual because the
  pinned prototype uses authored CSS/SVG art rather than imported photographs.

## Sub-Tasks And Land Order

**Orchestration sidecar:**

- [ ] **TASK-547-07** — multi-agent workflow and drift evidence; runs throughout
  the family and is not an implementation land step.

1. [ ] **TASK-547-01** — versioned package schema, typed references, graph planner
   (2 executable leaves).
2. [ ] **TASK-547-02** — installer resource expansion, idempotency, snapshots,
   rollback, and audit evidence (3 executable leaves).
3. [ ] **TASK-547-03** — complete FormaDom content/resource generator
   (3 executable leaves).
4. [ ] **TASK-547-04** — seven Page v2 documents, shell, locale propagation,
   theme/design and canonical example package (3 executable leaves).
5. [ ] **TASK-547-05** — installer-backed CLI (1 executable leaf).
6. [ ] **TASK-547-06** — dependency-shaped tests, documentation, Playwright smoke,
   and closure (1 executable leaf).
Implementation is strictly sequential: `01 → 02 → 03 → 04 → 05 → 06`. Inside
TASK-547-02, corrective L01 completion is followed by one L03-owned pre-land
compatibility checkpoint, then L02 completion and final L03 completion. The
checkpoint does not terminalize L03, create a fourth TASK-547-02 leaf, or add a
source/test path. TASK-547-07 owns the orchestration contract and review
evidence throughout the family without taking source ownership from those
children. The source/test ownership registry remains exactly 13 executable
leaves.

The family keeps its existing leaf ownership and dependency order; resuming an
interrupted branch starts by inventorying the actual landed code, tests and
receipts. Run one complete dependency-shaped read-only audit round over the
current contracts and implementation, plus a reconcile pass where shared
types, selectors, ownership or land order intersect. Fix verified HIGH/MEDIUM
findings and repeat only the affected audit scopes. Do not replay clean rounds,
already successful unrelated gates or zero-delta implementation phases merely
to satisfy a historical count.

Continue unfinished implementation strictly in the declared leaf order. Gate
each changed leaf with typecheck, lint and the tests that own its changed
contract before moving to the next dependency. The closure leaf then adds the
shared smoke adapter and acceptance/docs work without reopening completed
production ownership unless fresh evidence identifies a real defect.

## Canonical Runtime Smoke Registry Contract

TASK-547-06-L01's suite descriptor set must contain these exact ordered rows and no
others:

| NN | Scenario ID | Browser segment |
| --- | --- | --- |
| 01 | `home-desktop-effects` | `wf547smoke` |
| 02 | `all-routes-desktop-shell` | `wf547smoke` |
| 03 | `tablet-responsive` | `wf547smoke` |
| 04 | `mobile-navigation` | `wf547smoke` |
| 05 | `portfolio-facets` | `wf547smoke` |
| 06 | `aurora-detail` | `wf547smoke` |
| 07 | `contact-form` | `wf547smoke` |
| 08 | `publish-lifecycle-parity` | `wf547smoke` |
| 09 | `form-design-author-light` | `wf547formdesign` |
| 10 | `form-design-author-dark` | `wf547formdesign` |
| 11 | `form-design-reset-mobile` | `wf547formdesign` |
| 12 | `form-design-save-reload` | `wf547formdesign` |
| 13 | `form-design-publish-front` | `wf547formdesign` |
| 14 | `page-editor-switcher-author-light` | `wf547pageeditor` |
| 15 | `page-editor-switcher-tablet-reset` | `wf547pageeditor` |
| 16 | `page-editor-collection-cta-dark` | `wf547pageeditor` |
| 17 | `page-editor-form-presentation-save-reload` | `wf547pageeditor` |
| 18 | `page-editor-publish-front-parity` | `wf547pageeditor` |

The `wf547*` values identify logical browser segments, not separate shared-CLI
sessions; the actual session comes from `--session`. This table is the canonical
order/identity/segment spine. TASK-547-06 and its
L01 freeze the complete matching URL/viewport/path/assertion descriptors. A
production leaf may repeat only its owned product-flow handoff subset
(TASK-547-04-L01 repeats rows 14–18); TASK-547-06-L01 owns the runtime registry
implementation, and TASK-547-07 consumes frozen descriptors without restating
IDs or lifecycle logic.

## Acceptance Criteria

- One canonical JSON package contains the complete logical site graph and passes
  strict normalization with byte-stable regeneration.
- Dry-run detects duplicate keys, missing/ambiguous refs, cycles, invalid embedded
  documents, unsupported settings, and conflicts before domain writes.
- First apply creates/wires the complete site; second apply creates zero duplicates.
- Rollback restores prior shell/settings and restores/deletes only resources
  evidenced by the source run.
- Retrying a partial rollback revalidates every durable successful reversal;
  pre-existing drift in a completed dependent blocks prerequisite reversal.
- Deterministic independent-client barriers prove transaction locks in both
  directions from `pg_locks`, not elapsed time: a full-site holder makes an
  ordinary domain/import/backup writer return busy before protected work, while
  a held shared transaction makes full-site wait without exhausting the pool.
  The holder PID stays stable; no session lock/unlock SQL occurs.
- Real holder death releases transaction locks but leaves the durable marker, so
  ordinary writers return recovery-required with zero protected work. Exclusive
  takeover drains `FOR UPDATE`, rotates the generation, and makes old-generation
  or closing descendants fail with zero I/O. Duplicate/malformed markers fail
  closed; every post-reservation installer transaction proves the exact owner generation.
- Reservation tests pin its private holder authorization, statement-one ordered
  locking census and zero shared-fence call. Takeover tests cover both exact
  `reserved`/`initialized` derivations, reject every partial/impossible matrix,
  and prove initialized apply performs no planner/reinsert/reapply call.
- Callback-phase tests cover deterministic failures before and during confirmed-
  rolled-back initialization, exact committed recovery, ambiguous/native-effect
  marker retention, and repeated deterministic errors followed by an ordinary
  writer. Initialization preserves exact fence-lost/fence-failed codes and
  recovers only an exact ambiguous commit.
- Holder tests fire `onclose` outside owner ALS, with detached work and after
  normal revoke/end, proving exact-lease loss, callback settlement before
  `client.end` and primary-error precedence. Finalization races prove no success
  on `different_terminal` and atomic interrupted-source failure plus rollback
  success/marker removal.
- DB races prove `deleteUser` `SET NULL`, reverse-reference guarded Page/Entry/
  Form/ContentType deletes, ContentType/listing-query JSON references and every
  intended cascade cannot violate the captured rollback graph.
- Every prototype route responds and navigation/footer links are valid.
- Public copy, facts, prices, contact data, project taxonomy/order, form strings,
  SEO titles/descriptions and design settings match the pinned reference unless
  covered by one of the exact residual IDs above.
- Portfolio filters visibly change results; Aurora resolves through project entry
  data and the detail document.
- Contact uses the real Forms nonce/rate-limit/validation/submission pipeline.
- Desktop/tablet/mobile, reduced-motion and publish-to-front parity are proven.
- Each of the exact 18 browser scenarios has a stable ID and can report failure
  independently through the shared suite adapter. A scenario-specific repair
  reruns its owning tests and affected smoke segment; a shared-harness repair
  reruns the shared harness self-test and affected runtime smoke, not unrelated
  product validation.
- Every supported TASK-547 profile executes all 18 product-visible scenarios
  with the same assertions. The shared runner records structured scenario and
  phase timings, zero console/page errors, cleanup results and screenshots under
  `_docs/_workflows/_smoke/`.
- Rows 01..18 use one installed fixture. Row 08 does not roll it back; the suite
  closes browser/server, submission/reset and exact-run rollback resources
  idempotently after row 18, verifies cleanup receipts and the final repository
  snapshot, and then returns its result. The shared lifecycle may safely close
  those already-closed resources again.
- Residual visual differences are evidence-backed and do not conceal a functional,
  accessibility, data, security, or test-integrity gap.
- Every touched human-authored production/test file is at most 1,000 physical lines.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted Vitest suites for pure package/schema/reference/generator logic
- targeted Bun DB/runtime suites for installer/apply/rollback/routes/forms/content
- after loading the required environment, run the fence/process DB suite three times serially with
  `for attempt in 1 2 3; do bun test --parallel=1 --timeout 360000 tests/integration/kits/fullSiteCrashRecoveryDb.test.ts || exit 1; done`
- run `tests/integration/kits/fullSiteNativeForeignKeyRacesDb.test.ts` serially
  with the same `360000` ms timeout plus the static writer/FK inventory lane
- `bun run test`
- `bun run precommit:check`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- register suite `task-547` statically by updating the exhaustive `SUITE_IDS` in
  `scripts/runtime-smoke/contracts.ts`, `SUPPORTED_PROFILES` in
  `scripts/runtime-smoke/cli.ts`, `ADAPTER_PATHS` plus the descriptor map in
  `scripts/runtime-smoke/registry.ts`, and positives/negatives in
  `tests/unit/runtime-smoke/cli-registry.test.ts`; adapter tests reject a wrong
  suite/profile before fixture, browser or server work
- run both `bun scripts/runtime-smoke.ts run --suite task-547 --profile fast
  --session wf547fast` and final `bun scripts/runtime-smoke.ts run --suite
  task-547 --profile certification --session wf547certification`; both retain
  all 18 scenarios/assertions, while only their controlled polling/auth windows
  differ
- depend on TASK-552-04 and compose its shared `PlaywrightCliDispatcher` and
  `SupervisedServerResource`/`startSupervisedServer(...)` with the shared
  lifecycle/process/polling/worker/DB-batch/redaction/timing/reporting
  primitives; do not copy their loops into a TASK-547 executor
- keep the exact three logical browser segments for public, Form Design and Page
  Editor flows while letting the shared lifecycle own server start/health/stop
  through `coderso-dev-core-host`
- every scenario records URL, viewport, zero console/page errors, material
  visible effects and a valid screenshot under `_docs/_workflows/_smoke/`; the
  suite result separately records the single final cleanup/rollback outcome
- keep one fixture installed through all 18 rows, then use one final set-based
  cleanup and exact-run rollback with prior-state equality proof; initial/final
  repository snapshots allow only the exact derived screenshot/report paths and
  no evidence directory or generated ledger is closure authority
- baseline-to-final line counts for every touched production/test module

Before every DB-backed test or dev command, execute exactly
`set -a && source /home/coder/project/Coderso/.env && set +a`, without printing,
copying, hashing or persisting the file or its values, then verify
`DATABASE_URL` is reachable. DB-backed lanes and root smoke subprocesses use at
least `360000` ms timeouts. The server is started and stopped only through
`coderso-dev-core-host`; direct Bun/npm server starts are forbidden. This
source-only operational exception does not make the main repository an
implementation or audit input.

## Mandatory Closeout Order

After unfinished implementation is validated:

1. prepare non-terminal product/developer/task/changelog closeout docs;
2. run one dependency-shaped post-audit with the relevant independent lenses,
   verify findings locally, fix HIGH/MEDIUM findings and rerun only affected
   lenses and gates;
3. run the shared TASK-547 certification smoke once on the final candidate and
   verify all 18 scenarios, cleanup/rollback, screenshots and structured report;
4. terminalize descendants, parent, board and changelog index in dependency
   order, then run one final task-graph/closeout consistency pass.

A product-code smoke failure invalidates affected runtime scenarios, not clean
static gates or unrelated audits. A harness-only repair invalidates the harness
self-test and runtime smoke. A host/power/network interruption requires a clean
smoke restart only. Changelog 1260 remains Draft and unindexed until this order
completes. No TASK-547 commit is merged into `feat/implementations` by this
workflow.

## Documentation Updates Required

- `_docs/SOLUTION_KITS.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/PAGE_MODEL.md`, `_docs/CONTENT_TYPES_SPEC.md`, `_docs/CMS_API.md`,
  `_docs/ARCHITECTURE.md`, `_docs/DATA_MODEL.md`, and `_docs/SECURITY_SPEC.md`
  where contracts change. The ledger documentation must retain the four legacy
  values while covering all ten full-site resource kinds; the text-backed
  expansion requires no DDL migration.
- `docs/develop/full-site-packages.md` for generating, validating, installing and
  rolling back the example package
- `_docs/_CHANGELOG/1260-2026-07-23-task-547-full-site-package-formadom.md` and
  changelog index at closure
- this task family and `_docs/_TASKS/README.md`
