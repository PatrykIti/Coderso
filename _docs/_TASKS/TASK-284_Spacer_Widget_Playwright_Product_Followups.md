# TASK-284: Spacer Widget Playwright Product Followups

# FileName: TASK-284_Spacer_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Layout + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252, TASK-256, TASK-256-01, TASK-256-02, TASK-256-05-03, TASK-256-08, TASK-303
**Status:** In Progress (2026-05-21)

---

## Overview

Create the Spacer-specific follow-up family for
`_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md`.

TASK-256 and TASK-303 own the shared widget-contract drift already closed for
Spacer. This family deliberately excludes shared token-control, editor-mode,
variant-update, and guide-truthfulness repairs already routed through those
owners. TASK-284 owns only product and polish work that remains local to the
standalone `spacer` layout primitive:

- `core/widgets/core/spacer.tsx`
- `core/admin/ui/widgets/editors/SpacerEditors.tsx`
- `tests/vitest/widgets/spacer.test.tsx`
- `tests/vitest/ui/spacer-editor-wave.test.tsx`
- `tests/vitest/widgets/styleNoneTokens.test.tsx`
- `tests/vitest/widgets/renderer.test.tsx`
- `tests/unit/widgets/validator.test.ts`
- `_docs/_WIDGETS/SPACER.md`
- `_docs/_WIDGETS/tmp/spacer/README.md`
- `_docs/_WIDGETS/tmp/spacer/MATRIX.md`
- `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md`

Spacer remains an atomic layout utility. It has no slots and no public write
route. Every implementation leaf must keep the widget schema-first, bounded,
backward-compatible, deterministic in public runtime output, and simple for
authors who only need vertical rhythm.

## Source Report Boundary

Source report:

- `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md`

Live owners inspected while drafting:

- `core/widgets/core/spacer.tsx`
- `core/admin/ui/widgets/editors/SpacerEditors.tsx`
- `tests/vitest/widgets/spacer.test.tsx`
- `tests/vitest/ui/spacer-editor-wave.test.tsx`
- `tests/vitest/widgets/styleNoneTokens.test.tsx`
- `_docs/_WIDGETS/SPACER.md`
- `_docs/_WIDGETS/tmp/spacer/MATRIX.md`
- `_docs/_WIDGETS/tmp/spacer/README.md`

## TASK-256 Exclusion Matrix

The following report findings are intentionally excluded from TASK-284 because
TASK-256 already owns them as shared widget-contract drift or as an explicit
Spacer/Divider shared structural leaf.

| Report finding | Evidence | Owner task | Reason |
|---|---|---|---|
| BUG-01 duplicate `none` and `0` height choices | `REPORT_SPACER_WIDGET.md:148-153`, `REPORT_SPACER_WIDGET.md:280` | TASK-303 | Shared Divider/Spacer token-control closure already collapsed the legacy duplicate behind canonical `None`. |
| BUG-02 Fixed -> Responsive loses tablet/mobile values | `REPORT_SPACER_WIDGET.md:155-160`, `REPORT_SPACER_WIDGET.md:263` | TASK-256-01, TASK-256-05-03 | Shared variant-update and inactive-data preservation contract. |
| BUG-03 / UX-05 Advanced hardcodes responsive controls while fixed is active | `REPORT_SPACER_WIDGET.md:162-171`, `REPORT_SPACER_WIDGET.md:206-211`, `REPORT_SPACER_WIDGET.md:264,274` | TASK-256-01, TASK-256-05-03 | Shared editor-mode truthfulness and Advanced ownership contract. |
| BUG-04 / BF-01 guide copy or visibility does not match the main canvas | `REPORT_SPACER_WIDGET.md:173-183`, `REPORT_SPACER_WIDGET.md:217-219`, `REPORT_SPACER_WIDGET.md:265,281` | TASK-256-05-03 | Existing TASK-256 Spacer/Divider leaf already decides whether to render the guide in editor context or relabel it as preview-only. |
| UX-02 `Custom px` select option is a no-op | `REPORT_SPACER_WIDGET.md:193-196`, `REPORT_SPACER_WIDGET.md:272` | TASK-303 | Shared Divider/Spacer token-control closure already made `Custom px` enter explicit custom-edit mode. |
| UX-03 token-active custom input copy | `REPORT_SPACER_WIDGET.md:198-200`, `REPORT_SPACER_WIDGET.md:284` | TASK-303 | Shared Divider/Spacer token-control closure already surfaces token/custom state messaging without Spacer-local parsing drift. |
| UX-04 invisible canvas spacer when guide is off | `REPORT_SPACER_WIDGET.md:202-204`, `REPORT_SPACER_WIDGET.md:273` | TASK-256-05-03 | Same guide/canvas truthfulness route as BUG-04/BF-01. |

TASK-284 may consume the final TASK-256/TASK-303 behavior, but it must not
restage these repairs inside its own leaves. If a TASK-284 leaf touches the
same owners, the diff must remain limited to Spacer-specific product fields,
documentation, and copy that is not part of the shared contract.

## TASK-284 Scope Matrix

| Report finding | TASK-284 owner | Notes |
|---|---|---|
| UX-01 fixed-mode Wizard lacks consequence copy | TASK-284-01 | Spacer-only author guidance after TASK-256 decides fixed/responsive data handling. |
| BF-06 missing breakpoint meaning beside Desktop height | TASK-284-01 | Spacer-local editor copy; no shared breakpoint contract changes. |
| BF-07 bare numeric custom input is supported but not communicated | TASK-284-01 | Document and label the existing Spacer parser behavior without changing TASK-256 custom-token semantics. |
| A2 custom px input relies on placeholder-only labeling | TASK-284-01 | Add explicit accessible names/help text for Spacer height inputs after shared token UI is stable. |
| BF-02 viewport units `vh`, `dvh`, `svh`, `vw` | TASK-284-02 | Bounded CSS length grammar and schema/normalizer/render/editor tests. |
| BF-03 `clamp()` / fluid spacing | TASK-284-02 | Bounded fluid-spacing value parser; no arbitrary CSS/class passthrough. |
| BF-04 named presets/templates for vertical rhythm | TASK-284-03 | Product presets that map to existing or expanded safe height values. |
| BF-05 horizontal spacer option | TASK-284-04 | Explicit product decision and implementation path; must not become a flex-filler primitive or broad page-builder layout rewrite. |
| A1 `aria-hidden` decorative output | No TASK-284 implementation | Report marks the current behavior as OK; keep covered by existing and future runtime tests. |
| A3 guide overlay ARIA/role | TASK-256-05-03 / TASK-284-05 classification | If TASK-256 keeps the guide decorative under `aria-hidden`, TASK-284-05 records no action; if TASK-256 exposes it to assistive tech, closure must create a follow-up only if not covered there. |
| Report fixed/deferred notes, widget docs, changelog, board closure | TASK-284-05 | Final documentation and evidence pass. |

## Current Owner and Test Matrix

| Area | Current owners | Current tests | New or changed tests |
|---|---|---|---|
| Schema, defaults, normalizer, length parsing, renderer | `core/widgets/core/spacer.tsx` | `tests/vitest/widgets/spacer.test.tsx`, `tests/vitest/widgets/styleNoneTokens.test.tsx` | Add normalization and SSR assertions for viewport units, fluid values, presets, orientation, and any DOM marker changes. |
| Wizard/Visual/Advanced editors | `core/admin/ui/widgets/editors/SpacerEditors.tsx`, `core/admin/ui/widgets/editors/TokenOrPixelField.tsx` (opt-in hooks only) | `tests/vitest/ui/spacer-editor-wave.test.tsx`, `tests/vitest/ui/divider-editor-wave.test.tsx`, `tests/vitest/ui/widget-template-editor.test.tsx` | Add mode-specific assertions for fixed-mode guidance, breakpoint help, accessible height fields, new unit/preset controls, shared-helper regressions, and orientation UX. |
| Widget validator/registry/render integration | `core/widgets/validator.ts`, `core/widgets/renderers/widgetRenderer.tsx`, registry via `createSpacerWidget()` | `tests/unit/widgets/validator.test.ts`, `tests/vitest/widgets/renderer.test.tsx` | Run validator tests whenever schema/defaults change; run renderer tests when public markers or render shape change. |
| Widget docs and source report | `_docs/_WIDGETS/SPACER.md`, `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md` | docs diff checks | Update contract docs and fixed/deferred/routed evidence after implementation leaves land. |

## Sub-Tasks

- [x] TASK-284-01: Spacer Editor Guidance and Input Accessibility
- [x] TASK-284-02: Spacer Viewport and Fluid Length Units
- [x] TASK-284-03: Spacer Named Rhythm Presets
- [ ] TASK-284-04: Spacer Horizontal Orientation Contract
- [ ] TASK-284-05: Spacer Report Docs Changelog and Closure

## Implementation Order

1. Consume the already-landed TASK-256/TASK-303 shared fixes first when a
   selected leaf touches token, variant, Advanced-mode, or guide/canvas-adjacent owners.
2. Complete TASK-284-01 first; the current branch already includes the shared
   prerequisites from TASK-256-05-03 and TASK-303.
3. Complete TASK-284-02 before presets so presets can reuse the final safe
   length resolver instead of duplicating viewport/fluid parsing.
4. Complete TASK-284-03 after length semantics are stable.
5. Complete TASK-284-04 after the vertical spacer model is stable enough to
   decide whether horizontal spacing belongs in this widget or should be
   deferred with a documented reason.
6. Complete TASK-284-05 last after code, tests, report evidence, widget docs,
   changelog, and board state are synchronized.

## Git Scope Safeguards

- Work in a dedicated branch/worktree for implementation because several active
  agents touch `_docs/_TASKS/README.md`.
- Run `git status --short --branch` before implementation, staging, commit, and
  merge-back.
- Stage only `TASK-284*` files, Spacer owner files, focused Spacer tests,
  Spacer docs/report files, and required changelog/board files.
- Because `_docs/_TASKS/README.md` is a shared board touched by parallel agents,
  re-read it immediately before staging and verify the cached diff contains only
  the TASK-284 rows/counts owned by the current commit.
- Use `git diff --cached --name-only` and `git diff --cached --check` before
  every commit.

## Security Contract

This planning family does not add API routes.

- Endpoint visibility: none.
- Auth model: unchanged authenticated admin page/template editing and public
  runtime rendering.
- RBAC: unchanged page/template/widget write permissions.
- CSRF: unchanged existing admin write route protection.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: any new Spacer persisted field must be added to
  `spacerSchema` with `additionalProperties: false`, normalized in
  `normalizeSpacerData()`, and covered by validator/runtime tests when schema
  fields change.
- Anti-abuse: length, preset, orientation, and display fields must be bounded
  tokens or validated CSS values only. Do not accept raw HTML, scripts, inline
  event handlers, unbounded class names, arbitrary CSS declarations, or
  privileged data.
- Secret handling: no secrets, private URLs, tokens, or privileged settings in
  widget JSON, browser cache, diagnostics, Playwright evidence, or changelog
  notes.

## Testing Requirements

Docs-only task creation:

- `git diff --check`
- `bun run precommit` before the manual commit, unless the configured hook runs
  it automatically and the committer records that proof.

Implementation leaves:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/spacer.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/spacer-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` when
  `none`, token, custom length, or style-token adjacency changes.
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when public
  renderer markers, orientation, or SSR wrapper output changes.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change.
  Normalizer-only Spacer safety changes belong in
  `tests/vitest/widgets/spacer.test.tsx` and renderer/CSS marker assertions.
- `bun test tests/unit/widgets/registry.test.ts` if variant registration or
  widget definition metadata changes.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md` with textual
  fixed/deferred/TASK-256-routed evidence for each implemented leaf. Do not
  commit PNG files.
- Update `_docs/_WIDGETS/SPACER.md` when schema, editor modes, runtime variants,
  length grammar, presets, orientation, or behavior changes.
- Update `_docs/WIDGETS.md` only if this family intentionally changes the
  shared widget contract. Prefer TASK-256 for shared contract text.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if Spacer readiness or pack
  completeness changes affect a pack contract.
- Add a changelog entry under `_docs/_CHANGELOG/` and update
  `_docs/_CHANGELOG/README.md` when the family is completed.
- Keep `_docs/_TASKS/README.md` in sync on every status transition.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and
  `_docs/_CHANGELOG/README.md` is updated.
- Leaves may share one final TASK-284 changelog entry if the implementation is
  landed as one family; otherwise each completed leaf must be listed.

## Acceptance Criteria

- Every finding in `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md` is either owned by
  TASK-256, covered by a TASK-284 physical leaf, explicitly marked no-action, or
  deferred by TASK-284-05 with a reason.
- TASK-284 task docs do not duplicate TASK-256 shared-contract implementation
  scope.
- Each implementation leaf names concrete files, data flow, error handling,
  regression tests, documentation updates, and validation commands.
- Spacer schema, defaults, normalizer, renderer, editor controls, tests, docs,
  and report evidence move together for every new product field.
- Public runtime output remains decorative, deterministic, safe, and backward
  compatible for existing `spacer` payloads unless the leaf documents and tests
  a normalizer path.
