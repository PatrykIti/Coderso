# TASK-547: Full-Site Example Package and Projekty Domów Installer
# FileName: TASK-547_Full_Site_Example_Package_And_Projekty_Domow_Installer.md

**Priority:** High
**Category:** Solution Kits / Site Builder / Reference Examples
**Estimated Effort:** Very Large
**Dependencies:** TASK-190, TASK-417, TASK-418, TASK-420, TASK-455, TASK-459, TASK-482, TASK-521–535
**Status:** ⏳ To Do
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
- **Reference source:** `_docs/projekty-domow-wow-site/`.
- **Current partial artifacts:** `scripts/demo-projekty-domow.tsx`,
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

## Scope

- Versioned full-site JSON package with stable logical resource keys.
- Strict typed references resolved to generated/current database IDs only during
  planning/apply; unresolved references never enter stored domain documents.
- Seven Pages: `/`, `/oferta`, `/projekty`, `/proces`, `/cennik`, `/o-nas`,
  `/kontakt`.
- Dynamic `/projekty/:slug` content route with six seeded project entries and a
  published detail page/template; Aurora proves the eighth public prototype route.
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

## Security Contract

- **Endpoint visibility:** no package endpoint in this family. Installation is
  service + trusted local CLI only; existing catalog Solution Kit endpoints stay
  unchanged and never accept raw package JSON.
- **Auth model:** trusted local operator for CLI with an explicit actor ID.
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
- References use a closed typed shape, never arbitrary string substitution.
- Validate the complete graph before the first domain write.
- Install in dependency order and rollback in exact reverse order.
- A repeated apply creates no duplicates and reports deterministic `noop` or
  intended `update`.
- Never delete or overwrite unmanaged/pre-existing resources during rollback.
- Shell/settings are wired last and their prior values are restored on rollback.

## Sub-Tasks And Land Order

**Orchestration sidecar:** TASK-547-07 runs throughout the family and is not an
implementation land step.

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
Implementation is strictly sequential: `01 → 02 → 03 → 04 → 05 → 06`. TASK-547-07
owns the workflow script and runs throughout the family without taking source
ownership from those children.

## Acceptance Criteria

- One canonical JSON package contains the complete logical site graph and passes
  strict normalization with byte-stable regeneration.
- Dry-run detects duplicate keys, missing/ambiguous refs, cycles, invalid embedded
  documents, unsupported settings, and conflicts before domain writes.
- First apply creates/wires the complete site; second apply creates zero duplicates.
- Rollback restores prior shell/settings and restores/deletes only resources
  evidenced by the source run.
- Every prototype route responds and navigation/footer links are valid.
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
- Playwright CLI task-scoped smoke with exactly eight stable real-flow identities
- baseline-to-final line counts for every touched production/test module

Before DB-backed tests: `set -a && source .env && set +a`, and verify
`DATABASE_URL` is reachable.

## Documentation Updates Required

- `_docs/SOLUTION_KITS.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/PAGE_MODEL.md`, `_docs/CONTENT_TYPES_SPEC.md`, `_docs/CMS_API.md`,
  `_docs/ARCHITECTURE.md`, and `_docs/SECURITY_SPEC.md` where contracts change
- a user/developer guide for generating, validating, installing and rolling back
  the example package
- `_docs/_CHANGELOG/1260_TASK-547.md` and changelog index at closure
- this task family and `_docs/_TASKS/README.md`
