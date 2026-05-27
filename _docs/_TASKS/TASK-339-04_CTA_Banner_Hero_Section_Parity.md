# TASK-339-04: CTA Banner Hero Section Parity

# FileName: TASK-339-04_CTA_Banner_Hero_Section_Parity.md

**Priority:** High
**Category:** Widgets + Admin UI + UX Contract + Playwright
**Estimated Effort:** Large
**Dependencies:** TASK-339-01, TASK-336-19
**Status:** To Do
**Owners:** Codex implementation/tests/docs; Claude Playwright UI review

---

## Overview

Rebuild the daily `cta-banner` IA so it stops behaving like a coarse two-bucket
editor and instead follows the `hero` sectioning standard.

## Source Findings

- `core/.tmp/widget_audit_all.jsonl` reports `cta-banner` still renders
  `Visual=2`, `Advanced=1`.
- The current split hides too many concerns behind `Copy and actions` and
  `Presentation`, which is not the way the `hero` widget exposes daily work.
- `core/widgets/core/ctaBanner.tsx` mirrors that coarse contract today, so both
  UI and contract need to move together.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` | Expand `Visual` / `Advanced` into named hero-like sections. |
| `core/widgets/core/ctaBanner.tsx` | Keep `editorContract` truthful to the final rendered sections. |
| `tests/vitest/ui/cta-banner-editor-wave.test.tsx` | Cover the new section metadata and daily IA. |
| `tests/vitest/widgets/ctaBanner.test.tsx` | Keep widget-local editor/runtime behavior green. |
| `tests/vitest/ui/widget-template-editor.test.tsx` | Update `BlockSettings` section-title expectations. |
| `_docs/_WIDGETS/CTA_BANNER.md` | Document the final section ownership. |

## Implementation Pseudocode

```tsx
// target shape, exact titles may change after implementation review
visual: [
  "Variant and layout",
  "Copy",
  "Actions and destinations",
  "Colors and emphasis",
  "Spacing and background",
]
advanced: [
  "Runtime summary",
  "Style diagnostics",
  "Authoring boundaries",
]
```

Data flow:

- Keep existing CTA data paths and destination pickers.
- Only daily IA and matching contract metadata change.

Error handling:

- Do not hide CTA actions back under one generic bucket.
- Keep `Advanced` read-only.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged widget schema.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/cta-banner-editor-wave.test.tsx tests/vitest/widgets/ctaBanner.test.tsx tests/vitest/ui/widget-template-editor.test.tsx`
- Claude headless Playwright review for `cta-banner` against the `hero` baseline

## Documentation Updates Required

- Update this task file with accepted/rejected Claude findings.
- Update `_docs/_TASKS/README.md` on status changes.
- Update `_docs/_WIDGETS/CTA_BANNER.md`.
- Add a changelog entry and update `_docs/_CHANGELOG/README.md` when the leaf moves to Done.

## Acceptance Criteria

- CTA Banner no longer uses the coarse `Visual=2`, `Advanced=1` daily IA.
- CTA Banner daily editing feels sectioned like `hero`, not bucketed.
- Rendered section metadata and `editorContract` stay truthful.
