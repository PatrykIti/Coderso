# TASK-275: Navigation Widget Playwright Product Followups

# FileName: TASK-275_Navigation_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Navigation + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252, TASK-256, TASK-256-01, TASK-256-02, TASK-256-04, TASK-256-07, TASK-256-08
**Status:** Done (2026-05-19)

---

## Overview

Create the Navigation-specific follow-up family for
`_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md`.

This family owns only product and UX fixes that are local to the `navigation`
widget. Shared widget-contract repairs stay in TASK-256. Do not use TASK-275 to
hide generic editor-mode races, global preview architecture, shared safe-href
sanitizer changes, Section/layout wrapper changes, or generic color-contrast
validation.

## Source Report Boundary

Source report:

- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md`

Live owners inspected while drafting:

- `core/widgets/core/navigation.tsx`
- `core/admin/ui/widgets/editors/NavigationEditors.tsx`
- `core/services/navigation/navigationRuntimeResolver.ts`
- `tests/vitest/widgets/navigation.test.tsx`
- `tests/vitest/ui/navigation-editor-wave.test.tsx`
- `tests/unit/navigation/navigationRuntimeResolver.test.ts`
- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/_WIDGETS/tmp/navigation/MATRIX.md`
- `_docs/WIDGETS.md`

## Current Contract Notes

The current Navigation widget docs intentionally describe two weak v1 behaviors:

- `behavior.collapseOnScroll` is stored and emitted as
  `data-collapse-on-scroll="true"` without JS collapse behavior.
- `mobileMode` documents `drawer` and `minimal` together as hidden mobile links
  plus a compact trigger.

TASK-275 changes those Navigation-specific product contracts. Implementation
leaves must update `_docs/_WIDGETS/NAVIGATION.md` when they make those behaviors
real. Drafts and changelogs must not claim those two rows were already broken
against the source-of-truth docs before the contract change.

## TASK-256 Exclusion Matrix

| Report finding | Evidence | Owner task or boundary | Reason |
|---|---|---|---|
| Missing live preview in all editor modes | `REPORT_NAVIGATION_WIDGET.md:181` | TASK-313 | The row is shared editor-preview surface scope. TASK-275 may reference it, but must not claim closure until TASK-313 lands or explicitly keeps the row routed. |
| Sticky nav blocked on published frontend by Section `overflow-hidden` | `REPORT_NAVIGATION_WIDGET.md:378-393,405` | TASK-314 | The report identifies `Section`/layout wrapper ownership. TASK-275 may record evidence, but must not patch Section inside a Navigation task or close the sticky frontend row without the exact shared owner task. |
| Generic contrast validation for configurable colors | `REPORT_NAVIGATION_WIDGET.md:215` | TASK-256-08 future shared validation owner | Contrast warnings should be shared across configurable color widgets. |
| Generic safe-href sanitizer semantics | TASK-256 shared link/media hardening | TASK-256 | TASK-275 may consume existing safe-href helpers and align Navigation editor validation, but must not fork a new sanitizer. |
| Global Advanced/Visual mode ownership rules | TASK-256 editor-mode scope | TASK-256-01 | Navigation-specific copy can improve in TASK-275 leaves, but broad mode ownership belongs to TASK-256. |
| Advanced editor feels like secondary settings without visual context | `REPORT_NAVIGATION_WIDGET.md:188` | TASK-256-01 | The broader editor-mode IA and preview-context expectation is shared panel ownership, not a Navigation-only runtime fix. |
| Arbitrary mega-menu/search/dark-mode platform expansion | `REPORT_NAVIGATION_WIDGET.md:228-233` | Future product task only if approved | These are market comparisons, not fixes required to make the current Navigation contract truthful. |

## TASK-275 Scope Matrix

| Report finding | TASK-275 owner | Notes |
|---|---|---|
| Logo `href` exists but logo renders as non-link; Wizard/Visual logo link lacks label | TASK-275-01 | Navigation renderer/editor only; use existing safe-href normalization. |
| `#` is valid at runtime but flagged as invalid in the editor | TASK-275-01 | Local `NavigationEditors.isValidHref` drift from `normalizeWidgetSafeHref({ allowHash: true })`. |
| `minimal` mobile mode is currently equivalent to `drawer` | TASK-275-02 | Intentional Navigation product-contract change from current docs. |
| Mobile CTA duplicates between header and open panel | TASK-275-02 | Navigation renderer policy for drawer/mobile-only CTA placement. |
| Mobile trigger is text-only, has no state change, no explicit action label, no animation, and no focus safety | TASK-275-02 | Navigation runtime script and render markup. |
| Dropdown works only on hover/focus-within, lacks accessible expanded state, and the report asks about `role="menu"` / `role="menuitem"` | TASK-275-03 | Navigation submenu runtime behavior, including root `<nav aria-label>` output needed by the report. TASK-275-03 must explicitly decide menu-role semantics; default is semantic site navigation with links/buttons, not ARIA application-menu roles. Dropdown direction is owned by TASK-275-05-03. |
| `NavigationItemMeta.icon`, `description`, and `badge` exist but are not fully editable/rendered | TASK-275-03 | Navigation schema already has fields; add editor and runtime surface without arbitrary rich menu blocks. |
| Main links cannot be reordered, link limit lacks feedback, sub-link hierarchy is weak, Wizard shows only the first three quick links without overflow state, and menu-source mode lacks preview | TASK-275-04 | Navigation editor repeated-item, Wizard summary/count, and read-only preview management. |
| `collapseOnScroll` persists only a data attribute | TASK-275-05-01 | Product-contract expansion from current docs; implement only after the runtime script shape is stable. Sticky failures caused by Section/page-shell overflow stay routed outside TASK-275. |
| Surface and Runtime Behavior note is confusing because sticky/collapse controls live in Advanced | TASK-275-05-01 | Navigation-local helper copy for collapse/sticky limitations belongs with the collapse runtime contract. Global editor-mode IA stays excluded to TASK-256-01. |
| Active-link detection plus safe target/rel controls are missing | TASK-275-05-02 | Navigation-owned link behavior that consumes existing safe-href helpers instead of forking sanitizer logic. |
| Hover/active colors, underline, letter spacing, shadow, blur, dropdown direction, dropdown animation tokens, and Navigation-local hex color live validation are missing | TASK-275-05-03 | Navigation-owned optional visual-token expansion. Dropdown click/touch/a11y state stays in TASK-275-03; mobile panel animation stays in TASK-275-02. |
| CTA radius/separator, logo size, Wizard CTA helper copy, and bounded secondary-CTA policy are missing or misleading | TASK-275-05-04 | Navigation-owned brand/action controls and CTA editor copy. Arbitrary mega-menu/search/dark-mode platform expansion remains out of scope. |
| Report fixed/deferred notes, widget docs, changelog, and board closure | TASK-275-06 | Final evidence and status synchronization. |

## Current Owner and Test Matrix

| Area | Current owners | Current tests | New or changed tests |
|---|---|---|---|
| Schema, defaults, normalizer, renderer | `core/widgets/core/navigation.tsx` | `tests/vitest/widgets/navigation.test.tsx`, `tests/vitest/widgets/renderer.test.tsx` | Add SSR assertions for linked logo, mobile modes, dropdown state markup, metadata rendering, collapsed-state attributes/classes, style fields, target/rel output, and backward compatibility. |
| Wizard/Visual/Advanced editors | `core/admin/ui/widgets/editors/NavigationEditors.tsx` | `tests/vitest/ui/navigation-editor-wave.test.tsx` | Add editor-flow tests for logo labels, `#` validation, metadata fields, reorder/limit controls, menu previews, mobile controls, style controls, and target fields. |
| Runtime script interactions | `core/widgets/core/navigation.tsx` | none | Add `tests/vitest/widgets/navigationRuntimeScript.test.ts` for drawer focus/label state, submenu click/Escape/outside-click behavior, collapse-on-scroll state changes, and client-side active-link detection. |
| Runtime menu/pages source resolution | `core/services/navigation/navigationRuntimeResolver.ts` | `tests/unit/navigation/navigationRuntimeResolver.test.ts` | Update only when a leaf changes resolved metadata, link target data, or fallback shape. |
| Shared safe link helper adjacency | `core/widgets/core/widgetSafeHref.ts` | Shared widget safe-href tests | Do not fork. Run shared tests only if a leaf intentionally extends the helper contract through TASK-256 or an approved shared task. |
| Widget docs and report evidence | `_docs/_WIDGETS/NAVIGATION.md`, `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md` | docs diff checks | Update fixed/deferred status and user-facing contract after each implementation wave. |

## Sub-Tasks

- [x] TASK-275-01: Navigation Logo and Safe Link Parity
- [x] TASK-275-02: Navigation Mobile Drawer and Minimal Mode
- [x] TASK-275-03: Navigation Dropdown and Rich Link Metadata
- [x] TASK-275-04: Navigation Link Management UX
- [x] TASK-275-05: Navigation Optional Style and Product Controls
  - [x] TASK-275-05-01: Navigation Collapse Runtime Contract
  - [x] TASK-275-05-02: Navigation Active Links and Safe Targets
  - [x] TASK-275-05-03: Navigation Visual Style Tokens
  - [x] TASK-275-05-04: Navigation Brand CTA and Logo Controls
- [x] TASK-275-06: Navigation Report, Docs, Changelog, and Closure

## Implementation Order

1. Complete or rebase over TASK-256 shared safe-href/editor-mode fixes first
   when a leaf depends on shared helpers.
2. Complete TASK-275-01 first because logo destination and editor validation are
   foundational and low-blast-radius.
3. Complete TASK-275-02 before dropdown work because the mobile runtime script
   owns drawer state, CTA placement, labels, and focus behavior.
4. Complete TASK-275-03 after the mobile script shape is stable so submenu state
   does not duplicate event binding.
5. Complete TASK-275-04 after metadata/link rendering is stable. It touches the
   same repeated item editor surface.
6. Do not implement TASK-275-05 directly. Complete its physical child leaves in
   this order: TASK-275-05-01 collapse, TASK-275-05-02 active/target links,
   TASK-275-05-03 visual tokens/dropdown direction/motion, and TASK-275-05-04
   brand CTA/logo controls.
7. Complete TASK-275-06 last with report evidence, exact shared owner IDs for
   live-preview (`TASK-313`) and sticky routed rows (`TASK-314`), docs, changelog, board sync,
   and final validation.

## Git Scope Safeguards

- Work in a dedicated branch/worktree for implementation.
- Run `git status --short --branch` before implementation, before staging,
  before commit, and before merge-back.
- Stage only `TASK-275*` files, Navigation owner files, Navigation tests,
  Navigation docs/report files, and required changelog/board rows.
- `_docs/_TASKS/README.md` is a shared hotspot while parallel agents are
  drafting task families. Re-read it immediately before patching and add only
  TASK-275 rows/counts.
- Use `git diff --cached --name-only` and `git diff --cached --check` before
  every commit.

## Security Contract

This planning family does not add API routes.

- Endpoint visibility: none.
- Auth model: unchanged authenticated admin page/template editing and public
  runtime rendering.
- RBAC: unchanged page/template/widget-template write permissions.
- CSRF: unchanged because no write routes are introduced.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: every new persisted Navigation field must be added
  to `navigationSchema`, normalized in `normalizeNavigationData()`, and covered
  by validator tests when schema/defaults change.
- Anti-abuse: link, logo, and CTA destinations must keep
  `normalizeWidgetSafeHref()` behavior. New target fields must render safe
  `rel` values for external/new-tab links. No raw HTML, script, privileged
  token, or unbounded class-name field may be introduced.
- Secret handling: no secrets in widget data, diagnostics, Playwright evidence,
  DOM attributes, or browser storage.

## Testing Requirements

Docs-only task planning:

- `git diff --check`
- `bun run precommit` before the manual commit, unless the configured hook runs
  it automatically and the committer records that proof.

Implementation leaves:

- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/navigationRuntimeScript.test.ts`
- `bun run test:vitest -- tests/vitest/ui/navigation-editor-wave.test.tsx`
- `bun test tests/unit/navigation/navigationRuntimeResolver.test.ts` when source
  resolution, metadata, or fallback shape changes.
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when shared
  renderer output assumptions change.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change.
- `bun test tests/unit/widgets/registry.test.ts` if widget registration,
  variants, slots, or editor capabilities change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun scripts/coderso-release-gates.ts --gate ux` when a leaf changes public
  runtime UX, editor UX, or accessibility semantics.
- `bun scripts/coderso-release-gates.ts --gate security` when a leaf changes
  link safety, target/rel output, or security-sensitive public markup.
- `bun scripts/coderso-release-gates.ts --gate reliability` when a leaf changes
  interactive runtime state, focus policy, scroll behavior, or idempotent
  client-script binding.
- `bun scripts/coderso-release-gates.ts --gate performance` when a leaf changes
  scroll or motion behavior with performance risk.
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md` with fixed, deferred, or
  routed status for every TASK-275 report row. Do not commit PNG files.
- Update `_docs/_WIDGETS/NAVIGATION.md` when data, editor, runtime, or
  user-facing behavior changes.
- Update `_docs/WIDGETS.md` only if a source-of-truth widget contract changes;
  Navigation-only field additions belong in the widget doc.
- Update `core/widgets/modulePackMatrix.ts` and `_docs/WIDGET_PACK_MATRIX.md`
  only if pack readiness/completeness changes.
- Add a final changelog entry and update `_docs/_CHANGELOG/README.md` when this
  family is completed.
- Keep `_docs/_TASKS/README.md` synchronized on every status transition.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and
  `_docs/_CHANGELOG/README.md` is updated.
- A leaf may create its own changelog entry, or TASK-275-06 may create the final
  umbrella changelog entry that explicitly lists this task ID.

## Acceptance Criteria

- Every finding in `REPORT_NAVIGATION_WIDGET.md` is either implemented by a
  TASK-275 physical leaf, explicitly excluded to TASK-256/shared ownership, or
  deferred by TASK-275-06 with a reason.
- Live-preview and sticky frontend rows are not marked closed by TASK-275 unless
  TASK-275-06 references the exact shared physical owner tasks (`TASK-313` and
  `TASK-314`); otherwise their status remains `routed`.
- TASK-275 docs do not duplicate TASK-256 shared-contract implementation scope.
- Each implementation leaf names concrete files, data flow, error handling,
  regression tests, documentation updates, and validation commands.
- Runtime changes preserve backward compatibility for existing `navigation`
  payloads unless the leaf documents and tests a migration/normalizer path.
- Final closure records report evidence, task status updates, changelog, and the
  exact validation output.
