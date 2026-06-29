// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

// TASK-479-26-L07: structural lock for the Import / Export restyle (L05). Asserts the
// four per-target export cards (each with a real include checklist + Download calling
// exportConfig), the dashed import dropzone, and the Recent Imports list over the real
// ImportHistoryStatus enum — with the invented format select + "what to import"
// checklist asserted ABSENT.

const history = [
  {
    id: "import-applied",
    fileName: "bundle.json",
    type: "JSON bundle",
    sizeBytes: 1024,
    status: "applied" as const,
    progress: 100,
    createdAt: "2026-06-01T00:00:00.000Z",
    completedAt: "2026-06-01T00:01:00.000Z",
    failureReason: null,
    summary: null,
  },
  {
    id: "import-failed",
    fileName: "broken.json",
    type: "JSON bundle",
    sizeBytes: 512,
    status: "failed" as const,
    progress: 100,
    createdAt: "2026-06-02T00:00:00.000Z",
    completedAt: "2026-06-02T00:01:00.000Z",
    failureReason: "Invalid bundle",
    summary: null,
  },
];

const importExportState = vi.hoisted(() => ({
  exportConfig: vi.fn(async () => ({
    version: 1,
    exportedAt: "2026-06-01T10:00:00.000Z",
    scope: { target: "settings", include: ["settings"] },
    settings: {},
    menus: [],
    themeProfiles: [],
    adminThemes: { templates: [], profiles: [] },
    redirects: [],
  })),
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" && error !== null && "kind" in error,
}));

vi.mock("@/services/importExportClient", () => ({
  exportConfig: importExportState.exportConfig,
  previewImport: vi.fn(),
  importConfig: vi.fn(),
  getCachedImportHistory: () => history,
  writeImportHistoryCache: vi.fn(),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { ImportExportPage } from "../../../core/admin/ui/import-export/ImportExportPage";

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

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

afterEach(() => {
  importExportState.exportConfig.mockClear();
  document.body.innerHTML = "";
});

test("renders the four per-target export cards, the dropzone, and recent imports", () => {
  const view = mount(<ImportExportPage />);
  try {
    expect(view.container.textContent).toContain("Export Data");
    expect(view.container.textContent).toContain("Site Settings");
    expect(view.container.textContent).toContain("Navigation Menus");
    expect(view.container.textContent).toContain("Theme Configuration");
    expect(view.container.textContent).toContain("Redirect Rules");
    expect(view.container.textContent).toMatch(/browse files/i);
    // Recent Imports renders the seeded history over the REAL status enum.
    expect(view.container.textContent).toContain("bundle.json");
    expect(view.container.textContent).toContain("Applied");
    expect(view.container.textContent).toContain("Failed");
    // Dropped, unbacked surfaces are absent.
    expect(view.container.textContent).not.toContain("What to import");
    expect(view.container.textContent).not.toContain(".csv");
    expect(view.container.textContent).not.toContain(".zip");
    expect(view.container.textContent).not.toMatch(/processing/i);
  } finally {
    view.cleanup();
  }
});

test("a card Download calls exportConfig with the controlled target + include", async () => {
  const createUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:export");
  const revokeUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  const view = mount(<ImportExportPage />);
  try {
    const downloadButtons = Array.from(view.container.querySelectorAll("button")).filter(
      (button) => button.textContent?.trim() === "Download"
    );
    expect(downloadButtons).toHaveLength(4);
    await React.act(async () => {
      downloadButtons[0]!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(importExportState.exportConfig).toHaveBeenCalledWith({
      target: "settings",
      include: ["settings"],
    });
  } finally {
    createUrl.mockRestore();
    revokeUrl.mockRestore();
    view.cleanup();
  }
});

test("unchecking the only include option disables that card's Download", () => {
  const view = mount(<ImportExportPage />);
  try {
    const settingsLabel = Array.from(view.container.querySelectorAll("label")).find((label) =>
      label.textContent?.includes("Settings values")
    );
    const checkbox = settingsLabel?.querySelector("button");
    React.act(() => {
      checkbox?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const firstDownload = Array.from(view.container.querySelectorAll("button")).filter(
      (button) => button.textContent?.trim() === "Download"
    )[0];
    expect(firstDownload?.disabled).toBe(true);
  } finally {
    view.cleanup();
  }
});
