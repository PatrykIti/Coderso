# TASK-548: Hybrid Visual Documentation Platform
# FileName: TASK-548_Hybrid_Visual_Documentation_Platform.md

**Priority:** High
**Category:** Documentation / Assistant / Admin UI / Release
**Estimated Effort:** Very Large
**Dependencies:** TASK-109, TASK-182, TASK-403; TASK-545 must be `✅ Done` and
TASK-547 must be terminal, then this parent amended from TASK-547's final
literal paths and a fresh canonical pre-implementation authoring audit PASS,
before any dispatch
**Related Tasks:** TASK-240, TASK-414, TASK-547
**Status:** ⏳ To Do
**Changelog:** 1261 pinned

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

## Verified Baseline

- `docs/guide/` is already the end-user corpus ingested by
  `core/services/assistant/docsIngestService.ts`.
- The current corpus has no canonical visual assets and its template has no
  stable document/section/visual identity or version contract.
- `assistant_docs` and `assistant_doc_chunks` persist searchable prose but not
  stable section, visual, example, locale, version, route, or permission
  references.
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
  assistant ingest/retrieval accepts only documents containing `assistant`,
  embedded Help accepts only documents containing `embedded-help`, and the
  portal accepts only documents containing `public-docs`. A document may target
  more than one surface, but absence of a target always excludes it from that
  surface.
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
- Assistant retrieval remains DB-backed. Reindex compiles and persists the same
  normalized contract; there is no runtime filesystem retrieval fallback.
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
- Deterministic safe Markdown-to-AST compilation with no raw HTML or dangerous
  URL schemes.
- Deterministic search artifacts and byte-stable bundle generation.
- Backward-compatible DB ingest/index evolution with complete migration
  artifacts and atomic reindex.
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
- Dependency-shaped automated tests, at least seven real browser flows,
  security scans, documentation, changelog, and task closure.

## Out of Scope

- The full-screen AI site Designer, unconstrained HTML generation, design
  revisions/canvas, or applying a generated site to CMS data. That requires a
  separately researched and decomposed task family; no follow-on ID is
  allocated by this task.
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
  existing version.

## Architecture Invariants

1. One authored fact has one owner; Help, Guide, and portal do not fork prose.
2. Binary images remain packaged assets; DB rows store only normalized stable
   references and searchable captions/alt text.
3. Images complement prose. Search indexes captions, alt text, scenario steps,
   and examples; it never depends on OCR of a screenshot.
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

Executable implementation order is exactly:
`01 (including initial 01-L02 bundle/report) → 02-L01 → 02-L02
→ one same-owner 01-L02 post-pilot refresh/gate → 02-L03 → 03 → 04 → 05
→ 06-L01 → one final same-owner 01-L02 handback/gate → 06-L02 → 07`.

TASK-548-01-L02 is the exclusive writer of
the durable tracked `core/generated/docs/coderso-docs-v2.json` for the whole
family. TASK-548-06-L01 may edit native Guide sources and production visual
triples but may not write that generated final. After those edits, orchestration
pauses TASK-548-06 and re-dispatches the same TASK-548-01-L02 owner to regenerate
and verify the bundle plus the workspace-only ignored
`.tmp/docs-corpus/migration-report-v1.json` from the final native source set.
This handback occurs exactly once after all TASK-548-06-L01 source/visual edits,
never per wave or per promotion. Only after it passes may TASK-548-06 resume
read-only `docs:check` and TASK-548-06-L02 coverage reconciliation. It is a
same-owner operational checkpoint, not a second writer. TASK-548-07 remains the
only status writer, so the handback neither reopens a terminal 01-L02 leaf nor
changes parent/child status during implementation.

The linked bundle/report transaction exists only for explicit TASK-548-01-L02
authoring/migration `--write` runs and the two named handbacks. Its stable
prestates are exactly `bootstrap-none`, clean-checkout
`packaged-bundle-only`, and `linked-pair`; report-only and recovery hazards fail
closed. A clean clone/tag, production runtime, portal, Docker image, release,
`docs:check`, and coverage check require only the tracked bundle. They run the
read-only workspace hazard inspector and strict packaged-bundle validation with
recomputed canonical byte/`sourceHash` equality where source is available; none
recovers, writes, or requires the ignored report.

The same status rule applies to the post-pilot checkpoint: after
TASK-548-02-L02 writes exactly five pilot scenario/image/receipt triples,
TASK-548-01-L02 regenerates the exclusive bundle/report from those bytes and
passes its targeted gate before TASK-548-02-L03 or TASK-548-03 may start. This
is one owner refresh, not another writer or a status transition.

TASK-545 and TASK-547 are separate hard dispatch blockers, not advisory
dependencies. TASK-545 must be exactly `✅ Done`, because TASK-548 imports its
tracked shared workflow drivers; `⏭️ Superseded` or `❌ Cancelled` cannot
authorize a substitute. TASK-547 must reach a terminal status. TASK-548 must
not edit either family to manufacture those states.

After TASK-545 is Done and TASK-547 is terminal, read TASK-547's final bytes and
amend this parent with every literal user/developer guide path it owns, the
serialized cross-family land order, and each TASK-548 leaf's matching
forbidden-path guard. Only after that amendment, rerun the canonical read-only
pre-implementation authoring audit against the then-current HEAD plus complete
dirty-worktree context and require a PASS with zero unresolved HIGH/MEDIUM
findings. Any audit run before both dependency gates or before the literal-path
amendment is stale and does not qualify. No TASK-548 implementation leaf may
dispatch until this exact sequence passes.

Only TASK-548-07 may edit TASK-548 statuses, the board, changelog 1261, or the
changelog index during implementation.

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
- Every active Admin screen/capability is covered; visual flows have a reviewed
  screenshot wherever a visual materially improves understanding.
- A fresh/reindexed installation can answer deterministic Guide questions with
  source, internal Help link, relevant visual/example, contextual CMS link, and
  version-correct official portal link.
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
- No public API, runtime remote docs dependency, secret/PII leak, raw HTML sink,
  or second documentation source is introduced.
- All targeted and full gates pass, including strict security scanning and at
  least seven distinct real-flow Playwright CLI scenarios.

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
- task graph/H1/FileName/parent/status and touched-file line-count audits
- task-scoped `playwright-cli -s=wf548smoke` smoke with at least seven distinct
  real flows, visible-effect assertions, zero console/page errors, unique
  screenshots, SHA-256 evidence, and complete cleanup

Before DB/settings tests: `set -a && source .env && set +a`. Verify
`DATABASE_URL` is reachable before full DB-backed lanes. Re-run any named
failure once in isolation before classifying it.

## Documentation Updates Required

- `README.md`, `docs/README.md`, and `docs/guide/README.md`;
  TASK-548-07-L01 is their sole closeout-documentation writer
- `docs/guide/_TEMPLATE.md` and `docs/guide/corpus.manifest.json`;
  TASK-548-01-L01 is their sole writer
- `docs/develop/assistant.md` plus authoring/capture/publication developer guides
- `_docs/ARCHITECTURE.md`, `_docs/DATA_MODEL.md`, `_docs/SECURITY_SPEC.md`
- `_docs/CMS_API.md` only where the existing assistant response contract changes
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if a cache is added or
  changed
- `_docs/TESTING_STRATEGY.md` and `_docs/CODERSO_RELEASE_GATES.md` where the new
  lanes/gates become release-owned
- `_docs/ASSISTANT_GUIDE.md` and `_docs/ASSISTANT_SITE_BUILDER.md`;
  TASK-548-07-L01 is their sole writer and both are mandatory closeout updates
- `_docs/_CHANGELOG/1261-<date>-task-548-hybrid-visual-documentation.md` and its
  index row at closure
- this task family and `_docs/_TASKS/README.md`
