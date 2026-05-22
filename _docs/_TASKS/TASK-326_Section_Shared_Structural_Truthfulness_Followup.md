# TASK-326: Section Shared Structural Truthfulness Follow-up

# FileName: TASK-326_Section_Shared_Structural_Truthfulness_Followup.md

**Priority:** High
**Category:** Widgets + Section + Shared Contract + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256, TASK-256-05-01, TASK-283
**Status:** Done (2026-05-22)

---

## Overview

Close the residual shared-contract drift that stayed open in the live `section`
owner even though the earlier TASK-256 closure path was already marked done.

This task exists because the 2026-05-21 TASK-283 audit confirmed several
report findings are still structural truthfulness issues in the current
checkout, so they must not be patched ad hoc inside the widget-local
TASK-283 product-expansion leaves.

## Scope

- Make the current `borderWidth` and `radius` fallback behavior truthful for
  invalid or sparse saved values by resolving to the actual Section defaults
  instead of misleading fallback tokens.
- Remove the duplicated Visual/Advanced ownership of `gradientAngle` and
  `overlayOpacity` so the Section editor no longer exposes the same surface
  controls in two modes without extra ownership value.
- Make the existing `content` / `wide` / `bleed` controls truthful for the
  current runtime behavior without widening the Section layout model beyond the
  already-owned product leaves.
- Route the reopened shared findings out of TASK-283 report recommendations so
  the Section widget-local family can continue with media, typography, presets,
  responsive spacing, and structure work only.

Out of scope:

- Section background media and bounded surface layers, owned by `TASK-283-02`.
- Heading-level, typography, alignment, and Wizard label controls, owned by
  `TASK-283-03`.
- Presets, friendly max-width labels, and variant onboarding owned by
  `TASK-283-04`.
- Shadow, motion, preview, responsive spacing, and custom region labels owned
  by `TASK-283-05` through `TASK-283-07`.
- Raw CSS classes, arbitrary style strings, or new layout semantics that exceed
  the existing Section owner contract.

## Source Evidence

- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:81-85,133-174,342-350`
- `_docs/_TASKS/TASK-256-05-01_Section_and_Grid_Columns_Structural_Findings.md`
- `_docs/_TASKS/TASK-283_Section_Widget_Playwright_Product_Followups.md`
- `core/widgets/core/section.tsx`
- `core/admin/ui/widgets/editors/SectionEditors.tsx`
- `tests/vitest/widgets/section.test.tsx`
- `tests/vitest/ui/section-editor-wave.test.tsx`

## Sub-Tasks

- [x] Align `resolveSectionBorderWidth` and `resolveSectionRadius` fallback
  behavior with `sectionDefaults` and prove the contract in focused Section
  runtime tests.
- [x] Remove duplicated `gradientAngle` and `overlayOpacity` ownership from
  Section Visual/Advanced modes and update the focused editor-wave coverage to
  match the final mode contract.
- [x] Make `content` / `wide` / `bleed` editor copy and behavior truthful for
  the current runtime without silently inventing new width semantics.
- [x] Update the Section report/task ownership docs so reopened shared
  truthfulness findings no longer masquerade as already-fixed TASK-256 work or
  as widget-local TASK-283 scope.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/section.tsx` | Align default/fallback normalization and any narrow runtime truthfulness markers needed for current Section controls. |
| `core/admin/ui/widgets/editors/SectionEditors.tsx` | Remove duplicated control ownership and make current width/bleed guidance truthful. |
| `tests/vitest/widgets/section.test.tsx` | Cover fallback/default truthfulness and any runtime output markers changed by the shared fix. |
| `tests/vitest/ui/section-editor-wave.test.tsx` | Cover the final Visual/Advanced ownership contract and current width guidance behavior. |
| `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md` | Route the reopened shared findings to `TASK-326` and remove stale “already fixed” claims for these specific items. |
| `_docs/_TASKS/TASK-283_Section_Widget_Playwright_Product_Followups.md` | Keep the Section product-family exclusion matrix truthful after the shared split. |
| `_docs/_TASKS/README.md` | Track the new shared task row and keep board statistics synchronized. |

## Implementation Pseudocode

Truthful fallback flow:

```ts
function normalizeSectionStyle(value: SectionData["style"] | undefined) {
  const defaults = sectionDefaults.style ?? {
    borderWidth: "0",
    radius: "none",
    gradientAngle: 180,
    overlayOpacity: 0,
  };
  return {
    ...existingStyleFields,
    borderWidth: resolveSectionBorderWidth(value?.borderWidth ?? defaults.borderWidth),
    radius: resolveSectionRadius(value?.radius ?? defaults.radius),
  };
}
```

Mode-ownership flow:

```ts
function renderSectionAdvancedEditor(value: SectionData) {
  return {
    semantics: pickSemanticsDiagnostics(value),
    diagnostics: renderNormalizedSnapshot(value),
  };
}
```

Width-truthfulness flow:

```ts
function resolveSectionWidthGuidance(layout: SectionData["layout"], variant: string) {
  const isWideAlias = layout?.containerWidth === "wide";
  return {
    showWideAliasCopy: isWideAlias,
    bleedNeedsFullWidth: variant === "bleed" && layout?.containerWidth !== "full",
  };
}
```

Error handling:

- Do not bury reopened shared drift inside a TASK-283 implementation commit.
- Do not silently invent a new `wide` runtime layout just to make the current
  label look real; either relabel/gate the control or intentionally map it
  through a truthful existing behavior.
- If resolving the duplicated control ownership requires a broader shared editor
  pattern, stop and split that exact shared helper instead of hiding it inside
  Section.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: preserve the existing strict Section schema unless
  this task intentionally changes a persisted field with matching validator
  coverage.
- Anti-abuse: no raw HTML, scripts, arbitrary classes, or arbitrary CSS values.
- Secret handling: no secrets in widget data, diagnostics, or report evidence.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/section.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/section-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if the persisted Section
  schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md`.
- Update `_docs/_TASKS/TASK-283_Section_Widget_Playwright_Product_Followups.md`.
- Update `_docs/_WIDGETS/SECTION.md` if current Section editor/runtime behavior
  changes.
- Update `_docs/_TASKS/README.md`.
- Add the changelog entry and board sync for the completed shared closure.

## Acceptance Criteria

- Invalid or sparse Section style values resolve to the actual saved defaults,
  not misleading fallback tokens.
- `gradientAngle` and `overlayOpacity` have one truthful owner mode in the
  Section editor.
- The existing `content` / `wide` / `bleed` controls no longer imply runtime
  behavior that does not exist.
- Section report and task ownership clearly distinguish reopened shared drift
  from the remaining widget-local TASK-283 leaves.

## Validation Notes

- `bunx vitest run --config vitest.config.ts tests/vitest/widgets/section.test.tsx tests/vitest/ui/section-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `set -a && source /home/coder/project/Coderso/.env && set +a && bun run gates:coderso` (the dedicated worktree used a temporary local `.env` symlink because it does not carry its own env file)
- `bun run precommit`
- `git diff --check`
- `bun run scan:security:strict` still exits non-zero only because local `semgrep`, `trivy`, and `gitleaks` executables are unavailable; `bun audit` ran inside the command.
