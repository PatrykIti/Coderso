# TASK-312-03: Gallery Mosaic Shared Residual Closure

# FileName: TASK-312-03_Gallery_Mosaic_Shared_Residual_Closure.md

**Priority:** Medium
**Category:** Widgets + Gallery Mosaic + Shared Contract + Playwright QA + Documentation
**Estimated Effort:** Medium
**Dependencies:** TASK-312-01, TASK-312-02, TASK-256-08
**Status:** Done (2026-05-18)

---

## Overview

Close the reopened Gallery Mosaic shared residual family with report evidence,
widget docs, board sync, changelog, and final validation.

Current checkout note: this leaf remains the closure record for the shared
reopen. The later `TASK-270` product rollout is now also closed in the live
checkout, so references below to future `TASK-270` work are reopen-time
boundaries only.

This leaf must explicitly distinguish:

- residual shared-contract repairs landed under `TASK-312`;
- Gallery-local product work that still belongs to `TASK-270`;
- already fixed shared rows that should not be claimed twice.

## Source Findings

- Entire `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md`
- `TASK-312` umbrella plus `TASK-312-01` and `TASK-312-02`
- `TASK-270` umbrella and leaves, to ensure the boundary stays intact
- `TASK-256-08` closure docs that previously marked the shared work as done

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md` | Add fixed/deferred textual evidence for reopened shared rows and keep product rows routed to `TASK-270`. |
| `_docs/_WIDGETS/GALLERY_MOSAIC.md` | Reflect the final shared baseline before product follow-ups continue. |
| `_docs/_TASKS/TASK-312*.md` | Mark the reopened shared leaves with final status, dates, validation notes, and evidence. |
| `_docs/_TASKS/README.md` | Sync the board and statistics. |
| `_docs/_CHANGELOG/{N}-2026-05-18-task-312-gallery-mosaic-shared-residuals.md` | Add the changelog entry. |
| `_docs/_CHANGELOG/README.md` | Add the changelog index row. |

## Implementation Pseudocode

```ts
type GalleryMosaicSharedResidualStatus =
  | "fixed-task-312"
  | "fixed-task-256"
  | "task-270-product-scope"
  | "deferred";

const residualFindingMap = [
  { id: "UX-01", status: "fixed-task-312" },
  { id: "UX-07", status: "fixed-task-312" },
  { id: "BF-01", status: "task-270-product-scope" },
];

function assertEverySharedResidualMapped(findings: string[]) {
  const missing = findings.filter((id) => !residualFindingMap.some((item) => item.id === id));
  if (missing.length > 0) throw new Error(`Unmapped Gallery Mosaic shared residuals: ${missing.join(", ")}`);
}
```

Closure checklist:

- Re-read the report, `TASK-312`, and `TASK-270`.
- Verify reopened shared rows are recorded under `TASK-312`, not backfilled into
  `TASK-256` as if they had already landed.
- Verify product rows still routed to `TASK-270` are not falsely marked fixed.
- Verify board stats and changelog numbering stay monotonic.
- Paste exact final validation results into this leaf.

## Security Contract

No API routes are added by this closure leaf.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: closure must verify no product-field schema creep
  landed inside the shared residual family.
- Anti-abuse: closure must verify safe media/link semantics still hold.
- Secret handling: report/docs/changelog must not include secrets, provider
  keys, or private media tokens.

## Testing Requirements

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/galleryMosaic.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md`
- `_docs/_WIDGETS/GALLERY_MOSAIC.md`
- `_docs/_TASKS/TASK-312*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/{N}-2026-05-18-task-312-gallery-mosaic-shared-residuals.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

- Gallery Mosaic shared prerequisites are explicitly closed under `TASK-312`.
- `TASK-270` can proceed without depending on false shared-closure assumptions.
- Final validation and report evidence distinguish shared residual repairs from
  Gallery-local product work.

## Completion Notes

- 2026-05-18: `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md`,
  `_docs/_WIDGETS/GALLERY_MOSAIC.md`, `_docs/_TASKS/README.md`, and the new
  changelog entry now all point to `TASK-312` as the owner for reopened shared
  residual repairs.
- The later `TASK-270` product rollout has since landed and is now tracked by
  its own closed family. This leaf remains the closure record for the shared
  reopen only.
- Final validation:
  - `git diff --check`
  - `set -a && source /Users/pciechanski/Documents/_moje_projekty/Coderso/.env && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx tests/vitest/widgets/galleryMosaic.test.tsx tests/vitest/widgets/renderer.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run gates:coderso`
  - `bun run scan:security:strict`
  - `bun run precommit`
