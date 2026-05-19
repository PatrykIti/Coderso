# TASK-313-01: Logo Cloud Shared Editor Truthfulness Residuals

# FileName: TASK-313-01_Logo_Cloud_Shared_Editor_Truthfulness_Residuals.md

**Priority:** High
**Category:** Widgets + Logo Cloud + Shared Contract + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-313
**Status:** Done (2026-05-19)

---

## Overview

Finish the Logo Cloud shared editor-mode and shared link-input truthfulness
repairs that were routed to `TASK-256-01` and `TASK-256-06-02` but are still
missing in the live checkout.

This leaf covers only the current shared contract for existing fields:

- duplicated Advanced controls that should no longer pretend to be a second
  editable owner for the same Visual style fields;
- shared safe-link feedback for the existing per-logo `href` inputs.

It must not add product-only authoring such as per-logo `alt`, MediaPicker,
thumbnail previews, target toggles, CTA composition, or drag-and-drop item
management.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md` - rows `UX-07` and `BF-10`
  capture the shared editor residuals this leaf closes.
- `_docs/_TASKS/TASK-256-01_Shared_Editor_Mode_and_Atomic_Update_Contract.md`
  - shared Advanced ownership already closed on paper and must be reflected in
  the live owner.
- `_docs/_TASKS/TASK-256-06-02_CTA_Banner_Logo_Cloud_and_Gallery_Media_Links.md`
  - Logo Cloud shared link-feedback belongs to the shared contract, while image
  preview/unavailable feedback stays in `TASK-274-02`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/LogoCloudEditors.tsx` | Remove or downgrade duplicated Advanced controls for current shared fields so Advanced becomes technical/read-only for Logo Cloud, and add truthful shared safe-link feedback for existing `Link URL` inputs without widening into `TASK-274` product controls. |
| `tests/vitest/ui/logo-cloud-editor-wave.test.tsx` | Replace duplicate-control expectations with coverage for the settled shared contract: Advanced no longer owns the same fields as Visual, and Logo Cloud link inputs surface safe shared validation feedback. |
| `_docs/_WIDGETS/LOGO_CLOUD.md` | Document the settled shared mode ownership and current link-input truthfulness baseline. |
| `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md` | Record fixed/deferred status for UX-07 and the shared BF-10 slice under the reopened shared family. |

## Implementation Pseudocode

```tsx
function resolveLogoLinkFeedback(href: string | undefined) {
  if (!href?.trim()) return null;
  const safeHref = normalizeWidgetSafeHref(href, {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
  });
  if (safeHref) return null;
  return "Use a relative path, hash, or full URL. Unsafe links are not rendered publicly.";
}

function LogoCloudAdvancedEditor() {
  return (
    <EditorSection
      title="Technical layout diagnostics"
      description="Read-only summary of shared Logo Cloud tokens and normalization state."
    >
      <DiagnosticsSnapshot value={normalized} />
      <dl>{/* summarize logoHeight / gap / alignment instead of duplicating live controls */}</dl>
    </EditorSection>
  );
}
```

Error handling:

- Shared link feedback must reflect the current runtime safe-href policy without
  inventing a second validator contract inside `TASK-274`.
- Advanced must not keep live duplicate controls for fields that Visual already
  owns; if a diagnostic is still useful, keep it read-only or summary-only.
- Empty or whitespace-only link values remain allowed and must not render a
  warning.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: unchanged authenticated admin editing.
- RBAC: unchanged page/template/widget write permission.
- CSRF: unchanged admin write route protection.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: unchanged. This leaf must use the current schema
  only and cannot introduce new product fields.
- Anti-abuse: feedback copy must not expose provider diagnostics, signed URLs,
  or unsafe-link bypasses.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/LOGO_CLOUD.md`
- `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md`
- `_docs/_TASKS/TASK-313-01_Logo_Cloud_Shared_Editor_Truthfulness_Residuals.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Advanced no longer pretends to own the same current shared style fields as
  Visual.
- Existing Logo Cloud link inputs expose truthful shared safe-link feedback
  without widening into product-only target/CTA controls.
- `TASK-274-02` can focus on image preview/media authoring instead of redoing
  shared link validation.

## Completion Notes

- 2026-05-19: Advanced duplicate `logoHeight`, `gap`, and `alignment` controls
  were replaced with diagnostics-only summaries, and Visual `Link URL` inputs
  now show shared safe-link feedback for invalid values.
- Validation:
  - `bun run test:vitest -- tests/vitest/ui/logo-cloud-editor-wave.test.tsx tests/vitest/widgets/logoCloud.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
