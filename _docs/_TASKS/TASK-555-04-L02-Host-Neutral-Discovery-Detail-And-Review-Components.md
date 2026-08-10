# TASK-555-04-L02: Host-Neutral Discovery Detail and Review Components
# FileName: TASK-555-04-L02-Host-Neutral-Discovery-Detail-And-Review-Components.md

**Parent Subtask:** TASK-555-04
**Priority:** High
**Category:** Admin UI / Components / Accessibility
**Estimated Effort:** Medium
**Status:** ⏳ To Do
**Dependencies:** landed TASK-555-04-L01 receipt

---

## Overview

Build bounded host-neutral discovery, detail, and review components for both
legacy catalog starters and the FormaDom release.

## Sub-Tasks

None; this is an executable leaf.

## Scope and Exact Single-Writer Files

Create host-neutral components for the additive `discovery` and `review` regions.
Sole writer: `core/admin/ui/kits/curated/CuratedStarterDiscovery.tsx`,
`CuratedStarterDetail.tsx`, `CuratedStarterReview.tsx`,
`curatedStarterHostContract.ts`, and
`tests/vitest/ui-integration/curated-starter-discovery.test.tsx`.

## Forbidden Paths

`SolutionKitsPage.tsx`, Setup, TASK-489 UI, clients/routes/DB/artifacts, all forbidden
task families/indexes/changelogs/workflows/smokes/root/TMP paths.
The terminal TASK-545/TASK-548 files and tracked TASK-555 workflow are read-only.

## Security Contract

Internal normalized DTO props only; no fetch. Host passes permission booleans, but
server RBAC is authoritative. No CSRF/rate concern in presentational code. Render only
bounded labels, relative public paths, seven residuals, and safe codes; no raw HTML,
package, snapshot, path/URL source, actor, token, or secret.

## Implementation Pseudocode

```tsx
export type CuratedStarterHostRegions = Readonly<{
  discovery: ReactNode;
  review: ReactNode;
  lifecycle: ReactNode;
}>;
export function CuratedStarterReview({ detail, preview, onRequestPreview }: Props) {
  return <ReviewSurface residuals={detail.residuals} preview={preview} />;
}
```

Strict DTO props -> accessible cards/detail/residual list/preview summary -> callbacks
owned by host. Empty/loading/error states are explicit. Callback failures remain in
host state; components never log payloads or synthesize server truth.

## Error Handling

Hosts provide explicit loading/empty/error states. Components render safe fallback
copy and never catch/log raw payloads or invent release state.

## Testing Requirements

Test seven cards, FormaDom badge/version/compatibility/resources/exact seven residuals,
local-service-business, light/dark classes, keyboard/focus, loading/error/empty, and
absence of provider/LLM gating.

```bash
NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/curated-starter-discovery.test.tsx
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/admin/ui/kits/curated/*.ts*
```

All touched files <=1000 lines.

## Documentation Updates Required

TASK-555-07-L01 owns the pre-smoke documentation handoff; no docs/index edits occur
here. L03 is closure metadata only.
