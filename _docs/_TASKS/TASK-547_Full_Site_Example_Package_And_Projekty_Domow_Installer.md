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
- TASK-547-06-L01 owns one tracked, root-operated runtime-smoke CLI and its
  canonical registry. Internal Codex agents may audit its sanitized results but
  never drive the browser flow or author, rewrite, or promote official evidence.
- Every runtime scenario is independently runnable and owns one scenario module,
  one matching focused test, one result JSON, and one PNG. It starts from and
  restores the same captured baseline through its own install/server/session/
  browser/cleanup lifecycle; no scenario may depend on a predecessor's state.
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
source/test path. TASK-547-07 owns the workflow script and runs throughout the
family without taking source ownership from those children. The source/test
ownership registry remains exactly 13 executable leaves.

The executable leaf graph still contains exactly 21 TASK-547 task files. The
pre-implementation workflow dispatches exactly 121 native jobs and publishes
exactly 126 audit artifacts after adding two bounded workflow-owner source
shards per round. Those counts do not expand for smoke modularity.
Implementation instead expands from 14 to exactly **35 sequential
phases**, each with an exact writable-path set, a complete phase gate and one
root-owned atomic commit when its validated delta is non-empty:

1. `547-01-L01`
2. `547-01-L02`
3. `547-02-L01`
4. `547-02-L03-preland`
5. `547-02-L02`
6. `547-02-L03`
7. `547-03-L01`
8. `547-03-L02`
9. `547-03-L03`
10. `547-04-L01`
11. `547-04-L02`
12. `547-04-L03`
13. `547-05-L01`
14. `547-06-L01-acceptance-tests`
15. `547-06-L01-smoke-framework`
16. `547-06-L01-smoke-01`
17. `547-06-L01-smoke-02`
18. `547-06-L01-smoke-03`
19. `547-06-L01-smoke-04`
20. `547-06-L01-smoke-05`
21. `547-06-L01-smoke-06`
22. `547-06-L01-smoke-07`
23. `547-06-L01-smoke-08`
24. `547-06-L01-smoke-09`
25. `547-06-L01-smoke-10`
26. `547-06-L01-smoke-11`
27. `547-06-L01-smoke-12`
28. `547-06-L01-smoke-13`
29. `547-06-L01-smoke-14`
30. `547-06-L01-smoke-15`
31. `547-06-L01-smoke-16`
32. `547-06-L01-smoke-17`
33. `547-06-L01-smoke-18`
34. `547-06-L01-smoke-registry`
35. `547-06-L01-integration`

Phases 1–13 retain their already frozen exact ownership sets. Phase 14 owns only
the ten acceptance files frozen by TASK-547-06-L01. Phase 15 owns only the seven
shared tracked smoke modules and seven matching focused tests. Each phase
16–33 owns exactly one `scripts/task-547-runtime-smoke/scenarios/NN-<id>.ts`
module and its independently runnable
`tests/unit/workflows/task547RuntimeSmoke/scenarios/NN-<id>.test.ts`. Phase 34
owns only `registry.ts`, `aggregate.ts` and their two focused tests. Phase 35
owns only the tracked `cli.ts`, its focused test, `.gitignore`, `package.json`
and `tests/README.md`. TASK-547-07 freezes the complete exact path matrix; broad
directory globs are not writable authority.

TASK-547-07's canonical ownership map is the sole source of truth for the
current family-wide path count, and workflow checks must derive that count from
the map instead of hardcoding a stale total. Workflow entrypoints/private
libraries are process ownership under TASK-547-07 and do not transfer any
source path or symbol between leaves.

## Canonical Runtime Smoke Registry Contract

TASK-547-06-L01's tracked registry must contain these exact ordered rows and no
others:

| NN | Scenario ID | Exact session |
| --- | --- | --- |
| 01 | `home-desktop-effects` | `wf547smoke` |
| 02 | `all-routes-desktop-shell` | `wf547smoke` |
| 03 | `tablet-responsive` | `wf547smoke` |
| 04 | `mobile-navigation` | `wf547smoke` |
| 05 | `portfolio-facets` | `wf547smoke` |
| 06 | `aurora-detail` | `wf547smoke` |
| 07 | `contact-form` | `wf547smoke` |
| 08 | `publish-rollback` | `wf547smoke` |
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

This table is the canonical order/identity/session spine. TASK-547-06 and its
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
- Each of the exact 18 browser scenarios can run and fail in isolation. A
  scenario-specific correction changes only that scenario module and focused
  test; a shared-harness correction is an explicit cross-cutting remediation
  that reruns the shared gate and all affected scenario tests.
- `--scenario 05` promotes only scenario 05's result/PNG plus the aggregate
  manifest and proves the other 17 evidence pairs byte-identical. `--all`
  promotes no evidence unless all 18 independent cleanups restore the same
  initial state; then it replaces the complete evidence set as one atomic
  publication.
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
- the tracked root CLI at `scripts/task-547-runtime-smoke/cli.ts` runs the exact
  sessions `wf547smoke` (eight public flows), `wf547formdesign` (five Form
  Design flows) and `wf547pageeditor` (five Page Editor flows); it closes and
  reopens the applicable exact session for every scenario rather than sharing
  browser state
- each scenario performs its own free-port/no-session/no-temp preflight, scoped
  package apply, `coderso-dev-core-host` start and separate admin/front health
  checks, browser assertions, screenshot, submission cleanup, exact-run
  rollback, prior-state equality proof, session close, exact helper-process
  stop, final free-port/no-temp proof and only then evidence promotion
- every one of the 18 scenario modules and matching tests is tracked,
  independently runnable and at most 1,000 physical lines; assertions record
  URL, viewport, zero console/page errors, material visible effects and one
  distinct valid PNG metadata/hash record
- official evidence is exactly 37 tracked artifacts under
  `_docs/PLAYWRIGHT/task-547-runtime-smoke/`: `manifest.json` plus one
  `NN-<id>/result.json` and `NN-<id>/screenshot.png` pair per scenario; a narrow
  root-anchored `.gitignore` exception
  `!/_docs/PLAYWRIGHT/task-547-runtime-smoke/*/screenshot.png` admits only these
  PNGs and `git add -f`/force-add is
  forbidden
- the aggregate proves every scenario's cleanup final-state digest equals the
  run's initial digest and the following scenario's preflight digest
- the aggregate binds the exact tracked
  `task547RuntimeRegistryProjection()` through canonical `registryDigest`;
  ignored workflow code never reconstructs a second runtime descriptor list
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

After all 35 implementation phases and atomic commits are validated:

1. write and atomically commit draft product/developer/task closeout docs without
   terminalizing any TASK-547 status;
2. run five fresh internal-Codex post-audit lenses, verify every finding locally,
   fix HIGH/MEDIUM findings atomically and rerun every affected gate/lens;
3. run one root-owned composite smoke gate from the immutable final candidate:
   preliminary `--all`, exact `--scenario 05` isolation proof, then final
   `--all`;
4. root-verify and atomically commit the exact 37 tracked evidence artifacts;
5. only then terminalize task/changelog/index state and run the final fresh
   read-only graph/closeout consistency pass.

Any source, test, runtime-smoke contract, validation-contract or relevant draft
documentation change after step 2 invalidates the smoke. Any failed/dirty
cleanup or evidence mutation after step 3 invalidates the full 18-scenario set.
Internal agents may review the final tracked outputs but cannot create or repair
them. No TASK-547 commit is merged into `feat/implementations` by this workflow.

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
