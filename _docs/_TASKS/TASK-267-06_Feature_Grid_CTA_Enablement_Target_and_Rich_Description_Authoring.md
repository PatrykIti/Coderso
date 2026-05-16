# TASK-267-06: Feature Grid CTA Enablement, Target, and Rich Description Authoring

# FileName: TASK-267-06_Feature_Grid_CTA_Enablement_Target_and_Rich_Description_Authoring.md

**Priority:** Medium
**Category:** Widgets + Feature Grid + Schema + Runtime Render + Admin UI + Security
**Estimated Effort:** Large
**Dependencies:** TASK-256-06-02, TASK-267-04
**Status:** To Do

---

## Overview

Improve Feature Grid card authoring with explicit CTA enablement, a safe
user-facing target option, and bounded rich description support.

This leaf does not own missing `rel="noopener noreferrer"` for external links;
TASK-256-06-02 owns the shared renderer safety. TASK-267-06 may expose a
product-level target preference only after the shared safe-link helper exists.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:315-322` - BF-08/BF-10.
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:330-331` - BF-13.
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:392-397,399,405` - priority
  summary.
- `core/widgets/core/richTextSection.tsx` owns existing rich text sanitization
  helpers that must be reused if HTML descriptions are allowed.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/featureGrid.tsx` | Add bounded CTA mode/target and rich-description fields only with safe defaults and sanitizer reuse. |
| `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` | Add per-card CTA enable toggle, target select, and bounded rich description editor or formatting controls. |
| `core/widgets/core/widgetSafeHref.ts` | Reuse TASK-256 helper; change only if a shared target/rel resolver is already in scope. |
| `tests/vitest/widgets/featureGrid.test.tsx` | Cover CTA enable/disable, target/rel output through shared helper, and sanitized rich description output. |
| `tests/vitest/widgets/widgetSafeHref.test.ts` | Update only if shared link helper changes. |
| `tests/vitest/ui/feature-grid-editor-wave.test.tsx` | Cover CTA toggle/target controls and rich description editor updates. |
| `tests/unit/widgets/validator.test.ts` | Update when schema/defaults change. |
| `_docs/_WIDGETS/FEATURE_GRID.md` | Document CTA and rich description behavior. |
| `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md` | Record fixed/deferred status for BF-08/BF-10/BF-13. |

## Implementation Pseudocode

```tsx
type FeatureGridCtaTarget = "same-tab" | "new-tab";
type FeatureGridDescriptionMode = "plain" | "rich";

type FeatureGridItem = {
  ctaEnabled?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
  ctaTarget?: FeatureGridCtaTarget;
  description?: string;
  descriptionMode?: FeatureGridDescriptionMode;
};

function normalizeFeatureGridItem(item: FeatureGridItem): FeatureGridItem {
  const ctaEnabled = item.ctaEnabled ?? Boolean(item.ctaLabel || item.ctaHref);
  return {
    ...item,
    ctaEnabled,
    ctaTarget: item.ctaTarget === "new-tab" ? "new-tab" : "same-tab",
    descriptionMode: item.descriptionMode === "rich" ? "rich" : "plain",
    description: resolveOptionalString(item.description),
  };
}

function renderDescription(item: FeatureGridItem) {
  if (item.descriptionMode === "rich") {
    return <div dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(item.description) }} />;
  }
  return <p>{item.description}</p>;
}

function resolveFeatureGridCtaAttrs(item: FeatureGridItem) {
  if (!item.ctaEnabled) return null;
  return resolveWidgetLinkAttrs(item.ctaHref, { target: item.ctaTarget });
}
```

Error handling:

- CTA disabled state must preserve label/href draft values unless the user clears
  them explicitly.
- `new-tab` must never bypass TASK-256 safe rel behavior.
- Rich description must reuse the existing sanitizer policy; do not add raw HTML
  output without allowlisted tags and tests.
- Unknown enum values fall back to `same-tab` and `plain`.

## Security Contract

No API routes are added, but this leaf touches public HTML/link output.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing.
- Reject-unknown validation: new item fields must be schema-backed and reject
  unknown enum values.
- Anti-abuse: rich descriptions must be sanitized with the existing post/rich
  text policy; CTA URLs must use the shared safe-href/rel helper; no scripts,
  inline event handlers, raw iframes, or unbounded attributes.
- Secret handling: no secrets or privileged URLs in diagnostics or browser
  storage.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/featureGrid.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/feature-grid-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts` if link
  helper behavior changes.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run scan:security:strict` before closure because this leaf affects public
  link/rich-text output.

## Documentation Updates Required

- `_docs/_WIDGETS/FEATURE_GRID.md`
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md`
- `_docs/_TASKS/TASK-267-06_Feature_Grid_CTA_Enablement_Target_and_Rich_Description_Authoring.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- CTA visibility is controlled by an explicit editor affordance, not only by
  clearing two text fields.
- Target behavior is user-visible and safe-link enforced.
- Rich descriptions are sanitized, tested, and bounded to concise card copy.
- Existing plain descriptions remain backward compatible.
