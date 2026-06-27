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
boundary** (the `dashboardClient` / `contentTypesClient` modules), NOT via
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
  - Boundary to mock: `core/admin/services/dashboardClient.ts`
    (`getDashboardLayoutCached`, `saveDashboardLayout`), `core/admin/utils/cacheBus.ts`
    (`subscribeCacheEvents` / `broadcastCacheEvent`),
    `core/admin/services/contentTypesClient.ts`, and the `useAdminCan` permission
    accessor (`core/admin/ui/contexts/AdminAuthContext`)
  - Layout fixtures aligned to `core/services/dashboard/dashboardWidgetContract.ts`
    (`DashboardLayout`, `DashboardWidget`) — keep fixtures schema-true
  - `_docs/TESTING_STRATEGY.md` (Vitest = Bun-free admin/UI lane; routes/security
    Bun suites for the API live in TASK-480-03, not here)
- **Out of scope:** Route/security/perf Bun suites (TASK-480-03 lanes); widget
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

> **Test lane (repo idiom).** This repo has **no** `@testing-library/react` /
> `jest-dom` / `user-event`. Interactive admin-UI suites run on **happy-dom** with
> React via `createRoot` + `React.act` and `globalThis.fetch`/client-module stubs
> (see `tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx`).
> Mount `DashboardPage` under `AdminRouterProvider`, mock the client modules at the
> `@/` boundary, drive interactions with real `dispatchEvent`, and assert on
> `container.querySelector` / `textContent` — never RTL `render`/`screen`.

```tsx
// @vitest-environment happy-dom
// tests/vitest/ui-integration/dashboard-builder.test.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { DashboardPage } from "../../../core/admin/ui/dashboard/DashboardPage";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

// 1) MOCK THE CLIENT BOUNDARY (not production fallbacks, not the network)
const saveDashboardLayout = vi.fn();
const getDashboardLayoutCached = vi.fn();
vi.mock("@/services/dashboardClient", () => ({
  getDashboardData: vi.fn(async () => ({})),
  getDashboardLayoutCached: (...a: unknown[]) => getDashboardLayoutCached(...a),
  saveDashboardLayout: (...a: unknown[]) => saveDashboardLayout(...a),
}));
// content-type options for the configure panel selector
vi.mock("@/services/contentTypesClient", () => ({
  listContentTypesCached: vi.fn(async () => [{ id: "ct1", slug: "post", name: "Post" }]),
}));
// permission gate — real accessor is useAdminCan(); default to writer, override per-test
const can = vi.fn((p?: string) => true);
vi.mock("@/ui/contexts/AdminAuthContext", async (orig) => ({
  ...(await orig<typeof import("@/ui/contexts/AdminAuthContext")>()),
  useAdminCan: () => can,
}));
// capture the cacheBus subscriber so a test can drive a background update;
// observe broadcastCacheEvent on save.
let cacheListener: ((evt: { key: string; action: string }) => void) | null = null;
const broadcastCacheEvent = vi.fn();
vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: (handler: (evt: { key: string; action: string }) => void) => {
    cacheListener = handler;
    return () => { cacheListener = null; };
  },
  broadcastCacheEvent: (...a: unknown[]) => broadcastCacheEvent(...a),
}));

const SAVED_LAYOUT = {
  version: 1,
  widgets: [
    { id: "w1", type: "totals-counters", title: "Pages", config: { kind: "totals-counters" }, position: { x: 0, y: 0, w: 3, h: 1 } },
    { id: "w2", type: "content-over-time", title: "Trend", config: { kind: "content-over-time" }, position: { x: 3, y: 0, w: 6, h: 2 } },
  ],
};

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin">
        <DashboardPage />
      </AdminRouterProvider>,
    );
  });
  return {
    container,
    cleanup: () => { React.act(() => root.unmount()); container.remove(); },
  };
};

const flush = async () => {
  await React.act(async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); });
};

// helpers: find a <button> by visible text; click via a real bubbling MouseEvent.
const button = (root: ParentNode, label: RegExp) =>
  Array.from(root.querySelectorAll("button")).find((b) => label.test(b.textContent ?? ""));
const click = (el: Element | null | undefined) =>
  React.act(() => { el?.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
const groupFor = (container: HTMLElement, label: RegExp) =>
  Array.from(container.querySelectorAll('[role="group"]'))
    .find((g) => label.test(g.getAttribute("aria-label") ?? "")) as HTMLElement | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  cacheListener = null;
  can.mockImplementation(() => true);
  getDashboardLayoutCached.mockResolvedValue(SAVED_LAYOUT);
  saveDashboardLayout.mockImplementation(async (layout) => layout); // echo
});
afterEach(() => { document.body.innerHTML = ""; });

// 2) READ MODE — hydrate ONCE from cache, render hosts, no edit chrome
test("renders saved layout from cache without forcing refetch", async () => {
  const view = mount();
  try {
    await flush();
    expect(view.container.textContent).toContain("Pages");
    expect(getDashboardLayoutCached).toHaveBeenCalledTimes(1);
    expect(getDashboardLayoutCached).toHaveBeenCalledWith(expect.objectContaining({ force: false }));
    expect(button(view.container, /save/i)).toBeUndefined(); // not editing yet
  } finally { view.cleanup(); }
});

// 3) EDIT + ADD → dirty (Save enabled)
test("add widget from catalog mutates draft and sets dirty", async () => {
  const view = mount();
  try {
    await flush();
    await click(button(view.container, /edit/i));
    await flush();
    await click(button(view.container, /add widget/i));
    await flush();
    // catalog dialog renders into document.body; pick the "Recent activity" entry
    await click(button(document.body, /recent activity/i));
    await flush();
    expect(button(view.container, /save/i)?.hasAttribute("disabled")).toBe(false);
  } finally { view.cleanup(); }
});

// 4) ARRANGE (keyboard a11y path) + REMOVE → still dirty, nothing persisted
test("keyboard arrange + remove update the draft without persisting", async () => {
  const view = mount();
  try {
    await flush();
    await click(button(view.container, /edit/i));
    await flush();
    const w1 = groupFor(view.container, /Pages widget/i)!;
    const move = button(w1, /move right/i)!;
    await React.act(() => { move.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); });
    await click(button(w1, /remove/i));
    await flush();
    expect(saveDashboardLayout).not.toHaveBeenCalled(); // not persisted until Save
  } finally { view.cleanup(); }
});

// 5) CONFIGURE PANEL — schema-driven controls + live preview
test("configure panel edits config through schema controls", async () => {
  const view = mount();
  try {
    await flush();
    await click(button(view.container, /edit/i));
    await flush();
    const w2 = groupFor(view.container, /Trend widget/i)!;
    await click(button(w2, /settings|configure/i));
    await flush();
    const panel = document.body.querySelector('[role="region"][aria-label*="settings" i]') as HTMLElement;
    expect(panel).not.toBeNull();
    const range = panel.querySelector('select, [role="radiogroup"]') as HTMLSelectElement;
    React.act(() => {
      range.value = "30d";
      range.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flush();
    expect(panel.textContent?.toLowerCase()).toContain("preview"); // live preview host present
    expect(button(view.container, /save/i)?.hasAttribute("disabled")).toBe(false); // config edit → dirty
  } finally { view.cleanup(); }
});

// 6) SAVE — one client call, echo adopted, cache broadcast, dirty cleared, edit exited
test("save persists via cached client and clears dirty", async () => {
  const view = mount();
  try {
    await flush();
    await click(button(view.container, /edit/i));
    await flush();
    await click(button(groupFor(view.container, /Pages widget/i)!, /remove/i));
    await flush();
    await click(button(view.container, /save/i));
    await flush();
    expect(saveDashboardLayout).toHaveBeenCalledTimes(1);
    const sent = saveDashboardLayout.mock.calls[0][0];
    expect(sent.widgets.find((w: { id: string }) => w.id === "w1")).toBeUndefined();
    expect(sent).not.toHaveProperty("editing");          // no UI-only fields leak into the layout
    expect(button(view.container, /save/i)).toBeUndefined(); // exited edit
  } finally { view.cleanup(); }
});

// 7) DIRTY-GUARD — background cache update while editing does NOT overwrite the draft
test("background layout update does not clobber a dirty draft", async () => {
  const view = mount();
  try {
    await flush();
    await click(button(view.container, /edit/i));
    await flush();
    await click(button(groupFor(view.container, /Pages widget/i)!, /remove/i));
    await flush();
    // simulate cacheBus delivering a newer server layout mid-edit
    getDashboardLayoutCached.mockResolvedValueOnce({ ...SAVED_LAYOUT, widgets: [SAVED_LAYOUT.widgets[1]] });
    await React.act(async () => { cacheListener?.({ key: "dashboard:layout", action: "update" }); });
    await flush();
    expect(/updated elsewhere|remote update/i.test(view.container.textContent ?? "")).toBe(true); // hint shown
    expect(view.container.textContent).not.toContain("Pages"); // user's removal still in effect
  } finally { view.cleanup(); }
});

// 8) RBAC GATE — without dashboard:write the grid is read-only
test("no dashboard:write hides Edit and Save", async () => {
  can.mockImplementation((p?: string) => p !== "dashboard:write");
  const view = mount();
  try {
    await flush();
    expect(view.container.textContent).toContain("Pages");
    expect(button(view.container, /edit/i)).toBeUndefined();
    expect(button(view.container, /save/i)).toBeUndefined();
  } finally { view.cleanup(); }
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
  `tests/vitest/admin/dashboardClient.test.ts` (TASK-480-03 client) green.
- The route/security Bun suites for the layout endpoints (TASK-480-03) are NOT run
  here (mocked at the boundary) but must not be regressed by builder changes.
- State clearly in the summary if any command was skipped or could not run.

---

## Documentation Updates Required

- `_docs/DASHBOARD_WIDGETS_SPEC.md` — note the builder test coverage matrix
  (edit-mode flows, Save/dirty/cache, RBAC gate) under a Testing section.
- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure linking `TASK-480` + `TASK-480-05-L03`.
