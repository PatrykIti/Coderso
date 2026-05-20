# TASK-279: Product Compare Widget Playwright Product Followups

# FileName: TASK-279_Product_Compare_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Commerce + Admin UI + Runtime Render + Accessibility + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252-07-05, TASK-256, TASK-256-01, TASK-256-02, TASK-256-04, TASK-256-07, TASK-256-08, TASK-324
**Status:** Done (2026-05-20)

---

## Overview

Create the Product Compare-only follow-up family for
`_docs/PLAYWRIGHT/REPORT_PRODUCT_COMPARE_WIDGET.md`.

This family owns product, editor, commerce-runtime, and renderer work that is
specific to `product-compare`. TASK-256 owns shared widget-contract repairs from
the same Playwright wave. TASK-279 must not duplicate shared fixes for generic
atomic editor updates, shared clear/none token semantics, broad editor-mode
policy, or generic runtime accessibility helpers.

The current live widget is still a minimal comparison matrix:

- `core/widgets/core/productCompare.tsx` owns schema, defaults, normalizer,
  query input, matrix renderer, and current attribute row model.
- `core/admin/ui/widgets/editors/ProductCompareEditors.tsx` owns Wizard,
  Visual, and Advanced controls.
- `core/widgets/core/commerceWidgetShared.ts` owns the shared commerce source,
  resolved row types, money formatting, and stock labels.
- `core/services/commerce/commerceWidgetRuntime.ts` and
  `core/services/commerce/commerceRuntimeResolver.ts` hydrate compare rows
  during public runtime rendering.
- `tests/vitest/widgets/productCompare.test.tsx`,
  `tests/vitest/ui/product-compare-editor-wave.test.tsx`, and
  `tests/unit/commerce/commerceWidgetRuntime.test.ts` are the nearest current
  validation lanes.

TASK-252-07-05 remains useful research evidence for selected products,
attribute rows, and highlighted products, but it is not proof that those fields
exist in current code. TASK-279 must verify the live owners before claiming any
Product Compare behavior as already implemented.

Current worktree state is no longer a clean pre-implementation baseline:

- shared `CommerceSourceFields` limit/copy prerequisites were split into
  `TASK-324` and partially landed in the shared owner;
- `TASK-279-01` already started the widget-local `productIds`/limit path across
  Product Compare, admin client/schema, and commerce query execution;
- `TASK-279-07` already started consuming the shared source-field options for
  Product Compare-specific guidance.

Remaining family work must start from the still-open gaps in that partially
landed state: exact selected-set semantics and stability, preview parity,
attribute/header/media/layout/accessibility implementation, and final docs
closure. Do not re-plan the already-landed shared-source scaffolding as if it
were untouched.

## TASK-256 Exclusion Matrix

The following report findings are intentionally excluded from TASK-279 when
they are generic shared-contract work rather than Product Compare-only behavior.

| Report finding | Owner task | Reason |
|---|---|---|
| Shared editor atomic update policy for mode and variant/data changes | TASK-256-01 | Product Compare leaves may depend on the shared helper but must not redefine it. |
| Generic `Clear`, `none`, token-picker, CSS-variable preservation, and shared color-field semantics | TASK-256-02 | Product Compare style fields can adopt the shared helper after it lands, but TASK-279 must not create a one-off replacement. |
| Broad editor-mode ownership guidance when the same Wizard/Visual/Advanced policy applies across widgets | TASK-256-01, TASK-256-07 | TASK-279 may relocate Product Compare controls only as a widget-local application of the settled shared policy. |
| Shared runtime instance/accessibility helpers that become global widget primitives | TASK-256-04 | TASK-279 owns Product Compare table markup, caption, scroll focus, error alert, and section labelling because those are local renderer changes unless TASK-256 creates a reusable helper first. |
| Final fixed/deferred classification for the shared report wave | TASK-256-08 | TASK-279-08 records Product Compare-specific fixed/deferred evidence after this family lands. |

If a TASK-279 leaf discovers that the smallest correct fix is a cross-widget
helper, stop and route that helper through TASK-256 before continuing the
Product Compare-only implementation.

## TASK-279 Scope Matrix

| Report finding | TASK-279 owner | Notes |
|---|---|---|
| BF-04 selected products by ID | TASK-279-01 | Current worktree already adds `source.productIds`; remaining leaf scope is exact selected-set semantics, stability across later source edits, and admin-route proof. |
| BF-15 schema/UI/normalizer limit mismatch | TASK-279-01 | Shared limit/copy scaffolding now rides `TASK-324`; remaining TASK-279 work is proving Product Compare exact-set behavior without reintroducing local source-field forks. |
| BF-01 price and stock visibility | TASK-279-02 | Attribute-row model starts from the current local `metrics` array. |
| BF-05 product excerpt/description row | TASK-279-02 | Requires runtime row payload extension and safe text rendering. |
| BF-09 custom Attribute header | TASK-279-02 | Add schema/default/label/editor coverage. |
| BF-11 money locale formatting | TASK-279-02 | Add bounded locale policy with legacy-compatible defaults. |
| BF-13 backorder label customization | TASK-279-02 | Keep stock state keys bounded. |
| BF-14 quantity display formatting | TASK-279-02 | Avoid arbitrary formatting callbacks or raw strings. |
| UX-01 missing Quantity and Slug label controls | TASK-279-02 | Visual editor must expose all visible row labels. |
| BF-02 product image in column header | TASK-279-03 | Extend runtime compare row payload and renderer/editor tests. |
| BF-07 product title link | TASK-279-03 | Use safe product URL derivation; do not invent arbitrary external links. |
| BF-10 product CTA | TASK-279-03 | CTA is display/navigation only unless an existing commerce checkout/cart flow is wired and tested. |
| A6 image alt/semantics for product media | TASK-279-03 | Product Compare-owned media output accessibility. |
| BF-06 featured product column | TASK-279-04 | Use bounded highlight id/index and backward-compatible fallback. |
| BF-08 layout variants | TASK-279-04 | Add only variants with schema/default/render/editor/test coverage. |
| BF-12 sticky header | TASK-279-04 | Implement with responsive and keyboard-scroll safety. |
| BF-03 section title/description | TASK-279-05 | Product Compare-owned section copy and `aria-labelledby`. |
| A1, A2, A3, A4, A7, A8, A9 table and section semantics | TASK-279-05 | Local renderer markup, alert, caption, scopes, and scroll focus. |
| UX-03 editable runtime error flag | TASK-279-06 | Advanced diagnostics must be read-only. |
| UX-04 raw query preview readability | TASK-279-06 | Keep JSON available only with useful labels or disclosure. |
| UX-05 resolved product count outside Advanced | TASK-279-06 | Wizard/Visual status must not leak secrets or stale raw payloads. |
| UX-08 admin refresh/re-resolve | TASK-279-06 | Use backend-owned commerce resolver, and cover the full admin preview bridge from builder preview state to renderer parity; no client provider fetches. |
| UX-02 Wizard surfaces are too advanced | TASK-279-07 | Product Compare-local IA after re-checking the current shared mode policy and landed helpers. |
| UX-06 limit warning for dense compare tables | TASK-279-07 | Add dynamic warning when limit exceeds readable compare range. |
| UX-07 source filter placeholder/help copy | TASK-279-07 | Shared source-field copy/bounds support now lives in `TASK-324`; remaining leaf scope is Product Compare IA and dense-guidance cleanup after consuming that shared contract correctly. |
| Report fixed/deferred notes, widget docs, changelog, board closure | TASK-279-08 | Final evidence pass. |

## No-Action Report Findings

| Report finding | Decision | Reason |
|---|---|---|
| A5 `data-widget="product-compare"` | No TASK-279 task | The report marks the current data attribute as OK. Preserve the marker unless renderer tests intentionally update it. |
| Current empty state basic rendering | No standalone task | Empty-state copy already renders; TASK-279-05/06 only adjusts semantics and admin preview truthfulness around it. |
| Runtime inventory notes for missing `status` and `sku` fields | No TASK-279 task | Report section 2.3 records them as raw inventory observations, but this wave did not promote status/SKU to user-facing Product Compare findings. Keep the compare surface bounded to the rows routed above unless a future report creates a dedicated task. |

## Sub-Tasks

- [x] TASK-279-01: Product Compare Source Selection and Limit Contract
- [x] TASK-279-02: Product Compare Attribute Rows Labels and Formatting
- [x] TASK-279-03: Product Compare Column Media Links and CTAs
- [x] TASK-279-04: Product Compare Featured Column and Responsive Layouts
- [x] TASK-279-05: Product Compare Section Header and Table Accessibility
- [x] TASK-279-06: Product Compare Admin Preview Resolve and Diagnostics
- [x] TASK-279-07: Product Compare Editor IA and Source Guidance
- [x] TASK-279-08: Product Compare Report Docs Changelog and Closure

## Implementation Order

1. Re-check the current TASK-256 classification and already-landed shared
   helpers before implementation leaves touch editor mode policy, clear
   controls, shared source fields, or shared runtime accessibility. The shared
   `CommerceSourceFields` prerequisite discovered during this family now lives
   in `TASK-324`; consume that owner contract instead of re-forking the shared
   controls locally.
2. Finish the remaining TASK-279-01 work first so selected product ordering,
   conflicting-filter behavior, and compare limits are stable before renderer
   and preview leaves depend on resolved rows.
3. Complete TASK-279-02 after source selection because attribute rows and
   labels may use selected-product runtime payload extensions.
4. Complete TASK-279-03 after row payload decisions settle so media, product
   links, and CTAs use the final compare row shape.
5. Complete TASK-279-04 after basic table rows, media, and links are stable.
6. Complete TASK-279-05 before final visual review so table semantics and
   section copy are part of every rendered variant.
7. Complete TASK-279-06 after runtime query shape is stable so admin refresh and
   diagnostics call the same bounded resolver path.
8. Complete TASK-279-07 after confirming the current shared editor-mode policy
   and whether any shared source-field seam still requires separate ownership.
9. Complete TASK-279-08 last after report evidence, docs, changelog, board, and
   validation output are synchronized.

## Git Scope Safeguards

- Work in a dedicated branch/worktree for implementation and final closure.
- Run `git status --short --branch` before implementation, staging, commit, and
  merge-back.
- Stage only `TASK-279*` files, Product Compare owner files, Product Compare
  tests, Product Compare docs/report files, and required changelog/board files.
- `_docs/_TASKS/README.md` is shared by many active agents. Re-read it
  immediately before staging and verify the diff contains only TASK-279
  rows/statistics owned by the current commit.
- Use `git diff --cached --name-only` and `git diff --cached --check` before
  every commit.

## Security Contract

This planning family does not add API routes by itself. Implementation leaves
must preserve these boundaries:

- Endpoint visibility: authenticated admin editing and public read-only runtime
  rendering remain the default. Any new admin preview resolve endpoint must be
  internal admin-only.
- Auth/RBAC/CSRF: unchanged page/template/widget write permissions and CSRF
  protection for admin writes; preview resolve must require an authenticated
  admin session and the same page/template preview access model.
- Rate-limit bucket: if admin preview refresh adds a route, use an internal
  admin read/preview bucket and keep limits bounded by source limit/productIds.
- Reject-unknown validation: every new Product Compare field must be declared
  in `productCompareSchema`, normalized in `normalizeProductCompareData`, and
  covered by validator tests.
- Anti-abuse: product IDs, attribute keys, locale values, CTA behavior, media
  data, and layout options must be bounded enums/strings. Do not accept raw
  HTML, arbitrary object paths, scripts, untrusted provider URLs, or privileged
  settings in widget JSON.
- Secret handling: commerce provider credentials and private source payloads
  must stay backend-owned and must not enter widget JSON, browser cache, docs,
  reports, or changelog entries.

## Testing Requirements

Docs-only task creation:

- `git diff --check`
- `bun run precommit` before the manual commit, unless the configured hook runs
  it automatically and the committer records that proof.

Implementation leaves:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productCompare.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-compare-editor-wave.test.tsx`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `bun test tests/unit/commerce/commerceQueryService.test.ts` when query
  execution, product-id filtering, or manual ordering changes.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults or
  normalizer fields change.
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when public
  renderer output, markers, section semantics, or variants change.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` when
  clear/style token adjacency changes after TASK-256.
- Add Bun-owned route/security tests when any admin preview endpoint, commerce
  route, public write path, provider fetch, checkout/cart bridge, or runtime
  kernel behavior changes.
- `bun run gates:coderso`, `bun run scan:security:strict`, and
  `bun run precommit` before final family closure.

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_PRODUCT_COMPARE_WIDGET.md` with textual
  fixed/deferred evidence for implemented leaves. Do not commit PNG files.
- Update `_docs/_WIDGETS/PRODUCT_COMPARE.md` when schema, editor modes,
  runtime variants, resolved payload, or behavior changes.
- Update `_docs/WIDGETS.md` only if a global widget contract changes. Prefer
  TASK-256 for shared contract text.
- Update `_docs/WIDGET_PACK_MATRIX.md` if Product Compare pack readiness or
  completeness changes.
- Keep `_docs/_TASKS/README.md` in sync on every status transition.
- Add a changelog entry under `_docs/_CHANGELOG/` and update
  `_docs/_CHANGELOG/README.md` when the family or leaves move to `Done`.

## Acceptance Criteria

- Every finding in `_docs/PLAYWRIGHT/REPORT_PRODUCT_COMPARE_WIDGET.md` is owned
  by TASK-256, covered by a TASK-279 physical leaf, marked no-action with a
  reason, or explicitly deferred by TASK-279-08.
- TASK-279 task docs do not duplicate TASK-256 shared-contract implementation
  scope.
- Each implementation leaf names concrete files, data flow, error handling,
  regression tests, documentation updates, and validation commands.
- Implementation leaves do not hide shared `CommerceSourceFields`,
  builder-preview, or other cross-widget/admin-preview changes as Product
  Compare-only work without explicit shared-task routing or cross-widget tests.
- Runtime changes preserve backward compatibility for existing
  `product-compare` payloads unless the leaf documents and tests a
  normalizer/migration path.
- Product data resolution stays backend-owned; widget JSON never stores
  provider secrets or privileged runtime payloads.
- Final closure records report evidence, task status updates, changelog, and
  exact validation output.
