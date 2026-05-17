# TASK-280: Product Gallery Widget Playwright Product Followups

# FileName: TASK-280_Product_Gallery_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Commerce + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252-07-04, TASK-256, TASK-256-01, TASK-256-02, TASK-256-04, TASK-256-07, TASK-256-08
**Status:** To Do

---

## Overview

Create the widget-specific Product Gallery follow-up family for
`_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md`.

This family owns only Product Gallery product, UX, and commerce-gallery fixes.
TASK-256 owns shared widget-contract drift. TASK-280 must not duplicate generic
repairs for editor-mode atomic updates, clear/none semantics, shared accessible
runtime binding, or cross-report classification.

## Source Report Boundary

Source report:

- `_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md`

Live owners inspected while drafting:

- `core/widgets/core/productGallery.tsx`
- `core/widgets/core/commerceWidgetShared.ts`
- `core/services/commerce/commerceWidgetRuntime.ts`
- `core/services/commerce/commerceRuntimeResolver.ts`
- `core/server/publicSite.tsx`
- `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx`
- `core/admin/ui/widgets/editors/CommerceWidgetEditorShared.tsx`
- `tests/vitest/widgets/productGallery.test.tsx`
- `tests/vitest/ui/product-gallery-editor-wave.test.tsx`
- `tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `_docs/_WIDGETS/PRODUCT_GALLERY.md`
- `_docs/_WIDGETS/tmp/product-gallery/MATRIX.md`
- `_docs/_WIDGETS/tmp/product-gallery/README.md`
- `_docs/WIDGETS.md`
- `_docs/WIDGET_PACK_MATRIX.md`

## TASK-256 Exclusion Matrix

The following report findings are intentionally excluded from TASK-280 because
TASK-256 owns them as shared widget-contract work.

| Report finding | Evidence | Owner task | Reason |
|---|---|---|---|
| Shared editor mode switching and atomic data preservation | Report mode observations, especially Visual variant selection | TASK-256-01 | Generic editor update contract across widgets. TASK-280 may move Product Gallery fields between modes, but not reimplement the shared switch/update helper. |
| Clear button and design-token semantics for clearable color fields | CODE-02/CODE-03 adjacency, Wizard/Visual SurfaceFields, report clear observations | TASK-256-02 | Shared clear/none behavior belongs to the common control contract. TASK-280 only owns Product Gallery-local dead fallback/style consequences. |
| Generic interactive instance IDs and baseline ARIA repairs | Product card link/label/accessibility findings that rely on safe interactive primitives | TASK-256-04 | Shared runtime accessibility helpers stay generic; TASK-280 owns Product Gallery card semantics using those helpers. |
| Cross-report commerce/widget classification | TASK-256 report coverage lists `REPORT_PRODUCT_GALLERY_WIDGET.md` | TASK-256-07, TASK-256-08 | TASK-256 decides fixed/deferred status for shared-contract rows. TASK-280 implements only the Product Gallery follow-up rows below. |

If a TASK-280 implementation leaf discovers that the needed change affects
Product Compare, Product Table, or generic commerce/widget helpers, split the
shared piece into the appropriate shared task before landing the Product
Gallery-specific leaf.

## TASK-280 Scope Matrix

| Report finding | TASK-280 owner | Notes |
|---|---|---|
| CODE-06, BF-01, BF-13, A5 | TASK-280-01 | Render backend-resolved product media with safe alt behavior. |
| CODE-08, BF-02, BF-03, BF-12, A1 | TASK-280-01 | Add safe product links and bounded card CTA behavior. Cart behavior remains commerce-owned unless an existing checkout route is explicitly wired. |
| CODE-01, BF-04 | TASK-280-02 | Make `compact` a truthful Product Gallery variant. |
| CODE-02, CODE-03 | TASK-280-02 | Remove Product Gallery-local dead fallback classes and trailing class artifacts without restaging the shared clear contract. |
| CODE-04 | TASK-280-02 | Make minimal-card border color behavior truthful in render and editor copy. |
| CODE-07 | TASK-280-02 | Render compare-at price only when it is higher than current price. |
| NEW-02 potential cents formatting mismatch | TASK-280-02 | Verify Product Gallery symptoms. If the fix touches `formatCommerceMoney` for Product Compare/Table too, split the shared formatter repair out of TASK-280 before implementation. |
| NEW-01, UX-06, BF-09 | TASK-280-03 | Hydrate admin preview/runtime status and add loading/error/refresh affordances for Product Gallery. |
| UX-01, UX-02, UX-03, UX-04, BF-14, A2, A6 | TASK-280-04 | Rebalance Product Gallery editor modes, empty-state copy, technical media hint, layout preview, and empty-state accessibility. |
| CODE-05, UX-05, BF-08, BF-11 | TASK-280-05 | Product Gallery source/filter controls, query input cleanup, collection guidance, and bounded price filters. |
| BF-05, BF-07, A3, A4 | TASK-280-06 | Add section header, status badge, stock non-color indicator, and card accessible naming. |
| BF-06, BF-10 | TASK-280-07 | Add bounded pagination/load-more and manual curated ordering after the base source/runtime contracts are stable. |
| Report fixed/deferred notes, widget docs, changelog, board closure | TASK-280-08 | Final Product Gallery documentation and validation pass. |

## No-Action Or Out-of-Family Findings

| Finding | Decision | Reason |
|---|---|---|
| Screenshot PNG labels | No task | Report already states PNG files are local Playwright labels and not repo evidence. |
| Commerce money formatter shared implementation | Out of TASK-280 until proven Product Gallery-only | `formatCommerceMoney` is used by Product Gallery, Product Table, and Product Compare. TASK-280-02 can verify the Product Gallery regression, but a cross-commerce formatter fix must not be hidden in this Product Gallery-only family. |
| Generic collection picker behavior in `CommerceSourceFields` | Conditional | Product Gallery UX can improve copy and selected-state affordances. If the fix changes all commerce widgets, split or explicitly test Product Compare/Table impact. |

## Current Owner and Test Matrix

| Area | Current owners | Current tests | New or changed tests |
|---|---|---|---|
| Product Gallery schema/defaults/normalizer/runtime render | `core/widgets/core/productGallery.tsx` | `tests/vitest/widgets/productGallery.test.tsx` | Add SSR assertions for media, links, compact variant, surfaces, compare-at guard, empty-state semantics, header/status metadata, pagination markers, and accessible card names. |
| Product Gallery editor modes | `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx` | `tests/vitest/ui/product-gallery-editor-wave.test.tsx` | Add editor coverage for CTA/link/media controls, preview status, mode ownership, blank empty description, source filters, header metadata, and pagination/curation controls. |
| Shared commerce source/editor helpers | `core/widgets/core/commerceWidgetShared.ts`, `core/admin/ui/widgets/editors/CommerceWidgetEditorShared.tsx` | Product Gallery editor tests plus commerce widget tests | Touch only when needed; if behavior affects Product Compare/Table, add explicit cross-widget coverage or split the shared work out of TASK-280. |
| Commerce runtime hydration and resolver | `core/services/commerce/commerceWidgetRuntime.ts`, `core/services/commerce/commerceRuntimeResolver.ts`, `core/services/commerce/commerceQueryService.ts` | `tests/unit/commerce/commerceWidgetRuntime.test.ts`, `tests/unit/commerce/commerceRuntimeResolver.test.ts`, `tests/unit/commerce/commerceQueryService.test.ts` | Add Product Gallery preview hydration, media/link mapping, query/filter, and manual ordering coverage when those seams change. |
| Public runtime hydration | `core/server/publicSite.tsx` | Runtime integration tests around public page hydration | Run/update only if Product Gallery public hydration behavior or preview mode plumbing changes. |
| Widget docs and report evidence | `_docs/_WIDGETS/PRODUCT_GALLERY.md`, `_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md` | docs diff checks | Refresh fixed/deferred evidence and final Product Gallery contract during TASK-280-08. |

## Sub-Tasks

- [ ] TASK-280-01: Product Gallery Media Link and CTA Cards
- [ ] TASK-280-02: Product Gallery Compact Variant Surface and Price Display
- [ ] TASK-280-03: Product Gallery Admin Preview Runtime Status and Loading
- [ ] TASK-280-04: Product Gallery Editor Mode Empty State and Technical Hints
- [ ] TASK-280-05: Product Gallery Source Collections and Filter Controls
- [ ] TASK-280-06: Product Gallery Section Header Metadata and Accessibility
- [ ] TASK-280-07: Product Gallery Pagination Manual Curation and Query Extensions
- [ ] TASK-280-08: Product Gallery Report Docs Changelog and Closure

## Implementation Order

1. Rebase over required TASK-256 shared fixes first. TASK-280 leaves must build
   on shared editor, clear, and accessibility contracts instead of duplicating
   them.
2. Complete TASK-280-02 before visual-card expansion so compact/minimal/surface
   behavior is truthful.
3. Complete TASK-280-01 after media/link ownership is confirmed against
   `TASK-252-07-04` and the backend-resolved media payload contract.
4. Complete TASK-280-03 after base card rendering is stable so admin preview can
   prove the final cards instead of the current empty state.
5. Complete TASK-280-04 before adding more editor fields so mode ownership,
   empty-state handling, and technical helper behavior are clear.
6. Complete TASK-280-05 after editor mode cleanup and before pagination or
   manual curation expands the source contract.
7. Complete TASK-280-06 after card media/link/style work lands.
8. Complete TASK-280-07 after runtime query and admin preview contracts are
   stable.
9. Complete TASK-280-08 last after code, tests, report evidence, widget docs,
   changelog, and board state are synchronized.

## Git Scope Safeguards

- Work in a dedicated branch/worktree for implementation.
- Run `git status --short --branch` before implementation, staging, commit, and
  merge-back.
- Stage only `TASK-280*` files, Product Gallery owners, focused Product Gallery
  tests, Product Gallery docs/report files, and required changelog/board files.
- Because `_docs/_TASKS/README.md` is a shared board touched by parallel agents,
  re-read it immediately before staging and verify the cached diff contains only
  the TASK-280 rows/counts owned by the current commit.
- Use `git diff --cached --name-only` and `git diff --cached --check` before
  every commit.

## Security Contract

This planning family does not add public write behavior.

- Endpoint visibility: none by default. If TASK-280-03 adds an admin preview
  read route, it must be internal under `/admin/api/*`.
- Auth model: unchanged authenticated admin page/template editing and public
  runtime rendering. Any admin preview route must require the existing admin
  session.
- RBAC: unchanged page/template/widget write permissions. Preview reads must
  require the same authenticated admin capability used by the page builder.
- CSRF: unchanged for existing admin writes. New GET-only preview routes do not
  mutate state; any write route is out of scope for TASK-280.
- Rate-limit bucket: unchanged by default. A new preview route must use the
  existing admin read/preview bucket.
- Reject-unknown validation: any new Product Gallery fields must keep
  `additionalProperties: false`, normalize legacy payloads, and add validator
  tests when schema/defaults change.
- Anti-abuse: public runtime output must keep safe href/media handling, no raw
  HTML, no user-authored scripts, no arbitrary class names, no provider keys,
  and no privileged commerce settings in widget JSON or browser cache.
- Secrets: no secrets, private provider URLs, API keys, or privileged commerce
  settings in Product Gallery data, diagnostics, Playwright evidence, or
  changelog notes.

## Testing Requirements

Docs-only task creation:

- `git diff --check`
- `bun run precommit` before the manual commit, unless the configured hook runs
  it automatically and the committer records that proof.

Implementation leaves:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productGallery.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-gallery-editor-wave.test.tsx`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `bun test tests/unit/commerce/commerceRuntimeResolver.test.ts` when media,
  link, price, status, or query payload mapping changes.
- `bun test tests/unit/commerce/commerceQueryService.test.ts` when source
  filters, pagination, or sort/query semantics change.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults/normalizer
  fields change.
- `bun test tests/unit/widgets/registry.test.ts` if variant registration or
  widget definition metadata changes.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md` with textual
  fixed/deferred evidence for each implemented leaf. Do not commit PNG files.
- Update `_docs/_WIDGETS/PRODUCT_GALLERY.md` when schema, editor modes, runtime
  variants, media/link behavior, preview behavior, or source controls change.
- Update `_docs/WIDGETS.md` only if a global widget contract changes. Prefer
  TASK-256 for shared contract text.
- Update `_docs/WIDGET_PACK_MATRIX.md` if Product Gallery pack readiness or
  completeness changes.
- Add a changelog entry under `_docs/_CHANGELOG/` and update
  `_docs/_CHANGELOG/README.md` when the family is completed.
- Keep `_docs/_TASKS/README.md` in sync on every status transition.

## Acceptance Criteria

- Every finding in `_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md` is either
  owned by TASK-256, covered by a TASK-280 physical leaf, explicitly
  out-of-family because it is commerce-shared, or deferred by TASK-280-08 with a
  reason.
- TASK-280 task docs do not duplicate TASK-256 shared-contract implementation
  scope.
- Each implementation leaf names concrete files, data flow, error handling,
  regression tests, documentation updates, and validation commands.
- Runtime changes preserve backward compatibility for existing
  `product-gallery` payloads unless the leaf documents and tests a migration or
  normalizer path.
- Final closure records report evidence, task status updates, changelog, and
  the exact validation output.
