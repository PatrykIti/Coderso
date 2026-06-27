# TASK-480-05-L03: Builder Tests
# FileName: TASK-480-05-L03-Builder-Tests.md

**Priority:** High
**Category:** Admin UI / Dashboard / Configurable Widgets / Testing
**Estimated Effort:** Medium
**Dependencies:** TASK-480-05-L01 (grid + reducer) · TASK-480-05-L02 (catalog + configure panel)
**Status:** ⏳ To Do
**Started:**
**Completed:**
**Parent Subtask:** TASK-480-05

---

## Overview

Add the Vitest **ui-integration** suite that locks in the Dashboard builder
edit-mode flows — add, remove, arrange, configure, **Save** — and the dirty-state /
cache contract. The layout and content-type clients are **mocked at the client
boundary** (the `dashboardLayoutClient` / `contentTypesClient` modules), NOT via
production fallbacks or real network — so the suite is deterministic and proves the
builder calls the cached client correctly (single hydrate, dirty-guarded
revalidation, Save → cache patch + cacheBus broadcast).

- **Goal:** `tests/vitest/ui-integration/dashboard-builder.test.tsx` exercises the
  builder against mocked layout/content-type clients and asserts: read-mode render,
  Edit toggle, add/remove/arrange/resize mutate the draft + set dirty, configure
  panel schema-driven controls + preview, Save round-trip (one client call, cache
  patch + broadcast, dirty cleared, edit exited), dirty-guarded background update,
  and `dashboard:write` gating.
- **Owning module/service:** `tests/vitest/ui-integration/dashboard-builder.test.tsx`
  (new), exercising `core/admin/ui/dashboard/builder/*` and the
  `core/admin/ui/dashboard/DashboardPage.tsx` integration.
- **Source-of-truth docs:**
  - Render helpers: `tests/utils/adminRouterRender.tsx` (`renderAdminUi`) and the
    `AdminRouterProvider` (`core/admin/ui/contexts/AdminRouterContext`); existing
    ui-integration patterns in `tests/vitest/ui-integration/forms.test.tsx`
  - Boundary to mock: `core/admin/services/dashboardLayoutClient.ts`
    (`getDashboardLayoutCached`, `saveDashboardLayout`), `core/admin/utils/cacheBus.ts`
    (`subscribeCacheBus` / broadcast), `core/admin/services/contentTypesClient.ts`
  - Layout fixtures aligned to `core/services/dashboard/dashboardLayoutSchema.ts`
    (`DashboardLayout`, `DashboardWidgetInstance`) — keep fixtures schema-true
  - `_docs/TESTING_STRATEGY.md` (Vitest = Bun-free admin/UI lane; routes/security
    Bun suites for the API live in TASK-480-02, not here)
- **Out of scope:** Route/security/perf Bun suites (TASK-480-02/03 lanes); widget
  renderer unit tests (TASK-480-04); E2E/Playwright. No real network, no production
  client fallbacks — everything mocks at the client module boundary.

---

## Security Contract

No endpoint or permission model changes. The suite asserts the builder's reliance
on the security/cache contract at the boundary it controls:

- Save flows ONLY through the mocked `saveDashboardLayout` (the cached `PUT`
  wrapper) — the test asserts the builder never issues a raw `fetch`.
- The `dashboard:write` permission gate is asserted (no write perm → no Edit/Save).
- Fixtures carry no secrets; the suite never logs payloads.

---

## Implementation Pseudocode

```tsx
// tests/vitest/ui-integration/dashboard-builder.test.tsx
import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";

import { DashboardPage } from "../../../core/admin/ui/dashboard/DashboardPage";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

// 1) MOCK THE CLIENT BOUNDARY (not production fallbacks, not the network)
const saveDashboardLayout = vi.fn();
const getDashboardLayoutCached = vi.fn();
vi.mock("../../../core/admin/services/dashboardLayoutClient", () => ({
  getDashboardLayoutCached: (...a: unknown[]) => getDashboardLayoutCached(...a),
  saveDashboardLayout: (...a: unknown[]) => saveDashboardLayout(...a),
}));
// content-type options for the configure panel selector
vi.mock("../../../core/admin/services/contentTypesClient", () => ({
  listContentTypesCached: vi.fn(async () => [{ id: "ct1", slug: "post", name: "Post" }]),
}));
// permission gate — default to writer; override per-test
const hasPermission = vi.fn((p: string) => true);
vi.mock("../../../core/admin/ui/hooks/usePermissions", () => ({
  useHasPermission: (p: string) => hasPermission(p),
}));
// observe cacheBus broadcast on save (assert dashboard:layout update is emitted)
const broadcast = vi.fn();
vi.mock("../../../core/admin/utils/cacheBus", async (orig) => ({
  ...(await orig<typeof import("../../../core/admin/utils/cacheBus")>()),
  broadcastCacheEvent: (...a: unknown[]) => broadcast(...a),
}));

const SAVED_LAYOUT = {
  version: 1, columns: 12,
  widgets: [
    { id: "w1", type: "counter", config: { metric: "pages", title: "Pages" }, layout: { x: 0, y: 0, w: 3, h: 1 } },
    { id: "w2", type: "chart",   config: { source: "post", range: "7d" },     layout: { x: 3, y: 0, w: 6, h: 2 } },
  ],
};

const renderPage = () =>
  render(
    <AdminRouterProvider initialPath="/admin">
      <DashboardPage />
    </AdminRouterProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  hasPermission.mockImplementation(() => true);
  getDashboardLayoutCached.mockResolvedValue(SAVED_LAYOUT);
  saveDashboardLayout.mockImplementation(async (layout) => layout); // echo
});

// 2) READ MODE — hydrate ONCE from cache, render hosts, no edit chrome
test("renders saved layout from cache without forcing refetch", async () => {
  renderPage();
  await screen.findByText("Pages");
  expect(getDashboardLayoutCached).toHaveBeenCalledTimes(1);
  expect(getDashboardLayoutCached).toHaveBeenCalledWith(expect.objectContaining({ force: false }));
  expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument(); // not editing yet
});

// 3) EDIT + ADD → dirty
test("add widget from catalog mutates draft and sets dirty", async () => {
  renderPage();
  await screen.findByText("Pages");
  fireEvent.click(screen.getByRole("button", { name: /edit/i }));
  fireEvent.click(screen.getByRole("button", { name: /add widget/i }));
  fireEvent.click(await screen.findByRole("button", { name: /recent activity/i }));
  expect(screen.getByRole("button", { name: /save/i })).toBeEnabled(); // dirty enables Save
});

// 4) ARRANGE (keyboard a11y path) + REMOVE → still dirty, no save yet
test("keyboard arrange + remove update the draft without persisting", async () => {
  renderPage();
  await screen.findByText("Pages");
  fireEvent.click(screen.getByRole("button", { name: /edit/i }));
  const w1 = screen.getByRole("group", { name: /Pages widget/i });
  within(w1).getByRole("button", { name: /move (right|down)/i }).focus();
  fireEvent.keyDown(within(w1).getByRole("button", { name: /move right/i }), { key: "ArrowRight" });
  fireEvent.click(within(w1).getByRole("button", { name: /remove/i }));
  expect(saveDashboardLayout).not.toHaveBeenCalled(); // not persisted until Save
});

// 5) CONFIGURE PANEL — schema-driven controls + live preview, clamps via normalize
test("configure panel edits config through schema controls", async () => {
  renderPage();
  await screen.findByText("Pages");
  fireEvent.click(screen.getByRole("button", { name: /edit/i }));
  fireEvent.click(within(screen.getByRole("group", { name: /chart widget/i })).getByRole("button", { name: /settings|configure/i }));
  const panel = await screen.findByRole("region", { name: /settings/i }); // floating panel
  // range select sourced from registry field; content-type select from cached client
  fireEvent.change(within(panel).getByLabelText(/range/i), { target: { value: "30d" } });
  expect(within(panel).getByText(/preview/i)).toBeInTheDocument(); // live preview host present
  expect(screen.getByRole("button", { name: /save/i })).toBeEnabled(); // config edit → dirty
});

// 6) SAVE — one client call, echo adopted, cache broadcast, dirty cleared, edit exited
test("save persists via cached client and clears dirty", async () => {
  renderPage();
  await screen.findByText("Pages");
  fireEvent.click(screen.getByRole("button", { name: /edit/i }));
  fireEvent.click(within(screen.getByRole("group", { name: /Pages widget/i })).getByRole("button", { name: /remove/i }));
  fireEvent.click(screen.getByRole("button", { name: /save/i }));
  await waitFor(() => expect(saveDashboardLayout).toHaveBeenCalledTimes(1));
  // serialized draft is schema-shaped (no transient UI flags); removed widget gone
  const sent = saveDashboardLayout.mock.calls[0][0];
  expect(sent.widgets.find((w: { id: string }) => w.id === "w1")).toBeUndefined();
  expect(sent).not.toHaveProperty("editing"); // no UI-only fields leak into the layout
  await waitFor(() => expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument()); // exited edit
});

// 7) DIRTY-GUARD — background cache update while editing does NOT overwrite the draft
test("background layout update does not clobber a dirty draft", async () => {
  renderPage();
  await screen.findByText("Pages");
  fireEvent.click(screen.getByRole("button", { name: /edit/i }));
  fireEvent.click(within(screen.getByRole("group", { name: /Pages widget/i })).getByRole("button", { name: /remove/i }));
  // simulate cacheBus delivering a newer server layout mid-edit
  getDashboardLayoutCached.mockResolvedValueOnce({ ...SAVED_LAYOUT, widgets: [SAVED_LAYOUT.widgets[0]] });
  emitCacheBus("dashboard:layout", { action: "update" }); // test helper drives the subscribed handler
  await screen.findByText(/updated elsewhere|remote update/i); // hint shown, draft preserved
  expect(screen.queryByText("Pages")).not.toBeInTheDocument(); // user's removal still in effect
});

// 8) RBAC GATE — without dashboard:write the grid is read-only
test("no dashboard:write hides Edit and Save", async () => {
  hasPermission.mockImplementation((p: string) => p !== "dashboard:write");
  renderPage();
  await screen.findByText("Pages");
  expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
});
```

**Data flow:** every test renders `DashboardPage` under `AdminRouterProvider` with
the layout/content-type clients mocked at the module boundary. Mount resolves the
mocked `getDashboardLayoutCached` once (read mode). Edit-mode interactions drive the
L01 reducer + L02 catalog/panel; Save resolves the mocked `saveDashboardLayout` echo
and asserts the cache-broadcast + dirty-clear behavior. No real network, no
production fallback path.

**Error handling:** add a case where `saveDashboardLayout` rejects (mapped client
error) and assert the destructive `Alert` renders, the draft is preserved, and edit
mode stays open for retry. Add a hydrate-rejection case asserting the error surfaces
without blanking the page (last good layout / empty state stays visible).

**Regression-test shape:**

- Read mode: single cache hydrate (`force:false`), hosts render, no edit chrome.
- Add/remove/arrange/resize/configure: draft mutated, dirty set, nothing persisted.
- Save: one client call, schema-shaped payload (no UI flags), cache broadcast,
  dirty cleared, edit exited.
- Dirty-guard: background update keeps the dirty draft + shows the hint.
- RBAC: no `dashboard:write` → read-only.
- Errors: save/hydrate failure surfaces inline without data loss.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/dashboard-builder.test.tsx`
- Keep `tests/vitest/ui/dashboard.test.tsx` (shell) and
  `tests/vitest/admin/dashboardLayoutClient.test.ts` (TASK-480-03 client) green.
- The route/security Bun suites for the layout endpoints (TASK-480-02) are NOT run
  here (mocked at the boundary) but must not be regressed by builder changes.
- State clearly in the summary if any command was skipped or could not run.

---

## Documentation Updates Required

- `_docs/DASHBOARD_WIDGETS_SPEC.md` — note the builder test coverage matrix
  (edit-mode flows, Save/dirty/cache, RBAC gate) under a Testing section.
- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure linking `TASK-480` + `TASK-480-05-L03`.
