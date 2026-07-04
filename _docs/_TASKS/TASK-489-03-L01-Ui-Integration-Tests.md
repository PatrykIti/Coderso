# TASK-489-03-L01: Vitest UI-Integration Tests
# FileName: TASK-489-03-L01-Ui-Integration-Tests.md

**Parent Subtask:** TASK-489-03
**Priority:** Medium
**Category:** Solution Kits / Admin UI / Tests
**Estimated Effort:** Small–Medium
**Dependencies:** TASK-489-01 + TASK-489-02 (the rendered surfaces). Mocks `core/admin/services/solutionKitsClient.ts` at the module boundary.
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Author the Vitest **ui-integration** suite that proves the wiring:
  history renders, run selection drives detail drill-down, write controls gate on
  `solution-kits:write`, apply sends the right args, and **rollback only fires
  after an explicit confirm** with the resolved source run id.
- **Owning module(s) to create-or-extend:**
  - Create `tests/vitest/ui-integration/solution-kits-runs.test.tsx`.
  - Optionally create `tests/vitest/admin/solutionKitRunFormatting.test.ts` for the
    pure formatting helpers (fast, no render).
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md` (lane selection: Vitest for
  admin-UI render flows), `_docs/CMS_API.md` (run/item/apply/rollback shapes the
  fixtures mirror), `_docs/ASSISTANT_SITE_BUILDER.md`.
- **Out of scope:** route/security Bun tests (the routes are not changed; existing
  `tests/integration/routes/solutionKitsRoutes.test.ts` covers them), and the
  legacy-page test reconciliation (TASK-489-03-L02).

---

## Security Contract

Not a route/auth/data leaf itself (it is a test module). It **verifies** the
Security-Contract behavior of 01/02 and must assert:

- Write controls (Install / Dry-run / Roll back) are **absent/disabled** when the
  permission snapshot lacks `solution-kits:write`, and present when it has it
  (`useAdminAuth().can` driven by the render harness's user/permission fixture).
- The UI calls `solutionKitsClient` functions (mocked), never a raw `fetch` — the
  test mocks the client module, so any bypass would surface as an un-mocked
  network call / unexpected behavior.
- **Rollback is never invoked before confirm** — the strongest safety assertion.

---

## Implementation Pseudocode

### Fixtures (mirror the verified client types)

```ts
const apply1: SolutionKitInstallRunRecord = {
  id: "run-apply-1", kitId: "automotive-workshop", mode: "apply", status: "success",
  actorId: "user-1", rollbackOfRunId: null, options: {},
  summary: { total: 3, success: 3, failed: 0, planned: 0, skipped: 0,
    operations: { create: 3, update: 0, noop: 0, delete: 0, restore: 0 } },
  error: null, createdAt: "2026-06-01T10:00:00.000Z", updatedAt: "...", finishedAt: "...",
};
const dryRun1: SolutionKitInstallRunRecord = { ...apply1, id: "run-dry-1", mode: "dry_run" };
const item1: SolutionKitInstallItemRecord = {
  id: "item-1", runId: "run-apply-1", position: 0, resourceType: "page",
  resourceKey: "home", operation: "create", status: "success",
  beforeSnapshot: null, afterSnapshot: { title: "Home" }, rollbackAction: { type: "delete" },
  error: null, createdAt: "...", updatedAt: "...",
};
```

### Mock the client boundary

```ts
vi.mock("@/services/solutionKitsClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/solutionKitsClient")>();
  return {
    ...actual,
    listSolutionKitRunsCached: vi.fn(async () => [apply1, dryRun1]),
    getSolutionKitRunCached: vi.fn(async () => ({ run: apply1, items: [item1] })),
    applySolutionKit: vi.fn(async () => ({ run: { ...apply1, id: "run-apply-2" }, items: [item1], summary: apply1.summary })),
    rollbackSolutionKit: vi.fn(async () => ({ run: { ...apply1, id: "run-rb-1", mode: "rollback", rollbackOfRunId: "run-apply-1" }, items: [item1], summary: apply1.summary })),
  };
});
```

### Test harness (repo idiom: happy-dom + `createRoot` + `React.act`)

The bulk of this suite is **interactive** (run selection drives detail, snapshot
toggle, write-control clicks, confirm-gated rollback), so it uses the repo's real
ui-integration idiom — **not** `renderAdminUi`, which is `renderToString` SSR (no
effects, no DOM, no events) and would render `useSolutionKitRuns`'s initial empty
state (the hook populates `runs` only from a mount `useEffect`, with no synchronous
cache priming). There is **no `@testing-library`** in the repo — no `render` /
`waitFor` / `findBy*` / `fireEvent`. Mirror
`tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx`:

```ts
// @vitest-environment happy-dom
import React from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mount via createRoot inside React.act; drive the permission fixture so
// useAdminAuth().can("solution-kits:write") returns the desired value per test
// (provide the auth context / mock the provider as the sibling suites do).
const mount = (canWrite: boolean) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => { root.render(<SolutionKitsPageHarness canWrite={canWrite} />); });
  return { container, cleanup: () => { React.act(() => root.unmount()); container.remove(); } };
};

// Effects fetch on mount, so drain microtasks between act passes (no waitFor):
const flush = async () => {
  await React.act(async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); });
};

// Interactions dispatch real DOM events inside React.act:
const click = (el: Element | null | undefined) =>
  React.act(() => { el?.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
const toggle = (el: HTMLInputElement | null | undefined) =>
  React.act(() => { if (el) { el.checked = !el.checked; el.dispatchEvent(new Event("change", { bubbles: true })); } });
```

### Test cases

**Interactive** (`mount(canWrite)` → `await flush()` → `click(...)` → `await flush()`
→ assert via `container.querySelector` / `textContent` / mocked-client call args):

```ts
test("history lists runs for the selected kit");                 // after flush: rows for apply + dry_run (mode/status/summary)
test("selecting a run loads its item trace");                    // click row → getSolutionKitRunCached called; item resourceKey + badges
test("snapshot inspector toggles read-only JSON");               // click toggle → afterSnapshot revealed; null beforeSnapshot → no toggle
test("dry run calls apply with dryRun:true");                    // click Dry-run → applySolutionKit arg assertion
test("install calls apply with dryRun:false");                   // click Install → applySolutionKit arg assertion
test("rollback is NOT called until confirm");                    // click Roll back opens dialog; assert rollbackSolutionKit NOT yet called
test("confirm calls rollback with resolved sourceRunId");        // click confirm → rollbackSolutionKit("automotive-workshop", { sourceRunId: "run-apply-1", continueOnError: true })
test("mutation error surfaces and dialog stays open on failure");// mock rollbackSolutionKit rejects → dialog stays mounted + error text
```

**Static markup only** (no interaction) — this case may use `renderAdminUi`
(`renderToString`) since it depends solely on the synchronous `canWrite` gate,
not on any effect; assert the rendered HTML string, make no interaction claim:

```ts
test("write controls hidden without solution-kits:write");       // SSR html omits Install / Dry-run / Roll back; shows the permission note
```

**Error handling under test:** mock the client functions to reject and assert the
destructive alert / dialog-stays-open behavior inside `await React.act(...)`;
assert no unhandled rejection.

**Async note:** because the hook fetches on mount via effects, `await flush()`
(the `await React.act(async () => …)` microtask drain above) after mount and after
each interaction — the repo has **no** `waitFor` / `findBy*`.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/solution-kits-runs.test.tsx`
- (optional) `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin/solutionKitRunFormatting.test.ts`
- Do not regress `tests/vitest/ui/solution-kits-page.test.tsx` (reconciled in
  03-L02) or `tests/vitest/admin/solutionKitsClient.test.ts`.
- No DB migration artifacts (test-only leaf).
</content>
