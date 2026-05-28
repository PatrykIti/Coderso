# TASK-342-02-03: CTA Banner Visual Control Path Ownership

# FileName: TASK-342-02-03_CTA_Banner_Visual_Control_Path_Ownership.md

**Priority:** High
**Category:** Widgets + Admin UI + Playwright + QA
**Estimated Effort:** Small
**Dependencies:** TASK-342-01, TASK-342-02
**Status:** In Progress (2026-05-28)

---

## Overview

Repair the `cta-banner` metadata-gap by making the flagged Visual color and
background controls emit truthful persisted-path ownership metadata while
preserving the current Hero-style swatch-first UX.

## Source Findings

- `_docs/PLAYWRIGHT/27-05-2026/REPORT_CTA_BANNER_WIDGET.md`
- `core/admin/ui/widgets/editors/CtaBannerEditors.tsx`
- `tests/vitest/ui/cta-banner-editor-wave.test.tsx`
- `tests/vitest/widgets/ctaBanner.test.tsx`

Current local evidence:

- Public runtime passes.
- The metadata-gap is limited to Visual controls in:
  - `cta-banner.visual.colors-borders`
  - `cta-banner.visual.background-motion`

Flagged persisted fields:

- `style.text`
- `style.badgeBackground`
- `style.badgeText`
- `style.primaryButtonBg`
- `style.primaryButtonText`
- `style.primaryButtonBorder`
- `style.secondaryButtonBg`
- `style.secondaryButtonText`
- `style.secondaryButtonBorder`
- `style.border`
- `background.color`
- `background.gradient`

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` | Add truthful `path` ownership to the flagged Visual controls or migrate them to a shared path-aware color/control seam. |
| `core/admin/ui/widgets/editors/SharedColorControl.tsx` | Touch only if CTA Banner is migrated to the shared path-aware color-control seam. |
| `core/admin/ui/widgets/editors/ClearableFields.tsx` | Touch only if a shared swatch-summary helper needs a small extension. |
| `tests/vitest/ui/cta-banner-editor-wave.test.tsx` | Add a strict assertion that the flagged Visual controls now expose persisted paths. |
| `tests/vitest/widgets/ctaBanner.test.tsx` | Extend only if contract-visible behavior changes. |

## Implementation Pseudocode

```ts
function CtaBannerColorField({
  id,
  path,
  label,
  ...
}: {
  id: string;
  path: string;
  ...
}) {
  return <WidgetControlRow id={id} path={path} label={label} actions={...}>{...}</WidgetControlRow>;
}

path="style.text"
path="style.badgeBackground"
path="style.badgeText"
path="style.primaryButtonBg"
path="style.primaryButtonText"
path="style.primaryButtonBorder"
path="style.secondaryButtonBg"
path="style.secondaryButtonText"
path="style.secondaryButtonBorder"
path="style.border"
path="background.color"
path="background.gradient"

test("cta banner visual controls expose persisted widget paths", async () => {
  const controls = collectWritableControls("cta-banner", "visual");
  expect(controls).toContainEqual({ id: "cta-banner.style.text", path: "style.text" });
  expect(controls).toContainEqual({
    id: "cta-banner.background.gradient",
    path: "background.gradient",
  });
});
```

Data flow:

- Keep persisted CTA Banner data unchanged.
- Repair ownership metadata at the DOM/control-wrapper layer only.

Error handling:

- Preserve current transparent/theme-default behavior for button and background
  fields.
- Do not regress the existing swatch-only beginner UX by bringing back raw
  token text inputs.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/cta-banner-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/ctaBanner.test.tsx`
- targeted `playwright-cli` replay or single-widget smoke proving
  `cta-banner` no longer reports `metadata-gap`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/27-05-2026/REPORT_CTA_BANNER_WIDGET.md` when the
  metadata-gap is closed or superseded.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- `cta-banner` no longer reports `metadata-gap` in the targeted rerun.
- The flagged Visual controls expose truthful persisted paths.
- Existing CTA Banner swatch/clear/transparent UX remains intact.
