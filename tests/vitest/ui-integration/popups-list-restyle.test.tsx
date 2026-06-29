// @vitest-environment happy-dom

// TASK-479-20-L03: locks the Popups LIST restyle (PageHeader + "Beta" badge, a
// real-count stat row, and a soft rounded-2xl card grid) while proving the data /
// status-mutation / search behaviors are presentation only — and that NO fabricated
// impressions/conversion analytics leaked into the UI (L01 truthfulness contract).
// Static cases use the SSR-only `renderAdminUi`; interactive cases mount the REAL
// PopupsListPage (createRoot + React.act) and stub globalThis.fetch.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { clearPopupsCache } from "../../../core/admin/services/popupsClient";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { PopupsListPage } from "../../../core/admin/ui/popups/PopupsListPage";
import { renderAdminUi } from "../../utils/adminRouterRender";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Full PopupRecord factory (matches the real wire shape — see popupsClient.ts).
const popup = (over: Record<string, unknown> = {}) => ({
  id: "p1",
  name: "Newsletter signup",
  slug: "newsletter-signup",
  status: "published",
  trigger: { type: "time_delay", delaySeconds: 3 },
  targeting: { includePaths: [], excludePaths: [], audience: "all" },
  frequency: { strategy: "session_once", cooldownMinutes: null },
  content: { title: "Join us", body: "Subscribe", templateId: null, ctaLabel: null, ctaHref: null },
  settings: { placement: "center", dismissible: true, showOverlay: true },
  createdAt: "2026-02-19T00:00:00.000Z",
  updatedAt: "2026-02-19T00:00:00.000Z",
  publishedAt: null,
  ...over,
});

const seedList = (records: unknown[]) =>
  localStorage.setItem(
    cacheKeys.popupsList,
    JSON.stringify({ value: records, savedAt: Date.now() })
  );

const mount = (node: React.ReactNode, path: string) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<AdminRouterProvider initialPath={path}>{node}</AdminRouterProvider>);
  });
  return {
    container,
    cleanup: () => {
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

// Interactive mounts hit the AdminShell bootstrap + the list GET; stub fetch.
const stubFetch = (handlers: (url: string, init?: RequestInit) => unknown | undefined) => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/auth/me")) {
      return new Response(JSON.stringify({ user: { id: "u1", email: "a@b.c", name: "A" } }), {
        status: 200,
      });
    }
    const handled = handlers(url, init);
    return new Response(JSON.stringify(handled ?? {}), { status: 200 });
  }) as typeof globalThis.fetch;
  return () => {
    globalThis.fetch = original;
  };
};

beforeEach(() => {
  localStorage.clear();
  clearPopupsCache();
});

afterEach(() => {
  document.body.innerHTML = "";
});

// STATIC (SSR snapshot): header, Beta badge, stat row, soft card grid.
test("renders header, Beta badge, stat row, and a soft card grid", () => {
  seedList([
    popup({ status: "published" }),
    popup({ id: "p2", name: "Sale banner", status: "draft" }),
  ]);
  const html = renderAdminUi(<PopupsListPage />, { path: "/admin/advanced/popups" });
  expect(html).toContain("Popups"); // PageHeader title
  expect(html).toContain("Beta"); // soft badge beside the title
  expect(html).toContain("New popup"); // primary action
  expect(html).toContain("Published"); // stat-row label (also in status tabs — fine)
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
    if (url.endsWith("/popups/p1/status")) {
      statusBody = JSON.parse(String(init?.body));
      return popup({ id: "p1", status: "published" });
    }
    return undefined;
  });
  const view = mount(<PopupsListPage />, "/admin/advanced/popups");
  try {
    const sw = view.container.querySelector('button[role="switch"]') as HTMLButtonElement;
    expect(sw).toBeTruthy();
    await React.act(async () => {
      sw.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(statusBody).toEqual({ status: "published" }); // updatePopupStatus("p1","published")
  } finally {
    view.cleanup();
    restore();
  }
});

// INTERACTIVE: search narrows the grid (behavior preserved).
test("search narrows the grid", () => {
  seedList([popup({ id: "a", name: "Alpha" }), popup({ id: "b", name: "Beta promo" })]);
  const restore = stubFetch(() => undefined);
  const view = mount(<PopupsListPage />, "/admin/advanced/popups");
  try {
    const search = view.container.querySelector(
      'input[aria-label="Search popups"]'
    ) as HTMLInputElement;
    expect(search).toBeTruthy();
    React.act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(search, "Alpha");
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(view.container.textContent).toContain("Alpha");
    expect(view.container.textContent).not.toContain("Beta promo");
  } finally {
    view.cleanup();
    restore();
  }
});
