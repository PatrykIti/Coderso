// @vitest-environment happy-dom

// Gap-coverage suite for core/admin/ui/import-export/ExportCards.tsx and
// ImportExportPage.tsx. Complements tests/vitest/ui/import-export.test.tsx
// with the dependency cascade between export options (checking re-links a
// prerequisite, unchecking removes dependents) and the page-level export
// error branches (api-client shaped vs. opaque failures).

import React from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { ExportRequest, ExportTarget } from "../../../core/admin/services/importExportClient";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { ExportCards } from "../../../core/admin/ui/import-export/ExportCards";
import { ImportExportPage } from "../../../core/admin/ui/import-export/ImportExportPage";

const importExportState = vi.hoisted(() => ({
  exportConfig: vi.fn(),
  previewImport: vi.fn(),
  importConfig: vi.fn(),
  getCachedImportHistory: vi.fn(),
  writeImportHistoryCache: vi.fn(),
}));

vi.mock("@/services/importExportClient", () => ({
  exportConfig: importExportState.exportConfig,
  previewImport: importExportState.previewImport,
  importConfig: importExportState.importConfig,
  getCachedImportHistory: importExportState.getCachedImportHistory,
  writeImportHistoryCache: importExportState.writeImportHistoryCache,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    (error as { kind?: unknown }).kind === "api",
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin/tools/import-export">{node}</AdminRouterProvider>
    );
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

const checkboxForLabel = (container: HTMLElement, labelText: string) => {
  const label = Array.from(container.querySelectorAll("label")).find((candidate) =>
    candidate.textContent?.includes(labelText)
  );
  const checkbox = label?.querySelector("button");
  if (!(checkbox instanceof HTMLButtonElement)) {
    throw new Error(`Missing checkbox for ${labelText}`);
  }
  return checkbox;
};

const downloadButtons = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll("button")).filter(
    (button) => button.textContent?.trim() === text
  );

const clickCheckbox = (container: HTMLElement, labelText: string) => {
  React.act(() => {
    checkboxForLabel(container, labelText).click();
  });
};

const clickDownload = (container: HTMLElement, index: number) => {
  const buttons = downloadButtons(container, "Download");
  const button = buttons[index];
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing Download button at index ${index}`);
  }
  React.act(() => {
    button.click();
  });
};

beforeEach(() => {
  importExportState.exportConfig.mockReset();
  importExportState.previewImport.mockReset();
  importExportState.importConfig.mockReset();
  importExportState.writeImportHistoryCache.mockReset();
  importExportState.getCachedImportHistory.mockReset();
  importExportState.getCachedImportHistory.mockReturnValue([]);
});

describe("ExportCards option dependency cascades", () => {
  test("re-links the menus prerequisite when menu items are re-selected", () => {
    const onExport = vi.fn<(request: ExportRequest) => void>();
    const view = mount(<ExportCards onExport={onExport} exportingTargets={[]} />);

    try {
      // Unchecking "Menu records" also drops its dependent "Menu items",
      // leaving the card with no selection and a disabled trigger.
      clickCheckbox(view.container, "Menu records");
      expect(downloadButtons(view.container, "Download")[1]?.disabled).toBe(true);

      // Re-checking "Menu items" pulls its prerequisite back into the payload.
      clickCheckbox(view.container, "Menu items");
      const menusDownload = downloadButtons(view.container, "Download")[1];
      expect(menusDownload?.disabled).toBe(false);

      React.act(() => {
        menusDownload?.click();
      });
      expect(onExport).toHaveBeenCalledTimes(1);
      expect(onExport).toHaveBeenCalledWith({
        target: "menus",
        include: ["menu-items", "menus"],
      });
    } finally {
      view.cleanup();
    }
  });

  test("keeps every default theme option until theme profiles are deselected", () => {
    const onExport = vi.fn<(request: ExportRequest) => void>();
    const view = mount(<ExportCards onExport={onExport} exportingTargets={[]} />);

    try {
      clickDownload(view.container, 2);
      expect(onExport).toHaveBeenCalledWith({
        target: "themes",
        include: [
          "theme-profiles",
          "theme-routes",
          "admin-theme-templates",
          "admin-theme-profiles",
        ],
      });

      // Unchecking "Theme profiles" removes dependent "Theme routes" from the
      // payload while the unrelated admin-theme options stay selected.
      clickCheckbox(view.container, "Theme profiles");
      expect(downloadButtons(view.container, "Download")[2]?.disabled).toBe(false);

      clickDownload(view.container, 2);
      expect(onExport).toHaveBeenCalledTimes(2);
      expect(onExport).toHaveBeenLastCalledWith({
        target: "themes",
        include: ["admin-theme-templates", "admin-theme-profiles"],
      });
    } finally {
      view.cleanup();
    }
  });

  test("disables per-card triggers only for targets currently exporting", () => {
    const onExport = vi.fn<(request: ExportRequest) => void>();
    const view = mount(
      <ExportCards onExport={onExport} exportingTargets={["menus" as ExportTarget]} />
    );

    try {
      const downloads = downloadButtons(view.container, "Download");
      const preparing = downloadButtons(view.container, "Preparing...");
      // Only the exporting card swaps its label and disables its trigger.
      expect(downloads).toHaveLength(3);
      expect(downloads.every((button) => !button.disabled)).toBe(true);
      expect(preparing).toHaveLength(1);
      expect(preparing[0]?.disabled).toBe(true);
      const exportingCard = preparing[0]?.closest("div.rounded-2xl");
      expect(exportingCard?.querySelector("h3")?.textContent).toBe("Navigation Menus");
    } finally {
      view.cleanup();
    }
  });

  test("re-checking a standalone option re-arms its card trigger", () => {
    const onExport = vi.fn<(request: ExportRequest) => void>();
    const view = mount(<ExportCards onExport={onExport} exportingTargets={[]} />);

    try {
      // "Menu records" has no prerequisites of its own: unchecking drops it and
      // its dependent, then re-checking brings only the standalone option back.
      clickCheckbox(view.container, "Menu records");
      expect(downloadButtons(view.container, "Download")[1]?.disabled).toBe(true);

      clickCheckbox(view.container, "Menu records");
      const menusDownload = downloadButtons(view.container, "Download")[1];
      expect(menusDownload?.disabled).toBe(false);

      React.act(() => {
        menusDownload?.click();
      });
      expect(onExport).toHaveBeenCalledWith({
        target: "menus",
        include: ["menus"],
      });
    } finally {
      view.cleanup();
    }
  });
});

describe("ImportExportPage export error branches", () => {
  test("surfaces api-client errors and clears the exporting state", async () => {
    importExportState.exportConfig.mockImplementationOnce(async () => {
      throw { kind: "api", message: "Export quota exhausted" };
    });
    const createObjectUrlSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:should-not-exist");
    const revokeObjectUrlSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const view = mount(<ImportExportPage />);

    try {
      clickDownload(view.container, 0);
      await flush();

      expect(importExportState.exportConfig).toHaveBeenCalledWith({
        target: "settings",
        include: ["settings"],
      });
      expect(view.container.textContent).toContain("Import/export error");
      expect(view.container.textContent).toContain("Export quota exhausted");
      // A failed export never produces a download artifact.
      expect(createObjectUrlSpy).not.toHaveBeenCalled();
      expect(revokeObjectUrlSpy).not.toHaveBeenCalled();

      // The finally branch releases the clicked card for another attempt.
      const downloads = downloadButtons(view.container, "Download");
      expect(downloads).toHaveLength(4);
      expect(downloads.every((button) => !button.disabled)).toBe(true);
    } finally {
      createObjectUrlSpy.mockRestore();
      revokeObjectUrlSpy.mockRestore();
      view.cleanup();
    }
  });

  test("falls back to a generic message for non-api export failures", async () => {
    importExportState.exportConfig
      .mockImplementationOnce(async () => {
        throw { kind: "api", message: "Export quota exhausted" };
      })
      .mockImplementationOnce(async () => {
        throw new Error("socket hang up");
      });
    const view = mount(<ImportExportPage />);

    try {
      clickDownload(view.container, 0);
      await flush();
      expect(view.container.textContent).toContain("Export quota exhausted");

      // A second failure that is not api-client shaped replaces the alert
      // with the generic fallback copy.
      clickDownload(view.container, 1);
      await flush();

      expect(view.container.textContent).toContain("Failed to export data.");
      expect(view.container.textContent).not.toContain("Export quota exhausted");
      expect(downloadButtons(view.container, "Download")).toHaveLength(4);
    } finally {
      view.cleanup();
    }
  });
});
