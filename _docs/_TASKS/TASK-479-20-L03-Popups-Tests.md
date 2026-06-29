# TASK-479-20-L03: Popups Tests
# FileName: TASK-479-20-L03-Popups-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Advanced / Testing
**Estimated Effort:** Small
**Dependencies:** TASK-479-20-L01, TASK-479-20-L02
**Status:** ✅ Done
**Parent Subtask:** TASK-479-20
**Started:** 2026-06-29
**Completed:** 2026-06-29

---

## Overview

Add Vitest render tests that lock in the Popups list restyle and the Popup editor
restyle, and confirm the restyle did not regress any data/cache/mutation behavior.
These are presentation guards layered on top of the existing behavioral popups
suites, not a replacement for them.

- **Goal:** New Vitest suites that render the real `PopupsListPage` and the real
  `PopupEditorPage` and assert the prototype look is present (stat row, soft
  `rounded-2xl` card grid, live popup preview, grouped inspector) while the core
  behaviors (search/status filter, active-toggle status mutation, delete, draft
  binding via `onPatch`, dirty-state, save payload) still work — and that NO
  fabricated `impressions`/`conversion` analytics leaked into the UI.
- **Owning module/service:**
  `tests/vitest/ui-integration/popups-list-restyle.test.tsx` and
  `tests/vitest/ui-integration/popup-editor-restyle.test.tsx` (new), exercising
  `core/admin/ui/popups/PopupsListPage.tsx` and
  `core/admin/ui/popups/PopupEditorPage.tsx`.
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md` (Vitest lane), the prototype
  screens under `_docs/_PROTOTYPE/src/pages/advanced/`, and the existing
  `tests/vitest/ui/popups-page.test.tsx` + `tests/vitest/admin/popupsClient.test.ts`
  suites used as fixture/setup references.
- **Out of scope:** No runtime (browser) tests; no new product code (L01/L02 own the
  components). Do not move existing runtime tests into Vitest for coverage.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Mirror the EXISTING popups suite idiom (`tests/vitest/ui/popups-page.test.tsx`): seed
the cache via `localStorage` (`cacheKeys.popupsList` for the list,
`cacheKeys.popupDetail(id)` for the editor in edit mode — both read synchronously by
`getCachedPopups`/`getCachedPopup`) and render the real component with the
`renderAdminUi` helper (`tests/utils/adminRouterRender`, an SSR `renderToString`
string) for **static-presence** assertions (`expect(html).toContain(...)`). For
**interactive** behavior (toggle → status mutation, search → filter, typing → dirty +
preview, Save → payload, cacheBus → no-clobber), mount with `createRoot` + `React.act`
under `// @vitest-environment happy-dom`, query the live DOM via
`container.querySelector`, dispatch native DOM events, and stub `globalThis.fetch`
(`/auth/me`, `GET`/`PATCH /popups…`) the way `admin-shell-request-budget.test.tsx`
does.

> **Test-lane reality (mandatory).** This repo has **no** `@testing-library/react`,
> `@testing-library/jest-dom`, or `@testing-library/user-event`. Do NOT import or use
> `render`, `screen`, `userEvent`, `selectOptions`, `getByRole`, `getByLabelText`,
> `toBeInTheDocument`, or `toHaveValue`. `renderAdminUi` is **SSR-only** — a single
> snapshot string with no effects/interactivity — so use it only for static presence,
> never to drive clicks/typing. The trigger/audience/frequency/placement/status
> controls are shadcn **Radix `Select`** (not native `<select>`): prove a conditional
> swap by seeding two `triggerType` states, not by `selectOptions`.

```tsx
// ── Shared fixtures/helpers (repo idiom; NO @testing-library/*) ──────────────
// Both files start with:  // @vitest-environment happy-dom
import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { broadcastCacheEvent } from "../../../core/admin/utils/cacheBus";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { PopupsListPage } from "../../../core/admin/ui/popups/PopupsListPage";
import { PopupEditorPage } from "../../../core/admin/ui/popups/PopupEditorPage";
import { renderAdminUi } from "../../utils/adminRouterRender";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Full PopupRecord factory (matches the real wire shape — see popupsClient.ts).
const popup = (over: Record<string, unknown> = {}) => ({
  id: "p1", name: "Newsletter signup", slug: "newsletter-signup", status: "published",
  trigger: { type: "time_delay", delaySeconds: 3 },
  targeting: { includePaths: [], excludePaths: [], audience: "all" },
  frequency: { strategy: "session_once", cooldownMinutes: null },
  content: { title: "Join us", body: "Subscribe", templateId: null, ctaLabel: null, ctaHref: null },
  settings: { placement: "center", dismissible: true, showOverlay: true },
  createdAt: "2026-02-19T00:00:00.000Z", updatedAt: "2026-02-19T00:00:00.000Z", publishedAt: null,
  ...over,
});
const seedList = (records: unknown[]) =>
  localStorage.setItem(cacheKeys.popupsList, JSON.stringify({ value: records, savedAt: Date.now() }));
const seedDetail = (record: ReturnType<typeof popup>) =>
  localStorage.setItem(cacheKeys.popupDetail(record.id), JSON.stringify({ value: record, savedAt: Date.now() }));

// Interactive mount (createRoot + React.act); SSR cases use renderAdminUi instead.
const mount = (node: React.ReactNode, path: string) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => root.render(<AdminRouterProvider initialPath={path}>{node}</AdminRouterProvider>));
  return { container, cleanup: () => { React.act(() => root.unmount()); container.remove(); } };
};
// Interactive mounts hit AdminShell auth bootstrap + the editor GET; stub fetch.
const stubFetch = (handlers: (url: string, init?: RequestInit) => unknown | undefined) => {
  const original = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/auth/me"))
      return new Response(JSON.stringify({ user: { id: "u1", email: "a@b.c", name: "A" } }), { status: 200 });
    const handled = handlers(url, init);
    return new Response(JSON.stringify(handled ?? {}), { status: 200 });
  };
  return () => { globalThis.fetch = original; };
};

// ── tests/vitest/ui-integration/popups-list-restyle.test.tsx ────────────────
// STATIC (SSR snapshot): header, Beta badge, stat row, soft card grid.
test("renders header, Beta badge, stat row, and a soft card grid", () => {
  seedList([popup({ status: "published" }), popup({ id: "p2", name: "Sale banner", status: "draft" })]);
  const html = renderAdminUi(<PopupsListPage />, { path: "/admin/advanced/popups" });
  expect(html).toContain("Popups");      // PageHeader title
  expect(html).toContain("Beta");        // soft badge beside the title
  expect(html).toContain("New popup");   // primary action
  expect(html).toContain("Published");   // stat-row label (also in status tabs — fine)
  expect(html).toContain("rounded-2xl"); // load-bearing card token
  expect(html).toContain("Newsletter signup");
});

// STATIC: truthfulness guard — no fabricated analytics (L01 constraint).
test("does NOT render fabricated impressions/conversion analytics", () => {
  seedList([popup({ status: "published" })]);
  const html = renderAdminUi(<PopupsListPage />, { path: "/admin/advanced/popups" }).toLowerCase();
  expect(html).not.toContain("impressions");
  expect(html).not.toContain("conversion");
});

// INTERACTIVE: active Switch (role="switch") flips status via PATCH /popups/:id/status.
test("active toggle flips status via updatePopupStatus", async () => {
  seedList([popup({ id: "p1", status: "draft" })]);
  let statusBody: unknown = null;
  const restore = stubFetch((url, init) => {
    if (url.endsWith("/popups/p1/status")) { statusBody = JSON.parse(String(init?.body)); return popup({ id: "p1", status: "published" }); }
    return undefined;
  });
  const view = mount(<PopupsListPage />, "/admin/advanced/popups");
  try {
    const sw = view.container.querySelector('button[role="switch"]') as HTMLButtonElement;
    await React.act(async () => { sw.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect(statusBody).toEqual({ status: "published" }); // updatePopupStatus("p1","published")
  } finally { view.cleanup(); restore(); }
});

// INTERACTIVE: search narrows the grid (behavior preserved).
test("search narrows the grid", () => {
  seedList([popup({ id: "a", name: "Alpha" }), popup({ id: "b", name: "Beta promo" })]);
  const restore = stubFetch(() => undefined);
  const view = mount(<PopupsListPage />, "/admin/advanced/popups");
  try {
    const search = view.container.querySelector('input[aria-label="Search popups"]') as HTMLInputElement;
    React.act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(search, "Alpha");
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(view.container.textContent).toContain("Alpha");
    expect(view.container.textContent).not.toContain("Beta promo");
  } finally { view.cleanup(); restore(); }
});

// ── tests/vitest/ui-integration/popup-editor-restyle.test.tsx ───────────────
// STATIC (SSR): three-region frame + live preview reflect the seeded draft.
test("renders the three-region frame + live preview from the draft", () => {
  seedDetail(popup({ id: "p1", content: { title: "Join us", body: "Subscribe", templateId: null, ctaLabel: null, ctaHref: null } }));
  const html = renderAdminUi(<PopupEditorPage />, { path: "/admin/advanced/popups/p1" });
  expect(html).toContain("Join us"); // preview reflects draft.title
  expect(html).toContain("Save");    // header Save action
});

// STATIC: conditional trigger field tracks the SEEDED triggerType (Radix Select — no selectOptions).
test("conditional trigger field matches the seeded triggerType", () => {
  seedDetail(popup({ id: "p1", trigger: { type: "scroll_depth", percent: 40 } }));
  const html = renderAdminUi(<PopupEditorPage />, { path: "/admin/advanced/popups/p1" });
  expect(html).toContain("Scroll depth");        // scroll_depth → percent field present
  expect(html).not.toContain("Delay (seconds)"); // time_delay field absent
});

// INTERACTIVE: typing the title updates the preview; Save sends toPopupInput(draft).
test("typing a title updates the preview; Save sends toPopupInput(draft)", async () => {
  seedDetail(popup({ id: "p1" }));
  let savedBody: { content?: { title?: string } } | null = null;
  const restore = stubFetch((url, init) => {
    if (url.endsWith("/popups/p1") && init?.method === "GET") return popup({ id: "p1" });
    if (url.endsWith("/popups/p1") && init?.method === "PATCH") { savedBody = JSON.parse(String(init.body)); return popup({ id: "p1" }); }
    return undefined;
  });
  const view = mount(<PopupEditorPage />, "/admin/advanced/popups/p1");
  try {
    const title = view.container.querySelector('input[placeholder="Get 10% off your first order"]') as HTMLInputElement;
    React.act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(title, "Hello"); title.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await React.act(async () => {
      Array.from(view.container.querySelectorAll("button"))
        .find((b) => /save changes/i.test(b.textContent ?? ""))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(savedBody?.content?.title).toContain("Hello"); // toPopupInput nests title under content
  } finally { view.cleanup(); restore(); }
});

// INTERACTIVE: a background cacheBus event must NOT clobber a dirty draft.
test("does not overwrite the draft while dirty", () => {
  seedDetail(popup({ id: "p1" }));
  const restore = stubFetch((url, init) => (url.endsWith("/popups/p1") && init?.method === "GET" ? popup({ id: "p1" }) : undefined));
  const view = mount(<PopupEditorPage />, "/admin/advanced/popups/p1");
  try {
    const name = view.container.querySelector('input[placeholder="Winter Promo Popup"]') as HTMLInputElement;
    React.act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(name, "WIP"); name.dispatchEvent(new Event("input", { bubbles: true })); // hasUnsavedChanges = true
    });
    React.act(() => broadcastCacheEvent({ key: cacheKeys.popupsList, action: "update" })); // background revalidation
    const after = view.container.querySelector('input[placeholder="Winter Promo Popup"]') as HTMLInputElement;
    expect(after.value).toContain("WIP"); // dirty-guarded subscription left the draft intact
  } finally { view.cleanup(); restore(); }
});
```

**Data flow:** static tests seed the `localStorage` cache → `renderAdminUi` (SSR
string) → assert presence with `html.toContain(...)` + load-bearing tokens
(`rounded-2xl`, stat labels, preview text). Interactive tests seed cache → `mount`
(createRoot + `React.act`) with a `globalThis.fetch` stub → drive one behavioral path
per area (toggle→status PATCH, search→filter, type→dirty+preview, save→`toPopupInput`
payload, cacheBus→no clobber) by dispatching native DOM events, asserting on the live
`container`.

**Error handling:** keep assertions resilient — query via `container.querySelector`
with stable hooks (`[role="switch"]`, `aria-label`, real `placeholder` text) or
substring checks (`html.toContain` / `container.textContent`) and the `rounded-2xl`
token rather than exact className strings, so future token tweaks from TASK-479-05/06
do not falsely fail these suites. The no-fabricated-analytics assertion is a guardrail
for the L01 truthfulness contract.

**Regression-test shape:** the two new suites above PLUS a green run of the existing
popups behavioral suites (no edits to those files unless a selector genuinely moved;
if a selector moved due to the restyle, update the minimal query rather than the
assertion intent).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/popups-list-restyle.test.tsx tests/vitest/ui-integration/popup-editor-restyle.test.tsx`
- Full popups regression sweep (must stay green):
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/popups-page.test.tsx tests/vitest/ui/popup-defaults.test.ts tests/vitest/admin/popupsClient.test.ts`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-20-L03`.
- Note the two new `ui-integration` suites in any test-inventory doc that lists the
  Popups coverage, so the restyle guards are discoverable.
