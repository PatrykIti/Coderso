# TASK-548: Hybrid Visual Documentation Platform
# FileName: TASK-548_Hybrid_Visual_Documentation_Platform.md

**Priority:** High
**Category:** Documentation / Assistant / Admin UI / Release
**Estimated Effort:** Very Large
**Dependencies:** TASK-109, TASK-182, TASK-403; TASK-545 `✅ Done`;
TASK-547 terminal; complete TASK-551 terminal (parent `✅ Done`, every
descendant terminal, board/changelog synchronized). The pre-dispatch
verification order is described in the Product Dispatch Gate / authorization
sections below.
**Related Tasks:** TASK-240, TASK-414, TASK-489, TASK-547, TASK-555, TASK-556
**Status:** ⏳ To Do
**Contract Refreshed:** 2026-08-09
**Changelog:** 1261 pinned

**Product Dispatch Gate:** the terminal TASK-547/TASK-552 handoff below is
frozen. After the remaining external dependencies are terminal, re-prove its
byte identity, land the bounded TASK-548-08 workflow bootstrap, and obtain one
complete fresh authoring-audit round with all results plus cross-file
reconcile. Fix verified HIGH/MEDIUM findings and rerun only affected audit
scopes/reconcile before any TASK-548-01..07 product dispatch. The TASK-548-08
bootstrap modes and the immediate pre-01-L03 dispatch gate additionally
derive and verify the complete terminal TASK-551 family on the CURRENT HEAD
through
`deriveAndVerifyTask551CurrentTerminalStateV1` (parent `✅ Done`, every physical
descendant terminal, current board/changelog synchronized, changelog 1263
present and valid, current task files and no unresolved drift — no
expected-HEAD receipt and no unique historical commit/hash authority)
and require the exact TASK-551-02-L02/04-L02/05-L01 handoff
exports before any TASK-548-01-L03 or later dispatch; in
`task548-bootstrap-committed-resume` the required final re-verification of that
complete TASK-551 family gate happens AFTER the exact HEAD, clean-tree,
checkpoint and byte-parity validation, immediately before the authoring audit
(the earlier pre-validation run is defense in depth only); a `⏳ To Do` TASK-551
blocks dispatch. This gate is not
a parent/child dependency edge.

---

## Overview

Replace the current text-only Guide corpus with one strict, versioned visual
documentation system that produces three consistent product surfaces:

1. an embedded, locally packaged `/admin/help` documentation center;
2. the deterministic database-backed Guide with structured sources, examples,
   and relevant screenshots; and
3. a versioned, public, static Coderso documentation portal.

Agents author prose and examples, execute deterministic real CMS flows with
`playwright-cli`, capture reviewed screenshots, and validate that prose,
screens, routes, permissions, examples, and product versions still agree. A
single compiler turns those reviewed sources into one distribution bundle. The
CMS never calls the public portal for each question and remains useful without
internet access or an AI provider.

This family extends the completed TASK-109 and TASK-403 contracts; it does not
reopen them. TASK-182 intentionally removed a mode selector. The new
**Guide** and **Agent** tabs are separate product capabilities with separate
state, not a restored selector for one mixed chat mode.

**2026-08-08 TASK-414 handoff:** Guide answers default to exact
`detailLevel: "basic"` with a primary body no longer than 440 Unicode scalar
values and no more than two prose sentences or three ordered steps, and provide
an authorized non-null internal deep link to the full documentation section
for every successful grounded `answer`. Zero/fully filtered evidence returns a
typed `no_match`/`needs_input` non-answer and never fabricates a link. The
capability catalog and generated coverage must
distinguish atomic controls from composed workflows without adding another
authored corpus or Guide API. The original area `capabilityIds` remain
byte-compatible; a separate generated `DocsCapabilityCompositionCatalogV1`
carries stable atomic/workflow identities, an ordered non-empty workflow-to-
control relation, and exact localized document/locale/section bindings.
TASK-548-01-L02 owns its three exact pre-bundle source registries and compiles
the relation into `DocsDistributionBundleV2`; their canonical bytes participate
in the bundle `sourceHash`. TASK-548-06-L02 validates/projects that landed
catalog and never generates it from the bundle it consumes.
TASK-414-02 consumes this terminal relation in the unified CMS capability
manifest. After TASK-548 is terminal, successor writes are serialized exactly:
TASK-489 adds its Solution Kit history/exact-rollback Guide facts, TASK-555 then
adds curated-starter Guide facts, and final TASK-414-02-L02 adds Agent/Designer/
Figma facts and compiles the CMS manifest. Each successor owns only its exact
source/contribution delta, rereads prior terminal bytes, and invokes unchanged
TASK-548 generators/output transactions in their owned order so the bundle,
source hash and coverage projections are current at that task's closure. None
reopens TASK-548, hand-edits generated output, or creates another compiler.
TASK-414-02-L03 runtime plugin packs never mutate these tracked registries or
generated core bytes. Post-terminal TASK-556 uses TASK-414's landed successor
extension path and repeats the same source-then-generator discipline for its
static-starter facts. TASK-414 does not move Agent sessions/tools or Designer
into TASK-548.

## Terminal TASK-547/TASK-552 Handoff

TASK-547 and the TASK-552 smoke reclosure are present at source commit
`a13d186167a05901e644bf1a3a7aefee6f780471`, landed through merge
`963733cae23456622bea1eef1b734723aaab2350`. The TASK-547 delta changes no
`docs/guide/*.md` path: the tree still contains 71 Markdown files, of which the
68 ingestible legacy documents exclude exactly `docs/guide/README.md`,
`docs/guide/_COVERAGE_MATRIX.md`, and `docs/guide/_TEMPLATE.md`. The v2 golden
therefore pins `task547TerminalHead` to the full source commit above and
`sourceCount: 68`; a later byte/path change requires an explicit amendment and
fresh audit.

Serialized follow-on ownership is literal:

- TASK-548-07-L01 alone may amend `_docs/ARCHITECTURE.md`, `_docs/CMS_API.md`,
  `_docs/DATA_MODEL.md`, `_docs/TESTING_STRATEGY.md`,
  `_docs/SECURITY_SPEC.md`, `_docs/CODERSO_RELEASE_GATES.md`,
  `_docs/RELEASE_PROCESS.md`, and
  `_docs/ASSISTANT_SITE_BUILDER.md`, after reading their terminal bytes;
  adding `_docs/SECURITY_SPEC.md`, `_docs/CODERSO_RELEASE_GATES.md` and
  `_docs/RELEASE_PROCESS.md` to this literal handoff reconciles the
  closeout list with the Documentation Updates Required section below, which
  already names them; no other TASK-548 leaf may edit them;
- TASK-548-02-L02 is the SOLE writer of
  `scripts/runtime-smoke/contracts.ts`, `scripts/runtime-smoke/cli.ts`,
  `scripts/runtime-smoke/registry.ts`,
  `tests/unit/runtime-smoke/cli-registry.test.ts`, and
  `docs/develop/runtime-smoke-cookbook.md`: after TASK-554's critical suite
  lands, it adds both exact TASK-548 suite IDs, `task-548` (with its
  five-flow documentation-capture adapter/recipe) and the second and final
  suite `task-548-portal` (fixed adapter path and recipe);
- TASK-548-04-L03 implements ONLY the focused `task-548-portal` contribution
  modules behind that already-landed fixed row (never editing the shared
  seams), and TASK-548-07-L01 contributes ONLY the focused final eight-flow
  scenario module consumed by the already-landed `task-548` adapter shell
  (never editing the adapter shell, shared seams, or cookbook) — neither
  registers a suite and neither rewrites a shared runtime-smoke file;
- `_docs/PAGE_MODEL.md`, `_docs/SOLUTION_KITS.md`,
  `_docs/PLAYWRIGHT/ENVIRONMENT.md`, `docs/develop/full-site-packages.md`,
  `AGENTS.md`, and every `core/services/kits/fullSite*` path remain read-only to
  TASK-548.

No other TASK-548 leaf may touch those shared paths. Any concurrent owner or
post-freeze terminal-byte change blocks dispatch until ownership is
reconciled; unmerged worktree bytes are never authority.

## Verified Baseline

- `docs/guide/` is already the end-user corpus ingested by
  `core/services/assistant/docsIngestService.ts`.
- The current corpus has no canonical visual assets and its template has no
  stable document/section/visual identity or version contract.
- `assistant_docs` and `assistant_doc_chunks` persist searchable prose but not
  stable section, visual, example, locale, version, route, or permission
  references. V2 storage is a separate cohesive table set
  (`core/db/tables/assistantDocsV2.ts`); the legacy V1 tables, their current
  generated vectors/indexes, unique `source_path`, legacy ingest runs and
  `ON CONFLICT(source_path)` remain byte/DDL-compatible and are never enriched
  in place.
- `AssistantMessage.tsx` renders text and lists; the response contract has no
  safe visual/example blocks.
- `AssistantPanel.tsx` sends page/locale context, while current deterministic
  retrieval does not use the full context for filtering/ranking.
- Guide visibility is coupled to `assistant.enabled`, index readiness, and
  provider-oriented panel state even though docs-only answers do not need an
  AI provider.
- `AdminApp.tsx` (1,237 lines), `AssistantPanel.tsx` (1,359 lines), and
  `docsAnswerComposer.ts` (1,202 lines) already exceed the repository's
  1,000-line limit. Any touched file must be split by cohesive responsibility
  before behavior is added.
- The existing `_docs/PLAYWRIGHT` and `_docs/_workflows/_smoke` images are task
  evidence, not canonical public documentation assets.

All implementation anchors are hints to re-verify against the live tree before
editing. Empty `rg` results on known large files are not evidence that a symbol
is absent.

## Product Architecture

```text
docs/guide prose + metadata + examples
                 │
Playwright scenarios ── reviewed canonical screenshots
                 │
                 ▼
        strict corpus compiler
                 │
       DocsDistributionBundleV2
          ┌──────┼──────────┐
          ▼      ▼          ▼
   embedded Help DB reindex public static portal
                    │
                    ▼
             deterministic Guide
```

### Source and target ownership

- `docs/guide/` remains the single authored end-user source and the only
  assistant retrieval corpus.
- The initial v2 compiler excludes `docs/develop/` completely. A future
  explicit public-only feed may reuse the compiler, but it must remain a
  separately declared target and must never enter assistant retrieval unless a
  separate security/product task changes that boundary.
- Shared strict contract names are:
  `DocsCorpusManifestV2`, `DocsDocumentV2`, `DocsSectionV2`,
  `DocsPermissionRequirementV1`, `DocsVisualV1`, `DocsExampleV1`, and
  `DocsDistributionBundleV2`.
- `DocsVisualV1`/`DocsPublicationVisualV1` additionally carry the
  compiler-derived bounded `scenarioStepSearchText` projection: safe
  searchable step summaries derived only from the strict scenario
  action/assertion DSL (action/assertion kinds plus the normalized bounded
  `press` key), containing no locator/selector, `fixtureValueRef`, expected
  value, watch path, route, viewport, theme, `alt`/`caption` or fixture
  bytes; deterministically deduped and bounded by `docsCorpusLimits.ts` (at
  most 16 tokens, each at most 24 UTF-8 bytes, aggregate at most 512 UTF-8
  bytes, charset `^[a-z][a-z0-9-]{0,23}$`). Assistant DB
  `evidence_search_text` and the Help search index consume only this compiled
  projection; no consumer reads raw scenario files at runtime or search time.
- Guide search context is one pure/browser-safe strict DTO
  (`AssistantDocsGuideSearchContextV1`, owned by TASK-548-01-L03) carrying the
  canonical locale, server-resolved `productVersion`, canonical admin
  route/surface, catalog-validated `capabilityIds`, the bounded normalized
  query and the normalized permission snapshot. Browser request hints are
  advisory; authorization, version and route resolution are server-owned. One
  pure shared transport contract module
  (`core/services/assistant/assistantTransportContracts.ts`, single writer
  TASK-548-03-L03) owns the Guide request-context hint schema, the strict
  reindex request/response unions (`AssistantReindexRequestV2` and
  `AssistantReindexResultV2` with `prepared`/`unchanged`/`activated` wire
  outcomes), and the status/chat wire unions with strict schemas and
  normalizers; server
  service/route and admin clients import it.
- Document access metadata uses exactly
  `permissionRequirement: DocsPermissionRequirementV1 | null`, where the
  requirement is `{ mode: "allOf" | "anyOf"; permissions: string[] }`.
  Permission arrays are non-empty, unique, canonically sorted and catalog
  validated. Null means no extra catalog permission. Route visibility and
  authentication remain separate registry concerns: it is valid for the public
  token-gated `/preview` descriptor and the authenticated `/help` descriptor.
- `capabilityIds` is the single bounded, canonical, catalog-validated
  capability field used by compiler, ingest, search and coverage.
- The schema discriminator is `coderso.docs-corpus@v2`.
- Publication targets are exactly `assistant`, `embedded-help`, and
  `public-docs`.
- Every consumer filters before indexing, persistence or rendering:
  embedded Help accepts only documents containing `embedded-help`, and the
  portal accepts only documents containing `public-docs`. Assistant
  ingest/retrieval eligibility is the conjunction `assistant` AND
  `embedded-help`: a document targeting `assistant` without `embedded-help`
  fails ingest/coverage because every successful basic Guide answer must carry
  one authorized non-null `Open in Help` action to a complete localized
  section. `public-docs` may be present additionally but is never required for
  Guide eligibility. A document may target more than one surface, but absence
  of a required target always excludes it from that surface.
- Stable `docId` is translation-family identity and is intentionally reused
  across locales; document uniqueness is the exact `(docId, locale)` pair.
  `sectionId` is unique within that localized document, while `visualId` and
  `exampleId` are bundle-global. Every authored sidecar, visual promotion
  identity, receipt, Guide evidence record and Help deep link still carries the
  owning canonical `locale`; no consumer joins a localized document by bare
  `docId` or by `docId + sectionId`. Internal Help and public portal URLs are
  derived, never copied into prose by hand.

### Local-first distribution

- Embedded Help consumes the locally packaged distribution bundle.
- Assistant retrieval remains DB-backed. Reindex loads the fixed packaged
  bundle exactly once and persists its independently revalidated contract; it
  cannot invoke the compiler, Markdown/source-root resolver, workspace
  recovery, migration report, provider or network fallback.
- The public portal consumes the same bundle and assets.
- The CMS does not fetch the public portal or a remote documentation API while
  answering a question.
- Public artifact manifests may support release distribution and update
  discovery, but remote hot-install of documentation bundles is out of scope.

### Guide and Agent separation

- **Guide** is deterministic and provider-independent. It always exposes local
  Help/search for an authenticated Admin user. When the existing authorized
  DB-backed Guide endpoint is ready, it also composes source-grounded answers.
  Provider absence or Agent disablement must never hide local Help.
- **Cutover continuity:** Guide availability has NO gap through the legacy→V2
  cutover. TASK-548-01-L03 owns the era-aware facade
  (`searchAssistantDocsAuthoritativeV2`) plus the closed
  `assistant_docs_v2_legacy_acl` table (populated/closed during the resumable
  immutable backfill from the strict legacy context catalog);
  TASK-548-03-L03's consumer cutover deploys the facade before activation, so
  Guide is served by
  the ACL-joined frozen V1 corpus (SQL authorization before projection/LIMIT)
  until activation and by the active V2 snapshot after activation;
  activation/rollback switch ONLY the DB pointer and exactly one backend is
  queried per question (never both). V1 `guideReadiness` is `ready` iff the
  pointer era is `v1`, the V1 corpus is immutable/frozen (cutover record at/
  past `v1_frozen`), and `legacy_acl_snapshot_id` references a complete closed
  ACL snapshot — it does NOT depend on the ordinal cutover state, and a
  concurrent replacement backfill's `building` snapshot never invalidates an
  existing binding: the old valid ACL binding is retained/pinned while the new
  cohort/ACL is assembled, only the final `building → prepared` transaction
  atomically rebinds the pointer to the new complete ACL snapshot, abort
  leaves the old binding untouched (an initial abort leaves NULL), and the
  destructive legacy-resume transition clears the binding and is not-ready.
  The facade cutover is
  DISPATCH/DEPLOY-GATED: it may land only when the cutover row is EXACTLY
  `shadow_parity_clean` (never merely at/past
  `backfill_complete`) with exactly one complete prepared snapshot, the
  pointer's closed `legacy_acl_snapshot_id` binding, and facade code
  compatible with the row's `deploymentIdentity`/`rolloutGeneration` contract
  — never a preexisting rollout receipt (no receipt can exist for a facade
  build that is not yet deployed); before those bytes are deployed the legacy
  service remains
  serving Guide (through `v1_active`/`v1_frozen`/`building`/pre-backfill).
  Once deployed, every facade V1 ready result uses the prepared/ACL snapshot
  identity as its exact authorization/evidence snapshot, and a facade binary
  starting without the binding fails readiness with zero authorized rows. The
  rollout receipt is then recorded for that exact deployed facade build
  (`servingBuildSha256`) and proves zero V1-only serving replicas; it remains
  mandatory for `consumers_ready` and activation, never for facade deployment.
  The canonical deploy order (freeze → backfill → parity → facade deployment →
  rollout receipt → consumer readiness → activation) prevents an availability
  gap.
  Rollback after activation restores `v1_frozen` (trigger guards, frozen V1
  rows, `legacy_acl_snapshot_id` and the facade binding are preserved; V1
  stays immutable and safely readable); resuming mutable legacy V1 is a
  separate destructive/maintenance transition that clears the ACL binding and
  requires a fresh freeze + backfill before facade use — never normal
  rollback.
- **Agent** is optional, provider-backed, and uses the existing typed
  plan/review/execute contracts. It has separate readiness, history, errors,
  and empty states.
- Cross-tab handoff is explicit and bounded to the sanitized user-authored
  question or goal only. Documentation references, response/source text,
  provider metadata, plans and execution results are not transferred;
  histories are never silently merged.
- `assistant.enabled` may gate the Agent capability, but it must no longer gate
  embedded local Help.

## Scope

- Strict corpus, document, section, visual, example, scenario, receipt, and
  distribution schemas with recursive reject-unknown validation.
- Stable locale, product SemVer range, route, permission, capability, target,
  and freshness metadata.
- One code-owned capability relation that classifies atomic controls and
  composed workflows, with ordered workflow-to-control closure and generated
  zero-gap documentation coverage.
- Deterministic safe Markdown-to-AST compilation with no raw HTML or dangerous
  URL schemes.
- Deterministic search artifacts and byte-stable bundle generation.
- Compiler-derived bounded scenario-step search projections and one pure
  shared assistant transport contract module (Guide request-context hints,
  strict reindex request/response unions with
  `prepared`/`unchanged`/`activated` wire outcomes, and status/chat wire
  unions).
- Backward-compatible DB ingest/index evolution with complete migration
  artifacts and atomic reindex: V2 rows live in the separate cohesive
  `assistant_docs_v2_*` tables while the legacy
  `assistant_docs`/`assistant_doc_chunks` rows, vectors, indexes, unique
  `source_path`, legacy ingest runs and `ON CONFLICT(source_path)` stay
  byte/DDL-compatible.
- Focused `scripts/docs/*` tooling for synthetic fixtures, named
  `playwright-cli` sessions, visible-effect assertions, capture, review,
  promotion, receipts, staleness, and visual diff evidence.
- Canonical, bounded documentation screenshots under `docs/guide/assets/`;
  raw images and transient diffs remain in `.tmp`.
- Authenticated `/admin/help` SPA route with search, article navigation,
  accessible visual examples, contextual CMS links, and official documentation
  links.
- Independent Guide and optional Agent tabs.
- Static official portal with version/locale routes, local search, canonical
  metadata, sitemap, accessibility, CSP-safe rendering, and base-path support.
- Immutable versioned publication artifacts and tag-pinned release handoff.
- Migration of the complete active English Guide corpus and coverage of active
  Admin screens/capabilities. Locale identity is ready for Polish content, but
  this task must not claim that the Admin UI itself is fully localized.
- Dependency-shaped automated tests, exactly eight ordered real browser flows,
  security scans, documentation, changelog, and task closure.

## Out of Scope

- The full-screen AI site Designer, unconstrained HTML generation, design
  revisions/canvas, or applying a generated site to CMS data. That requires a
  separately researched and decomposed task family and is now owned by
  TASK-414-07 through TASK-414-10.
- A public write API, public documentation CMS, comments, feedback ingestion, or
  analytics beacon.
- A runtime external documentation query API or per-question network request.
- Remote hot-update/install of a documentation bundle inside an already
  installed CMS.
- Storing screenshot bytes in PostgreSQL.
- Reusing task smoke screenshots as public assets without a fresh deterministic
  capture and review.
- Raw HTML/JavaScript in documentation, remote image URLs, arbitrary CSS, or
  arbitrary filesystem paths.
- Claiming full Polish UI/documentation parity before the relevant localization
  program supplies and verifies it.

## Security Contract

- **Embedded route visibility:** `/admin/help` is an internal Admin SPA route.
  The Admin shell requires an authenticated session; no new server API route is
  introduced for Help.
- **Help RBAC:** any authenticated Admin user may read public-safe bundled
  documentation. Contextual “Open in CMS” actions are derived through
  `adminPaths` and hidden/disabled from the current fail-closed permission
  snapshot when the destination is unavailable.
- **Existing assistant API:** `/assistant/chat` retains its internal auth/RBAC,
  POST CSRF, `assistant` rate bucket, bounded message/context schema, and strict
  reject-unknown policy. `/assistant/reindex` remains internal,
  `settings:write`, POST CSRF, `assistant` bucket, and audit logged. Response
  enrichment must not weaken either route.
- **Public portal:** static public read only. It has no write endpoint, session,
  CSRF, nonce/HMAC, CAPTCHA, or provider credential. Static CSP and URL
  sanitization are mandatory.
- **Scenario anti-abuse:** capture manifests allow local origins and bounded
  route/action/viewport/theme/locale values only. Fixtures are synthetic,
  uniquely scoped, and clean up only owned rows.
- **Content validation:** reject unknown keys recursively; reject duplicate IDs,
  traversal, symlinks, unsafe schemes, remote visual URLs, raw HTML, invalid
  SemVer/locale/route/permission values, asset hash mismatches, and orphan refs.
- **Secrets/privacy:** documentation, bundles, browser state, receipts,
  screenshots, portal output, logs, and caches must contain no credentials,
  cookies, CSRF/session material, provider prompts/keys, submissions, access
  logs, or real user data.
- **Release:** tag-pinned checkout, SHA-pinned actions, least privileges,
  immutable exact-version directories, and fail-closed refusal to overwrite an
  existing version. Semantic-release is the sole public release authority: the
  owner only reviews, commits and merges to the protected release branch;
  semantic-release alone creates the generated version/lock/changelog release
  commit, the plain SemVer tag and the GitHub release, and TASK-548-05-L02's
  NORMAL RELEASE publication deploys Cloudflare only when `released == "true"`
  (the docs-rollback job requires only the exact normalized rollback mode plus
  a successful rollback job and never requires semantic-release output). The owner never runs
  `git tag`/`gh release` and never guesses a version or tag.

## Architecture Invariants

1. One authored fact has one owner; Help, Guide, and portal do not fork prose.
2. Binary images remain packaged assets; DB rows store only normalized stable
   references and searchable captions/alt text.
3. Images complement prose. Search indexes captions, alt text, the
   compiler-derived scenario-step search projection, and examples; it never
   depends on OCR of a screenshot and never reads raw scenario DSL/fixture
   bytes.
4. Raw HTML never crosses either renderer boundary.
5. A failed compiler, asset verification, or reindex cannot publish/prune the
   previously valid corpus.
6. Search uses locale/version/route/permission/capability context
   deterministically before any optional provider work.
7. No screenshot baseline is accepted automatically.
8. Generated coverage is derived from manifests and the canonical Admin route
   registry; a hand-edited matrix cannot declare success.
9. Existing no-provider installations keep Guide/Help useful.
10. Every touched human-authored production or test file closes at or below
    1,000 physical lines.
11. Guide availability is continuous through the V1→V2 cutover: one
    authoritative era-aware facade selects exactly one backend per question
    (ACL-joined frozen V1 before activation and after rollback; V2 after
    activation) and never queries or falls back to both.

## Sub-Tasks

### Land order

**Orchestration sidecar:** TASK-548-08 runs throughout the family and owns only
workflow/audit evidence.

1. [ ] **TASK-548-01** — canonical documentation contract, deterministic
   compiler, distribution bundle, and assistant ingest migration
   (3 executable leaves).
2. [ ] **TASK-548-02** — deterministic Playwright visual scenario, capture,
   promotion, receipt, staleness, and diff pipeline (3 executable leaves).
3. [ ] **TASK-548-03** — authenticated embedded Help plus independent Guide and
   optional Agent tabs (3 executable leaves).
4. [ ] **TASK-548-04** — official versioned static documentation portal
   (3 executable leaves).
5. [ ] **TASK-548-05** — immutable distribution artifact and release publication
   handoff (2 executable leaves).
6. [ ] **TASK-548-06** — complete corpus/visual migration and generated coverage
   reconciliation (2 executable leaves).
7. [ ] **TASK-548-07** — combined gates, real browser acceptance,
   documentation, changelog, and closure (1 executable leaf).
8. [ ] **TASK-548-08** — multi-agent author/implement/fix/post-audit workflow and
   drift evidence (no product-source leaf).

Executable implementation is dispatched by TASK-548-08 in three deploy-gated
phases, each with its own strict owner commit/merge/deploy pause and a fresh
mutually exclusive resume mode (`task548-foundation-migration-resume`,
`task548-consumer-cutover-resume`); no phase trusts prior-process memory and
every resume verifies strict checkpoint/HEAD/deployment/DB-state inputs:

1. **Foundation** (initial committed-bootstrap implementation):
   `01 (including the initial 01-L02 bundle/report) → 01-L03`, gated, then an owner
   action to commit/merge and deploy the migration-capable foundation; process
   ends. The operator then runs the V1 freeze → cutover backfill →
   shadow-parity sequence under 01-L03.
2. **Facade** (fresh `task548-foundation-migration-resume`): verify the exact
   committed/deployed foundation bytes and the DB cutover state EXACTLY
   `shadow_parity_clean`, rerun the current-tree audit, then implement
   `02-L01 → 02-L02 → post-pilot-generated-bundle-refresh-gate →
   02-L03 →
   03-L01 → 03-L02 → 03-L03`; the 03-L03 facade dispatch is gated at EXACTLY
   `shadow_parity_clean` (never merely at/past `backfill_complete`). Gate, then
   return an owner action to commit/merge/deploy the era-aware facade while the
   pointer stays V1; process ends.
3. **Consumer cutover** (fresh `task548-consumer-cutover-resume`): verify the
   exact facade deployment, the rollout receipt for that build, consumers
   ready, and the DB cutover state EXACTLY `v2_activated`, rerun drift, then
   implement `04 → 05 → 06-L01 → final-native-corpus-generated-bundle-
   handback-gate →
   06-L02 → 07` and enter the prerelease post-audit/final release pause.

TASK-548-01-L02 is the exclusive writer of
the durable tracked `core/generated/docs/coderso-docs-v2.json` for the whole
family; it lands and gates ONCE as the sole compiler/source owner.
TASK-548-06-L01 may edit native Guide sources and production visual
triples but may not write that generated final. After those edits, orchestration
pauses TASK-548-06 and invokes the ALREADY-LANDED exact compiler CLI
generated-artifact-only to regenerate
and verify the bundle plus the workspace-only ignored
`.tmp/docs-corpus/migration-report-v1.json` from the final native source set.
This checkpoint occurs exactly once after all TASK-548-06-L01 source/visual edits,
never per wave or per promotion; it uses no agent writer, edits no
human-authored source/task/status byte, and has its own gate. Only after it
passes may TASK-548-06 resume
read-only `docs:check` and TASK-548-06-L02 coverage reconciliation. It is a
generated-artifact-only checkpoint of the landed CLI, not a second writer.
TASK-548-07 remains the
only status writer, so the checkpoint neither reopens the terminal 01-L02 leaf
nor changes parent/child status during implementation.

The linked bundle/report transaction exists only for explicit TASK-548-01-L02
authoring/migration `--write` runs and the two named generated-artifact-only
checkpoints. Its stable
prestates are exactly `bootstrap-none`, clean-checkout
`packaged-bundle-only`, and `linked-pair`; report-only and recovery hazards fail
closed. A clean clone/tag, production runtime, portal, Docker image, release,
`docs:check`, and coverage check require only the tracked bundle. Consumers call
exactly one zero-input atomic `loadPackagedDocsDistributionBundleV2()`, which
internally inspects workspace hazards and validates packaged bytes/`sourceHash`;
no separate guard call, recovery, write, or ignored report is allowed.

The same status rule applies to the post-pilot checkpoint: after
TASK-548-02-L02 writes exactly five pilot scenario/image/receipt triples
(and, BEFORE its pilots, lands/gates terminally the dependency-bearing
toolchain bytes it owns — root/core package manifests, root bun.lock,
Dockerfile, all three documentation workspace manifests, root docs scripts,
exact root devDependency pins `@playwright/cli: 0.1.18`/`pixelmatch: 7.2.0`, the one lock-producing `bun install --lockfile-only` reconciliation plus the separate `bun install --frozen-lockfile` verification, the
repo-local-only dispatcher resolver and the Chromium install/verify),
the ALREADY-LANDED compiler CLI is invoked generated-artifact-only to
regenerate the exclusive bundle/report from those bytes and
passes its own targeted gate before `02-L03` or TASK-548-03 may start.
TASK-548-02-L03 is one normal post-pilot leaf that consumes those bytes
read-only and owns only the staleness/diff/recovery/CI implementation, PR
workflow and focused tests.

TASK-545 and the frozen TASK-547 handoff are separate hard dispatch blockers,
not advisory dependencies. TASK-545 must be exactly `✅ Done`, because TASK-548 imports its
tracked shared workflow drivers; `⏭️ Superseded` or `❌ Cancelled` cannot
authorize a substitute. TASK-547 must remain terminal at the source/merge
identity recorded above. TASK-548 must not edit either family to manufacture
those states.

The remaining pre-authoring authorization order is exactly:

1. TASK-545 reaches exactly `✅ Done`.
2. Re-read the terminal source/merge identities and every literal handoff path
   above; byte or ownership drift requires a parent amendment and fresh audit.
3. Select only `task548-bootstrap-build`. This bounded TASK-548-08 bootstrap is
   the sole pre-authoring-audit exception and may rebuild, validate,
   and hand the owner for tracking/commit only these exact six paths:
   `_docs/_workflows/lib/task-548-contract.mjs`,
   `_docs/_workflows/task-548-author-audit.mjs`,
   `_docs/_workflows/task-548-fix.mjs`,
   `_docs/_workflows/task-548-implement.mjs`,
   `tests/unit/workflows/task548AuthorAudit.test.ts`, and
   `tests/unit/workflows/task548WorkflowContracts.test.ts`. They import the
   tracked TASK-545 drivers. Before any owner checkpoint/commit, require only
   the exact six-file write set and forbidden-path gate, Node syntax checks,
   targeted workflow tests, line counts, and `git diff --check`.
4. Hand the exact reviewed-byte checkpoint to the owner. Its bounded strict
   owner action identifies TASK-548/schema/mode/prior 40-hex HEAD, the exact six
   sorted `{ path, sha256 }` records, their canonical aggregate SHA-256, and
   canonical unpadded base64url checkpoint plus SHA-256 in exact `resumeArgv`.
   Only the owner stages and commits exactly those six paths. The bootstrap cannot edit
   product/source, task, documentation, changelog, status, or evidence bytes;
   TASK-548-08 remains `⏳ To Do`. Return immediately; do not validate the
   commit, audit or implement in this process.
5. In a fresh, mutually exclusive `task548-bootstrap-committed-resume`, strictly
   decode and timing-safe verify that current-process checkpoint, reject unknown/
   missing/duplicate/stale fields, then require the new HEAD to be one exact
   single-parent owner commit over the recorded prior HEAD with the exact six-path diff,
   `git ls-files --error-unmatch` for all six paths, clean status and unstaged/
   staged diffs, `git show HEAD:<path>` byte parity for every path, and the
   clean-checkout/worktree tests. None of these post-commit gates may be required
   of the uncommitted rebuild. This mode cannot rebuild or rerun pre-commit gates.
   Later TASK-545 first validates the committed exact-six-path receipt, then its
   exact phase-1 call pins 1261/`task-548-hybrid-visual-documentation` and derives
   `_docs/_workflows/task-548-implement.mjs` only from the executing `import.meta.url`;
   caller overrides, untracked/dirty/
   wrong-task/symlink entries or failed TASK-545 static/import gates reject.
6. Only after that complete post-commit gate passes — and, in
   `task548-bootstrap-committed-resume`, only after repeating the complete
   terminal TASK-551 family gate fresh against the validated HEAD/tree as the
   required final gate, immediately before this audit (the early run before
   checkpoint/HEAD validation is defense in depth only) — run one complete fresh
   authoring-audit round with every per-file result and one cross-file
   reconcile. Fix verified HIGH/MEDIUM findings, then rerun only the affected
   scopes and reconcile until zero HIGH/MEDIUM remain; do not impose a minimum
   clean-round count or replay unchanged scopes.
7. Only that PASS authorizes the three deploy-gated executable product phases
   (foundation → facade → consumer cutover, in the exact phase orders above);
   the TASK-548-08 wrappers orchestrate
   throughout without becoming a product-source writer.

The current ignored/provisional TASK-548 helper and every result it produced are
non-authorizing. It cannot be promoted merely by tracking its current bytes:
all six exact bootstrap files must be rebuilt against the final tracked TASK-545
owners and pass the pre-commit gate before the owner commit, then the separate
committed-resume gate from the resulting clean HEAD, with no rebuild loop. Any later change to a bootstrap
artifact, any TASK-548 task contract, or an imported TASK-545 driver invalidates
the affected authoring authorization and requires a new complete round when
the contract-wide input changed, or only the affected scopes when the canonical
workflow permits narrow rerun. An audit run before either dependency gate, before the
literal-path amendment, or before the committed clean-checkout bootstrap is
stale and does not qualify. No TASK-548-01..07 product implementation leaf may
dispatch until this exact sequence passes; the bounded TASK-548-08 bootstrap
grants no product/source or status-write authority.

Only TASK-548-07 may edit TASK-548 statuses, the board, changelog 1261, or the
changelog index during implementation.

Closure orchestration keeps commit SHA, computed `HEAD^{tree}` Git OID, clean
index/worktree parity, and canonical `runtimeTreeSha256` distinct; clean parity
gates consumption and the runtime digest binds immutable receipts. The computed
tree values are not extra release-resume inputs. The release-resume keeps TWO
tree identities: `runtimeTree` from the clean workflow-run HEAD (committed-head
drift/preparation identity) and `publicRuntimeTree` (the selected PUBLIC docs
identity: equal to runtimeTree for release; derived from the separately
verified target release/tag/capsule at `targetVersion`/`originalGitSha` for
rollback, never from the workflow-run HEAD); immutable release/publication/
portal-prepublication/health receipts bind the PUBLIC tree while committed-head
drift stays bound to `runtimeTree`. Docker recovery is always rejected;
`released == "true"` is required only for release; rollback requires a
successful `workflow_dispatch` with the exact rollback dispatch mode/target.
After checkpoint retirement, 08 must run a fresh current-tree read-only drift
and derive scoped owners only from those verified findings before fixes/gates/
prerelease audit, then end at the owner release pause; old findings and retired
evidence are non-authorizing. Only a separate fresh replacement release-resume
may perform preparation/smoke. TASK-545 returns the sole closure identity.
The final owner release action is release-branch-only: the owner reviews,
commits and merges to the protected release branch and then WAITS for the
protected semantic-release workflow; semantic-release is the SOLE public
release authority and alone creates the generated version/lock/changelog
release commit, the plain SemVer tag and the GitHub release, and
TASK-548-05-L02's NORMAL RELEASE publication deploys Cloudflare only when
`released == "true"` (rollback never requires the semantic-release output).
The owner
never runs `git tag`/`gh release` and never guesses a version or tag; the fresh
release-resume trusts only verified semantic-release workflow outputs and the
generated release commit/tree.
`frozen` permits only canonical state `none`; bound stale temp/journal is cleaned
without date authority. Closure durably writes/fsyncs the no-replace changelog,
then CAS-temp/renames/fsyncs the index. Both frozen and recovery call TASK-545's
exact `writeOrResumeOrderedDurableChangelogFileThenIndexV1` owner export with
`ordered-durable-changelog-file-then-index@v1`; no TASK-548 alias is permitted.
Recovery accepts one strict regular
non-symlink TASK-548 1261 file with slug
`task-548-hybrid-visual-documentation` and zero (`file-only`) or one (`both`)
matching index row before allowlisting. Index-only/corrupt/multiple fails; UTC
rollover preserves the file's date.
07 consumes it without re-resolution and returns the final mechanical delta;
08 emits it exactly once, and neither persists the handoff.

## Acceptance Criteria

- Repeated compilation of identical strict source bytes produces one
  byte-identical validated bundle used by embedded Help, assistant ingest, and
  the public portal.
- TASK-548-06 legacy-to-native source edits preserve normalized semantics and
  stable IDs. Their changed source bytes intentionally produce a new,
  deterministic `sourceHash`; cross-representation whole-bundle byte equality
  is not required.
- Every active Guide document has stable identity, target, locale, version,
  route/capability metadata, deterministic headings, and valid links.
- Every active in-scope atomic control has one eligible localized documentation
  section, and every composed workflow has one eligible full-flow section plus
  an ordered non-empty list of those atomic-control IDs. Missing, orphaned,
  duplicate, cyclic, cross-locale, permission-ineligible, or
  publication-target-ineligible relations fail generated coverage.
- Every active Admin screen/capability is covered; visual flows have a reviewed
  screenshot wherever a visual materially improves understanding.
- A fresh/reindexed installation can answer deterministic Guide questions with
  source, internal Help link, relevant visual/example, contextual CMS link, and
  version-correct official portal link.
- Guide defaults to `basic` within 440 Unicode scalars/two sentences or three
  ordered steps and links to the complete internal
  section; an atomic question can expose its containing composed workflow and a
  workflow answer can expose its ordered atomic controls without duplicating
  prose.
- Guide retrieval uses the canonical locale, server-resolved product version,
  canonical admin route/surface and validated capability context
  deterministically before any optional provider work; browser context is
  advisory only and can never supply permissions, versions or capabilities.
- Scenario-step search terms return the correct authorized localized section
  from the compiler-derived `scenarioStepSearchText` projection, never from
  raw scenario DSL/fixture files; assistant-only documents never persist or
  return, because Guide eligibility is `assistant` AND `embedded-help`.
- Local Help works with the public docs origin blocked and with no provider
  configured.
- Guide and Agent histories/readiness/errors remain separate. Agent failure or
  disablement does not degrade Guide/Help.
- `/admin/help` uses canonical navigation/prefetch helpers, respects
  permission-aware contextual actions, and passes keyboard, focus,
  screen-reader, narrow/wide, light/dark, and reduced-motion checks.
- Public exact-version routes are immutable and deep-linkable; locale/version
  selection, search, canonical/hreflang, sitemap, and latest alias are correct.
- Capture fails on console/page errors, invisible effects, stale source hashes,
  unsafe fixtures, missing cleanup, changed images without review, or receipt
  mismatch.
- The six-file TASK-548-08 bootstrap passes only pre-commit write-set,
  forbidden-path, syntax, targeted-test, line-count, and diff-check gates before
  the owner commit; tracked membership, clean status/diffs, `git show` byte
  parity, exact commit scope, and clean-checkout/worktree tests pass afterward
  from a fresh committed-resume before any authoring audit; build mode has
  already terminated and committed-resume never rebuilds. Its strict bounded
  checkpoint validates canonical transport/hash, exact sorted records, one
  direct-parent owner commit and its exact six-path diff; malformed, duplicate,
  unknown, stale or integrity-mismatched input fails closed.
- Child-process crash tests kill every changelog journal/temp, fsync, rename and
  directory-fsync boundary; only none/file-only/both recover idempotently.
- TASK-548-08 dispatches the three deploy-gated phases (foundation → facade →
  consumer cutover) with strict owner actions and mutually exclusive resume
  modes: `task548-foundation-migration-resume` verifies the exact
  committed/deployed foundation bytes and the DB cutover state EXACTLY
  `shadow_parity_clean`, and `task548-consumer-cutover-resume` verifies the
  exact facade deployment, the rollout receipt for that build, consumers ready
  and the DB cutover state EXACTLY `v2_activated`; the 03-L03 facade dispatch
  is gated at EXACTLY `shadow_parity_clean`, never merely at/past
  `backfill_complete`, and no phase trusts prior-process memory.
- Semantic-release is the sole public release authority: the final owner
  action asks the owner to review, commit and merge to the protected release
  branch and wait; semantic-release alone creates the generated
  version/lock/changelog release commit, the plain SemVer tag and the GitHub
  release, and TASK-548-05-L02's NORMAL RELEASE publication deploys Cloudflare
  only when
  `released == "true"` (rollback requires only the exact normalized rollback
  mode plus a successful rollback job and never requires semantic-release
  output); the owner never runs `git tag`/`gh release`.
- No public API, runtime remote docs dependency, secret/PII leak, raw HTML sink,
  or second documentation source is introduced.
- All targeted and full gates pass, including strict security scanning and
  the tag-built seven-flow `task-548-portal` certification before publication,
  prerelease `task-548` fast feedback, and exactly eight ordered final real-flow
  scenarios through the shared registered `task-548` adapter.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted Vitest suites for Bun-free schemas/compiler/search/render/Admin UI
- targeted Bun suites for filesystem compilation, DB migration/ingest,
  assistant routes/runtime, release artifact integrity, and security boundaries
- route registration and centralized assistant error-map coverage for every
  changed response/route contract
- deterministic regeneration/diff, orphan/link/route/permission/asset/hash,
  safe-render, golden-query, portal build, SEO, accessibility, and bundle-budget
  gates
- `bun run test`
- `bun run precommit:check`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- task graph/H1/FileName/parent/status audits plus the canonical
  NUL-safe line-count gate over every added/modified production and test file
  in the leaf write set (identical contract in every TASK-548 task file; a
  file above 1,000 makes the gate fail with `exit 1`, including a non-newline
  final line):

  ```bash
  # Canonical NUL-safe line-count gate over the leaf write set (identical
  # contract in every TASK-548 task file; a file above 1,000 makes the gate fail
  # with exit 1, including a non-newline final line). The verified pre-family
  # baseline is the pinned commit 963733cae23456622bea1eef1b734723aaab2350;
  # commits/staging cannot narrow the measured scope.
  TASK_FAMILY_BASELINE_SHA="963733cae23456622bea1eef1b734723aaab2350"
  git cat-file -e "${TASK_FAMILY_BASELINE_SHA}^{commit}" || { echo "invalid/missing baseline commit ${TASK_FAMILY_BASELINE_SHA}" >&2; exit 1; }
  failed=0
  while IFS= read -r -d '' f; do
    lines=$(awk 'END { print NR }' "$f")
    if [ "$lines" -gt 1000 ]; then
      printf 'OVER-LIMIT %s %s\n' "$lines" "$f"
      failed=1
    fi
  done < <({ git diff --name-only -z --diff-filter=ACMRT "$TASK_FAMILY_BASELINE_SHA" -- core packages scripts tests _docs/_workflows; git ls-files --others --exclude-standard -z -- core packages scripts tests _docs/_workflows; } | grep -zE '\.(ts|tsx|mjs|cjs|js|jsx|mts|cts)$' | grep -zvE '\.generated\.(ts|tsx|js|jsx|cjs|mjs|mts|cts)$' | sort -zu)
  exit "$failed"
  ```

  every result at most 1,000 and intermediate commits never narrow the
  baseline (generated artifacts remain exempt per AGENTS.md)

  Line-count exemption for contract files: the 12 oversized TASK-548
  contract files listed below exceed 1,000 physical lines by
  cohesive-contract design and are formally outside the NUL-safe gate
  above, which covers production/test TS/JS files only (`core packages
  scripts tests _docs/_workflows`, extensions
  `ts|tsx|mjs|cjs|js|jsx|mts|cts`): TASK-548-01-L03, TASK-548-08,
  TASK-548-03-L03, TASK-548-07-L01, TASK-548-05-L02, TASK-548-07,
  TASK-548-02-L02, TASK-548-02-L03, TASK-548-01-L02, TASK-548-01-L01,
  TASK-548-03-L02, and TASK-548-04-L02. They are scheduled for a
  dedicated split task before implementation dispatch; this exemption
  does not weaken the gate above, which still fails with `exit 1` on
  every over-1,000-line production/test TS/JS file in the leaf write set.
- shared `bun scripts/runtime-smoke.ts run --suite task-548-portal` fast and
  certification profiles with seven portal flows, with release certification
  ordered before every publication mutation; shared
  `bun scripts/runtime-smoke.ts run --suite task-548` fast and certification
  profiles with exactly eight ordered final real flows,
  visible-effect assertions, zero console/page errors, unique screenshots,
  SHA-256 evidence, and complete cleanup; `playwright-cli` is used only by the
  shared browser transport, never by a task-local lifecycle

Before DB/settings tests: `set -a && source .env && set +a`. Verify
`DATABASE_URL` is reachable before full DB-backed lanes. Re-run any named
failure once in isolation before classifying it.

## Documentation Updates Required

- `README.md`, `docs/README.md`, and `docs/guide/README.md`;
  TASK-548-07-L01 is their sole closeout-documentation writer
- `docs/guide/_TEMPLATE.md` and `docs/guide/corpus.manifest.json`;
  TASK-548-01-L01 is their sole writer
- `docs/develop/assistant.md` plus authoring/capture/publication developer guides
- `docs/develop/runtime-smoke-cookbook.md` with the exact `task-548`
  and `task-548-portal` registrations, shared-wrapper/helper/worker composition,
  profiles, seven/eight IDs, prepublication/final evidence split, cleanup and
  commands; ownership is sole-writer serialized: TASK-548-02-L02 writes the
  five-flow `task-548` pilot subsection AND the fixed `task-548-portal`
  registration recipe, while TASK-548-04-L03/TASK-548-07-L01 contribute only
  their focused portal/final scenario modules and never edit the cookbook or
  any other shared runtime-smoke seam
- `_docs/ARCHITECTURE.md`, `_docs/DATA_MODEL.md`, `_docs/SECURITY_SPEC.md`
- `_docs/CMS_API.md` only where the existing assistant response contract changes
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if a cache is added or
  changed
- `_docs/TESTING_STRATEGY.md`, `_docs/CODERSO_RELEASE_GATES.md` and
  `_docs/RELEASE_PROCESS.md` where the new lanes/gates become release-owned
- `_docs/ASSISTANT_GUIDE.md` and `_docs/ASSISTANT_SITE_BUILDER.md`;
  TASK-548-07-L01 is their sole writer and both are mandatory closeout updates
- `_docs/_CHANGELOG/1261-<date>-task-548-hybrid-visual-documentation.md` and its
  index row at closure
- this task family and `_docs/_TASKS/README.md`
