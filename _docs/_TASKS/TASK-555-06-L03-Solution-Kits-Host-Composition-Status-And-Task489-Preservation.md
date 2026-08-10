# TASK-555-06-L03: Solution Kits Host Composition Status and TASK-489 Preservation
# FileName: TASK-555-06-L03-Solution-Kits-Host-Composition-Status-And-Task489-Preservation.md

**Parent Subtask:** TASK-555-06
**Priority:** High
**Category:** Admin UI / Lifecycle / Integration
**Estimated Effort:** Large
**Status:** ⏳ To Do
**Dependencies:** landed TASK-555-05-L03, TASK-555-04-L03, and TASK-555-03-L03 receipts

---

## Overview

Compose curated discovery/review/lifecycle regions into Solution Kits while
preserving terminal TASK-489 operations as an independent all-runs surface. Both the
curated rollback control and TASK-489's direct history rollback must now reach the same
server-verified composite, so UI composition cannot expose a lineage bypass.

## Sub-Tasks

None; this is an executable leaf.

## Scope and Exact Single-Writer Files

Replace the existing six-card legacy grid with 04's `discovery` region after the page
hero, making the seven-entry curated registry the sole card surface. Reuse the legacy
active-navigation selection callback for the six catalog IDs; FormaDom never becomes
a legacy active kit. Insert `review` before operational history and `lifecycle` beside
the selected starter status. Preserve terminal TASK-489 history/detail/exact rollback.
Sole writer: `core/admin/ui/kits/SolutionKitsPage.tsx`, new
`core/admin/ui/kits/hooks/useCuratedStarterLifecycle.ts`, new
`core/admin/ui/kits/curated/CuratedStarterLifecycle.tsx`,
`tests/vitest/ui/solution-kits-page.test.tsx`, and
`tests/vitest/ui-integration/solution-kits-curated-host.test.tsx`.

## Forbidden Paths

TASK-489 components/hooks/client, Setup/client/server/DB/artifacts, all forbidden task
families/indexes/changelogs/workflows/smokes/root/TMP.
Terminal TASK-545/TASK-548 files and the tracked TASK-555 workflow are read-only.

## Security Contract

Internal strict client only. Permission gating is defense in depth; server owns RBAC.
Mutations use shared CSRF/admin_write, status uses admin_read. TASK-489 exact rollback
remains its sole dispatcher. No package/snapshot/raw key/claim/actor is persisted or
rendered; safe relative Open-site paths only.

## Implementation Pseudocode

```tsx
<CuratedStarterDiscoverySlot />
<CuratedStarterReviewSlot />
<SolutionKitRunOperationsPanel />
<CuratedStarterLifecycleSlot />
```

The removed legacy grid is not rendered elsewhere or wrapped behind a second tab.
Every registry ID has exactly one card and one selected detail/review state.

Selection -> cached detail/status -> preview/apply callbacks -> lifecycle refresh;
TASK-489 history remains independently mounted. Request tokens prevent stale selection
updates. Failures preserve current selection/history and show safe retry state.
Status uses only `solutionKits:curated:status:v1:<starterId>` at `15_000 ms`, never
negative-caches, and cannot background-overwrite a dirty/uncertain lifecycle state.
Committed apply/validate/rollback invokes L04's exact curated plus TASK-489
invalidation matrix before authoritative refresh.
`useCuratedStarterLifecycle` owns one memory-only idempotency key per current
starter/preview attempt. It reuses that key after timeout/unknown outcome and
same-preview retry, rotates it only for a new preview or terminally settled new
attempt, and never writes it to cache/storage/URL/log/DOM.

The lifecycle region renders all three exact rollback outcomes. `success` refreshes
the new predecessor/not-installed head and may expose effective settings. `failed` and
`recovery_required` retain the selected source/history and expose no effective settings.
Failed shows bounded safe code and terminal counters, explains that no rollback change
remains, refreshes authoritative status/history, and then enables a fresh exact retry;
it does not resume the terminal failed owner. Recovery shows the safe code and explicit
pending summary without invented counters, keeps mutation disabled, and directs the
administrator to inspect/resume the same reservation/engine owner. Neither branch
triggers a second restore or audit; only recovery forbids a fresh dispatch. A response
lost after dispatch reuses the current attempt until the server proves terminal failed
or success.

A failed apply follows the same authority split: after the server proves zero net and
clears pending apply, the host refreshes status and requires a new preview plus fresh
memory-only idempotency attempt. `curated_starter_reconciliation_required` keeps the
current preview/source context locked for reconciliation and never offers a fresh Apply.

This host must render route-local controls with the exact control identities frozen by
TASK-555-03-L03's terminal TASK-414 source descriptors. Solution Kits controls bind
`routeId:"core.advanced.solution-kits"`; no component invents a title/path-derived ID.
The focused host suite joins rendered callbacks to those descriptors and to the cache
descriptor ID `core:solution-kits/curated-starter-admin-cache`; it does not import or
interpret the final generated CMS capability artifact.

## Error Handling

Selection races are ignored by token; lifecycle failures preserve TASK-489 history and
current selection. Only proven zero-net terminal failure becomes fresh-retryable;
recovery/reconciliation remains bound to the existing owner.

## Testing Requirements

Test slot order, each of seven starter IDs rendered exactly once, legacy activation
callback preservation with FormaDom excluded from legacy selection, status/checklist/validate, TASK-489 history and
rollback still visible/functional, provider-offline availability, permissions,
selection race, stable uncertain-retry idempotency key plus rotation boundaries,
Open site, light/dark/narrow layout, focus, exact descriptor/control/cache parity, all
three rollback outcomes, terminal-failed fresh-retry versus recovery same-owner context,
and no duplicate rollback engine. Failed tests require authoritative refresh before a fresh exact retry and prove
the old terminal owner is not resumed; recovery keeps the same owner, disables fresh
retry, preserves `summary:null`, and resumes only through server recovery. Apply tests
likewise distinguish zero-net failed/new-preview retry from reconciliation-required
same-owner lock. A direct history rollback of a curated older non-head renders the server's safe
rejection without removing history; the server DB/route suite owns the full
`C -> B -> A -> null` transition proof.

```bash
NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/solution-kits-page.test.tsx tests/vitest/ui-integration/solution-kits-curated-host.test.tsx
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/admin/ui/kits/SolutionKitsPage.tsx core/admin/ui/kits/hooks/useCuratedStarterLifecycle.ts core/admin/ui/kits/curated/CuratedStarterLifecycle.tsx tests/vitest/ui/solution-kits-page.test.tsx tests/vitest/ui-integration/solution-kits-curated-host.test.tsx
```

All files <=1000 lines.

## Documentation Updates Required

TASK-555-07-L01 owns the documentation/generated-output handoff; L03 is closure
metadata only.
