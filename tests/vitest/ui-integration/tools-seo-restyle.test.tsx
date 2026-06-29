// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

// TASK-479-26-L07: structural lock for the SEO Manager restyle (L02). Asserts the
// PageHeader + the stat row DERIVED from seeded real SEO data (no fabricated
// "Indexed pages"/deltas), the soft table, and the preserved audit + edit actions.

const seoState = vi.hoisted(() => ({
  cached: null as unknown[] | null,
  listError: null as unknown,
  list: vi.fn(async () => {
    if (seoState.listError) throw seoState.listError;
    return seoState.cached ?? [];
  }),
  runAudit: vi.fn(async () => undefined),
  update: vi.fn(async () => undefined),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/services/seoClient", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/seoClient")>("@/services/seoClient");
  return {
    ...actual,
    getCachedSeo: () => seoState.cached,
    listSeoCached: seoState.list,
    runSeoAudit: seoState.runAudit,
    updateSeo: seoState.update,
  };
});

import { SeoManagerPage } from "../../../core/admin/ui/seo/SeoManagerPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LONG_DESCRIPTION =
  "This is a comfortably long meta description that easily exceeds the seventy character threshold.";

const seed = () => {
  seoState.cached = [
    {
      id: "seo-a",
      targetId: "a",
      targetTitle: "Homepage",
      title: "Home",
      slug: "/",
      score: 90,
      lastAuditAt: "2026-06-01T00:00:00.000Z",
      description: LONG_DESCRIPTION,
      canonicalUrl: "",
      robots: "",
      status: "ok",
      issues: [],
    },
    {
      id: "seo-b",
      targetId: "b",
      targetTitle: "Pricing",
      title: "Pricing",
      slug: "/pricing",
      score: 40,
      lastAuditAt: "2026-06-01T00:00:00.000Z",
      description: "",
      canonicalUrl: "",
      robots: "",
      status: "warning",
      issues: [{ message: "Missing meta description" }, { message: "Slow largest paint" }],
    },
  ];
  seoState.listError = null;
};

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  return {
    container,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

afterEach(() => {
  seoState.cached = null;
  seoState.listError = null;
  seoState.list.mockClear();
  seoState.runAudit.mockClear();
  seoState.update.mockClear();
  document.body.innerHTML = "";
});

test("derives the stat row from seeded SEO data and drops the unbacked Indexed pages stat", async () => {
  seed();
  const view = mount(<SeoManagerPage />);
  try {
    await flush();
    expect(view.container.querySelector("h1")?.textContent).toContain("SEO Manager");
    // avg = round((90 + 40) / 2) = 65, derived from the seed (not a fabricated value).
    expect(view.container.textContent).toContain("Avg");
    expect(view.container.textContent).toContain("65/100");
    expect(view.container.textContent).not.toContain("Indexed pages");
    // meta badges derived from metaStatus (optimized / missing).
    expect(view.container.textContent).toContain("Optimized");
    expect(view.container.textContent).toContain("Missing");
    expect(view.container.textContent).toContain("Homepage");
    expect(view.container.textContent).toContain("Pricing");
  } finally {
    view.cleanup();
  }
});

test("Run Full Audit opens the audit dialog and the row edit action opens the drawer", async () => {
  seed();
  const view = mount(<SeoManagerPage />);
  try {
    await flush();

    const auditButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Run Full Audit")
    );
    expect(auditButton).toBeTruthy();
    React.act(() => {
      auditButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(document.body.textContent).toContain("Start Audit");

    const editButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === "Edit Pricing"
    );
    React.act(() => {
      editButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    // The active row now reports "Editing..." (selectedId set → SeoDrawer opens).
    expect(view.container.textContent).toContain("Editing...");
  } finally {
    view.cleanup();
  }
});

test("a seeded API error still surfaces the destructive Alert", async () => {
  seoState.cached = null;
  seoState.listError = new Error("network down");
  const view = mount(<SeoManagerPage />);
  try {
    await flush();
    expect(view.container.textContent).toContain("SEO data unavailable");
  } finally {
    view.cleanup();
  }
});
