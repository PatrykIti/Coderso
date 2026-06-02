// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { SeoManagerPage } from "../../../core/admin/ui/seo/SeoManagerPage";
import { SeoAuditDialog } from "../../../core/admin/ui/seo/SeoAuditDialog";
import { SeoTable, type SeoItem } from "../../../core/admin/ui/seo/SeoTable";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

test("SeoManagerPage renders table and drawer", () => {
  const html = renderAdminUi(<SeoManagerPage />);
  const item: SeoItem = {
    id: "seo-home",
    title: "Homepage",
    path: "/",
    score: 90,
    lastAuditAt: "2026-06-01T00:00:00.000Z",
    metaStatus: "optimized",
    socialStatus: "ready",
    metaTitle: "Home",
    metaDescription: "Description",
    canonicalUrl: "https://example.com/home",
    robots: "index,follow",
    keywords: ["cms"],
    previewUrl: "https://example.com",
    previewPath: "home",
    analysisStatus: "passed",
    analysisNotes: [],
  };
  const drawer = renderAdminUi(
    <SeoTable items={[item]} activeId={item.id} onEdit={() => undefined} />
  );

  expect(html).toContain("SEO Manager");
  expect(html).toContain("Audit not run");
  expect(html).toContain("Run Full Audit");
  expect(html).toContain("Loading SEO data...");
  expect(drawer).toContain("Editing...");
  expect(drawer).toContain("Preview ready");
});

test("SeoTable renders an empty row with a real audit CTA", () => {
  const onRunAudit = vi.fn();
  const html = renderAdminUi(
    <SeoTable
      items={[]}
      emptyState={{
        title: "No SEO pages found",
        description: "Run a full audit to scan available pages and entries.",
        actionLabel: "Run Full Audit",
      }}
      onEmptyAction={onRunAudit}
    />
  );

  expect(html).toContain("No SEO pages found");
  expect(html).toContain("Run Full Audit");
});

test("SeoAuditDialog sends selected checks", () => {
  const onRun = vi.fn();
  const view = mount(
    <SeoAuditDialog open onOpenChange={() => undefined} onRun={onRun} isRunning={false} />
  );

  try {
    const checkboxes = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>("[role='checkbox']")
    );
    const buttons = Array.from(document.body.querySelectorAll("button"));
    const startButton = buttons.find((button) => button.textContent?.includes("Start Audit"));

    React.act(() => {
      checkboxes[2]?.click();
    });
    React.act(() => {
      startButton?.click();
    });

    expect(onRun).toHaveBeenCalledWith(["meta", "links"]);
  } finally {
    view.cleanup();
  }
});
