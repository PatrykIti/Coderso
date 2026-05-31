# TASK-307: Feature Grid Shared Contract Residuals

# FileName: TASK-307_Feature_Grid_Shared_Contract_Residuals.md

**Priority:** High
**Category:** Widgets + Shared Contract + Admin UI + Runtime Render + Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-256-01, TASK-256-04, TASK-256-06-01, TASK-267
**Status:** Done (2026-05-17)

---

## Overview

`TASK-267` audit found several rows that were excluded as shared-contract work
but are still live in the current Feature Grid owners. This task fixes only the
residual shared contract:

- inline editor feedback for invalid image and CTA URLs,
- safe runtime fallback for invalid image URLs,
- decorative emoji semantics,
- truthful Advanced-mode ownership for duplicated token controls.

This task must not absorb Feature Grid product work that belongs in `TASK-267`
such as media-library picking, emoji presets, alt authoring, layout controls,
CTA enable/target product behavior, or rich descriptions.

## Drift Evidence

- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:191-194` - invalid image URL
  still leads to broken image output without validation feedback.
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:238-244` - blocked CTA URL has
  no editor feedback and Advanced still duplicates Visual token ownership.
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:350` - emoji icons still miss
  decorative `aria-hidden`.
- `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` still exposes raw
  `Image URL` and `CTA URL` inputs without validity messaging, and Advanced
  still renders duplicated token selects.
- `core/widgets/core/featureGrid.tsx` still renders raw `item.image` values and
  emoji icons without shared safety/ARIA normalization.

## Sub-Tasks

- None. This is an execution task discovered during `TASK-267`.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` | Add inline invalid-value feedback for `Image URL` and `CTA URL`, and remove or convert duplicated Advanced token controls into truthful diagnostics-only behavior. |
| `core/widgets/core/featureGrid.tsx` | Normalize card image URLs through the shared safe-href helper before rendering, keep invalid values non-destructive, and mark decorative emoji output `aria-hidden`. |
| `tests/vitest/ui/feature-grid-editor-wave.test.tsx` | Cover invalid image/CTA feedback, Advanced-mode diagnostic scope, and retained raw values for user correction. |
| `tests/vitest/widgets/featureGrid.test.tsx` | Cover safe image fallback and decorative emoji semantics. |
| `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md` | Rewrite the stale shared rows so the report no longer contradicts current code after this task lands. |
| `_docs/_TASKS/TASK-267*.md` | Point residual shared rows at `TASK-307` instead of claiming they are already closed under `TASK-256`. |
| `_docs/_TASKS/README.md` | Add `TASK-307` and move `TASK-267` umbrella to `In Progress`. |

## Implementation Pseudocode

```tsx
function isValidFeatureGridImageUrl(value: string | undefined) {
  return (
    !value ||
    normalizeWidgetSafeHref(value, {
      allowRelative: true,
      allowHttp: true,
    }) !== undefined
  );
}

function isValidFeatureGridCtaUrl(value: string | undefined) {
  return (
    !value ||
    normalizeWidgetSafeHref(value, {
      allowRelative: true,
      allowHash: true,
      allowHttp: true,
    }) !== undefined
  );
}

function FeatureGridAdvancedEditor() {
  return (
    <EditorSection title="Normalization and safeguards">
      <p className="text-xs text-muted-foreground">
        Layout tokens are owned by Visual. Advanced keeps normalization actions
        and read-only diagnostics only.
      </p>
      <DiagnosticsSnapshot value={normalized} />
    </EditorSection>
  );
}

function FeatureGridBlock({ data }: { data: FeatureGridData }) {
  const safeImage = normalizeWidgetSafeHref(item.image, {
    allowRelative: true,
    allowHttp: true,
  });
  return safeImage ? (
    <img src={safeImage} alt={item.title ?? fallbackTitle} loading="lazy" />
  ) : hasIcon ? (
    <span aria-hidden="true">{item.icon}</span>
  ) : null;
}
```

Error handling:

- Invalid image and CTA values stay in editor state so the author can correct
  them; the renderer simply refuses unsafe output.
- Advanced must not introduce a second editable path for tokens already owned by
  Visual.
- Do not add a widget-local safe-media helper; reuse `normalizeWidgetSafeHref`.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: unchanged; no schema fields are added here.
- Anti-abuse: invalid/unsafe URLs remain visible for correction in admin, but
  runtime output must continue to reject them.
- Accessibility: decorative emoji must not be announced; no new semantic HTML
  regressions are introduced while removing duplicated Advanced controls.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/feature-grid-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/featureGrid.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts` if the
  shared helper behavior changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md`
- `_docs/_TASKS/TASK-267_Feature_Grid_Widget_Playwright_Product_Followups.md`
- `_docs/_TASKS/TASK-267-03_Feature_Grid_Media_Picker_Emoji_Picker_and_Image_Priority_UX.md`
- `_docs/_TASKS/TASK-267-07_Feature_Grid_Wizard_Guidance_and_Editor_Entry_Flow.md` if shared mode ownership wording changes
- `_docs/_TASKS/TASK-267-08_Feature_Grid_Report_Docs_Changelog_and_Closure.md`
- `_docs/_TASKS/README.md`

## Completion Notes

- Done (2026-05-17). Closed the shared Feature Grid residuals discovered during
  the TASK-267 audit: invalid image/CTA feedback, safe image fallback, emoji
  decorative semantics, and Advanced-mode diagnostics-only cleanup.
- Final family validation is recorded in
  `_docs/_TASKS/TASK-267-08_Feature_Grid_Report_Docs_Changelog_and_Closure.md`.

## Acceptance Criteria

- Invalid Feature Grid image and CTA URLs are visible with inline editor
  feedback and are not rendered publicly.
- Decorative emoji icons are marked `aria-hidden="true"`.
- Feature Grid Advanced mode no longer offers misleading duplicated editable
  token controls already owned by Visual.
- `TASK-267` task docs point residual shared rows at this task instead of
  claiming they are already closed.
