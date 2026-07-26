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
TASK-547-07's canonical ownership map is the sole source of truth for the
current family-wide path count, and workflow checks must derive that count from
the map instead of hardcoding a stale total. Workflow entrypoints/private
libraries are process ownership under TASK-547-07 and do not transfer any
source path or symbol between leaves.

## Acceptance Criteria

- One canonical JSON package contains the complete logical site graph and passes
  strict normalization with byte-stable regeneration.
- Dry-run detects duplicate keys, missing/ambiguous refs, cycles, invalid embedded
  documents, unsupported settings, and conflicts before domain writes.
- First apply creates/wires the complete site; second apply creates zero duplicates.
- Rollback restores prior shell/settings and restores/deletes only resources
  evidenced by the source run.
- Every prototype route responds and navigation/footer links are valid.
- Public copy, facts, prices, contact data, project taxonomy/order, form strings,
  SEO titles/descriptions and design settings match the pinned reference unless
  covered by one of the exact residual IDs above.
- Portfolio filters visibly change results; Aurora resolves through project entry
  data and the detail document.
- Contact uses the real Forms nonce/rate-limit/validation/submission pipeline.
- Desktop/tablet/mobile, reduced-motion and publish-to-front parity are proven.
- Residual visual differences are evidence-backed and do not conceal a functional,
  accessibility, data, security, or test-integrity gap.
- Every touched human-authored production/test file is at most 1,000 physical lines.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted Vitest suites for pure package/schema/reference/generator logic
- targeted Bun DB/runtime suites for installer/apply/rollback/routes/forms/content
- `bun run test`
- `bun run precommit:check`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- Playwright CLI smoke with exact session `wf547smoke` and exactly eight ordered
  scenario objects; only after free-port checks and a fresh server restart. Each
  scenario records URL, viewport, zero console errors, material visible-effect
  assertions and one distinct PNG metadata/hash record.
- cleanup deletes only the scoped form submission, rolls back the exact source
  run and proves exact equality with captured prior shell/settings values
- baseline-to-final line counts for every touched production/test module

Before every DB-backed test or dev command, execute exactly
`set -a && source /home/coder/project/Coderso/.env && set +a`, without printing,
copying, hashing or persisting the file or its values, then verify
`DATABASE_URL` is reachable. This source-only operational exception does not make
the main repository an implementation or audit input.

## Documentation Updates Required

- `_docs/SOLUTION_KITS.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/PAGE_MODEL.md`, `_docs/CONTENT_TYPES_SPEC.md`, `_docs/CMS_API.md`,
  `_docs/ARCHITECTURE.md`, and `_docs/SECURITY_SPEC.md` where contracts change
- `docs/develop/full-site-packages.md` for generating, validating, installing and
  rolling back the example package
- `_docs/_CHANGELOG/1260-YYYY-MM-DD-<slug>.md` and changelog index at closure
- this task family and `_docs/_TASKS/README.md`
