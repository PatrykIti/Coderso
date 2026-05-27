# TASK-339-08: Gallery Mosaic Contract Truthfulness

# FileName: TASK-339-08_Gallery_Mosaic_Contract_Truthfulness.md

**Priority:** High
**Category:** Widgets + Admin UI + UX Contract + Playwright
**Estimated Effort:** Large
**Dependencies:** TASK-339-01
**Status:** To Do
**Owners:** Codex implementation/tests/docs; Claude Playwright UI review

---

## Overview

Make `gallery-mosaic` contract metadata match the richer editor that already
ships.

## Source Findings

- `core/.tmp/widget_contract_diff.jsonl` shows `gallery-mosaic` renders
  `Visual=7`, `Advanced=4` while the contract still declares `Visual=2`,
  `Advanced=1`.
- The current UI already exposes media structure, interactions, overlays,
  density, and motion separately; the contract simply does not tell the truth.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` | Add truthful section ids/roles that match the live UI. |
| `core/widgets/core/galleryMosaic.tsx` | Replace the stale contract with the true rendered section inventory. |
| `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx` | Cover the truthful ids/titles/roles and keep the richer editor green. |
| `tests/vitest/widgets/galleryMosaic.test.tsx` | Keep widget-local editor/runtime behavior green. |
| `tests/vitest/ui/widget-template-editor.test.tsx` | Update section-title expectations. |
| `_docs/_WIDGETS/GALLERY_MOSAIC.md` | Document the truthful daily IA. |

## Implementation Pseudocode

```tsx
// Keep the current rendered UI, but make ids/roles/contracts truthful.
variant and media structure
header copy
media items and links
interaction
overlay and caption controls
layout style
density and motion
```

Data flow:

- Preserve the current richer UI and media/link behavior.
- Align the contract and stable DOM metadata to that UI.

Error handling:

- Keep `Advanced` read-only.
- Do not regress to the coarse two-section contract.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged widget schema.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx tests/vitest/widgets/galleryMosaic.test.tsx tests/vitest/ui/widget-template-editor.test.tsx`
- Claude headless Playwright review for `gallery-mosaic` against the `hero` baseline

## Documentation Updates Required

- Update this task file with accepted/rejected Claude findings.
- Update `_docs/_TASKS/README.md` on status changes.
- Update `_docs/_WIDGETS/GALLERY_MOSAIC.md`.
- Add a changelog entry and update `_docs/_CHANGELOG/README.md` when the leaf moves to Done.

## Acceptance Criteria

- Gallery Mosaic keeps the richer current UI.
- Rendered section ids/titles/roles and `editorContract` match exactly.
