# TASK-479-21: Solution Kits Screen Migration
# FileName: TASK-479-21-Solution-Kits-Screen.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Solution Kits
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Task:** TASK-479
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Port the finished visual-redesign prototype of the Solution Kits gallery into the
REAL admin Solution Kits screen. This is a **visual restyle only**: the soft &
friendly (Notion-like) design language — VIOLET accent, `rounded-2xl` cards, soft
shadows, warm neutrals, light default + dark toggle — is applied to the existing
Solution Kits surface while the real kit catalog data, kit-selection wiring, the
Reviewed Site Builder assistant handoff, RBAC, and cache contract stay exactly as
they are.

- **Goal:** Make the real Solution Kits screen look like the prototype — a
  violet **featured banner** ("Launch a full site in minutes", AI-assembled
  badge) over a soft **kit card grid** (icon tile with per-kit tone, includes
  badges, active/selected state) — without changing kit selection semantics, the
  reviewed assistant flow, endpoints, or the cache contract.
- **Owning module/service:** `core/admin/ui/kits/**`
  (`SolutionKitsPage.tsx`, `SolutionKitCard.tsx`,
  `hooks/useSolutionKits.ts`, `hooks/useSolutionKitRuns.ts`), reusing
  `core/admin/ui/shared/PageHeader.tsx`, `core/admin/ui/layouts/AdminShell.tsx`,
  and `core/admin/components/ui/*` (restyled in TASK-479-06).
- **Source-of-truth docs:** `_docs/SOLUTION_KITS.md`,
  `_docs/ASSISTANT_SITE_BUILDER.md` (reviewed intake flow), `_docs/DESIGN_TOKENS.md`,
  `_docs/_PROTOTYPE/README.md`, `_docs/_PROTOTYPE/src/styles/theme.css`. Prototype
  reference screen: `_docs/_PROTOTYPE/src/pages/advanced/SolutionKitsPage.tsx`.
- **Out of scope:** Any change to the Solution Kits API, `solutionKitsClient`
  (`listSolutionKitsCached`, `getSolutionKitCached`), the cache contract
  (`cacheKeys.solutionKitsList`, `cacheKeys.solutionKitDetail`, `cachePolicy`
  TTLs, `cacheBus`), `solutionKitSelection` persistence (localStorage key +
  selection events), the `useSolutionKitRuns` run history, RBAC, or the reviewed
  Site Builder assistant handoff (`openAssistantPanel`). Crucially, do NOT
  introduce a real "Apply kit"/install action — the prototype's "Apply kit"
  affordance is purely visual; the real screen keeps kit selection read-only and
  routes full-site generation through the reviewed assistant intake (see L01).

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). The screen continues to read kit summaries
and details through `listSolutionKitsCached` / `getSolutionKitCached` and to
persist the active kit through `solutionKitSelection` (localStorage); no client
cache, log, or debug payload gains new fields, and the reviewed-flow gating
(selection stays read-only until the assistant handoff) is unchanged.

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-479-21-L01 | Solution Kits Gallery Restyle | ⏳ To Do |
| TASK-479-21-L02 | Solution Kits Tests | ⏳ To Do |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/solution-kits-page.test.tsx tests/vitest/admin/solutionKitSelection.test.ts tests/vitest/admin/solutionKitsClient.test.ts`
- New restyle suite added in L02 (see that leaf for the exact path), run with the
  same `NODE_ENV=test vitest run --config vitest.config.ts <suite>` form.
- All pre-existing Solution Kits Vitest suites must stay green (the restyle must
  not alter observable hydration, kit selection, the reviewed-flow CTA, or the
  selected-kit detail panel).

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board (move this subtask + leaves through the
  status buckets) and the Statistics block on every status change.
- On closure, add a `_docs/_CHANGELOG/` entry linking `TASK-479` and the closed
  leaf id(s).
- Note the new design language on the Solution Kits surface in
  `_docs/SOLUTION_KITS.md` only if a user-visible affordance label changes; do not
  document behavior changes (there are none).
