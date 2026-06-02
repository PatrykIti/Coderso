// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi, beforeEach, afterEach } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

const importExportState = vi.hoisted(() => ({
  previewImport: vi.fn(async () => ({
    summary: {
      settings: 1,
      menus: 0,
      menuItems: 0,
      themeProfiles: 0,
      themeRoutes: 0,
      adminThemeTemplates: 0,
      adminThemeProfiles: 0,
      redirects: 0,
      warnings: [],
    },
  })),
  importConfig: vi.fn(async () => ({
    summary: {
      settings: 1,
      menus: 0,
      menuItems: 0,
      themeProfiles: 0,
      themeRoutes: 0,
      adminThemeTemplates: 0,
      adminThemeProfiles: 0,
      redirects: 0,
      warnings: [],
    },
  })),
  exportConfig: vi.fn(async () => ({
    version: 1,
    exportedAt: "2026-06-01T10:00:00.000Z",
    scope: { target: "settings", include: ["settings"] },
    settings: { "site.name": "Coderso" },
    menus: [],
    themeProfiles: [],
    adminThemes: { templates: [], profiles: [] },
    redirects: [],
  })),
}));

vi.mock("@/services/importExportClient", () => ({
  previewImport: importExportState.previewImport,
  importConfig: importExportState.importConfig,
  exportConfig: importExportState.exportConfig,
  getCachedImportHistory: vi.fn(() => []),
  writeImportHistoryCache: vi.fn(),
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    (error as { kind?: string }).kind === "api",
}));

import { ExportCards } from "../../../core/admin/ui/import-export/ExportCards";
import { ImportDropzone } from "../../../core/admin/ui/import-export/ImportDropzone";
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

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === text
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text}`);
  }
  React.act(() => {
    button.click();
  });
};

const changeFileInput = (container: HTMLElement, file: File) => {
  const input = container.querySelector("input[type='file']");
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("Missing file input");
  }
  Object.defineProperty(input, "files", {
    value: [file],
    configurable: true,
  });
  React.act(() => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const changeTextInput = (input: HTMLInputElement, value: string) => {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  React.act(() => {
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

beforeEach(() => {
  importExportState.previewImport.mockClear();
  importExportState.importConfig.mockClear();
  importExportState.exportConfig.mockClear();
});

afterEach(() => {
  document.body.innerHTML = "";
});

test("ImportExportPage renders truthful export cards and JSON-only import copy", () => {
  const html = renderAdminUi(<ImportExportPage />);

  expect(html).toContain("Export Data");
  expect(html).toContain("Site Settings");
  expect(html).toContain("Navigation Menus");
  expect(html).toContain("Theme Configuration");
  expect(html).toContain("Redirect Rules");
  expect(html).toContain("Drop or choose a .json configuration bundle up to 50MB");
  expect(html).not.toContain("Content Types");
  expect(html).not.toContain("Live & draft content");
  expect(html).not.toContain(".csv");
  expect(html).not.toContain(".zip");
});

test("ExportCards sends controlled target and include options", () => {
  const onExport = vi.fn();
  const view = mount(<ExportCards onExport={onExport} exportingTargets={[]} />);

  try {
    const menuItemsLabel = Array.from(view.container.querySelectorAll("label")).find((label) =>
      label.textContent?.includes("Menu items")
    );
    const menuItemsCheckbox = menuItemsLabel?.querySelector("button");
    if (!(menuItemsCheckbox instanceof HTMLButtonElement)) {
      throw new Error("Missing Menu items checkbox");
    }

    React.act(() => {
      menuItemsCheckbox.click();
    });

    const downloadButtons = Array.from(view.container.querySelectorAll("button")).filter(
      (button) => button.textContent?.trim() === "Download"
    );
    React.act(() => {
      downloadButtons[1]!.click();
    });

    expect(onExport).toHaveBeenCalledWith({
      target: "menus",
      include: ["menus"],
    });

    const chevronButtons = Array.from(view.container.querySelectorAll("button")).filter((button) =>
      button.getAttribute("aria-label")?.includes("advanced export options")
    );
    expect(chevronButtons.every((button) => button.disabled)).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("ImportDropzone rejects unsupported files and filters local activity", async () => {
  const view = mount(<ImportDropzone />);

  try {
    changeFileInput(view.container, new File(["a,b"], "bad.csv", { type: "text/csv" }));
    await flush();

    expect(view.container.textContent).toContain(
      "Only .json configuration bundles can be imported."
    );
    expect(view.container.textContent).toContain("bad.csv");
    expect(view.container.textContent).toContain("Upload again");

    const search = view.container.querySelector("input[type='search']");
    if (!(search instanceof HTMLInputElement)) throw new Error("Missing search input");
    changeTextInput(search, "missing");
    expect(view.container.textContent).toContain("No imports match your search.");

    changeTextInput(search, "bad");
    expect(view.container.textContent).toContain("bad.csv");
  } finally {
    view.cleanup();
  }
});

test("ImportDropzone previews valid JSON and records completed progress", async () => {
  const view = mount(<ImportDropzone />);

  try {
    const bundle = {
      version: 1,
      exportedAt: "2026-06-01T10:00:00.000Z",
      settings: {},
      menus: [],
      themeProfiles: [],
      adminThemes: { templates: [], profiles: [] },
      redirects: [],
    };

    changeFileInput(
      view.container,
      new File([JSON.stringify(bundle)], "bundle.json", { type: "application/json" })
    );
    await flush();

    expect(importExportState.previewImport).toHaveBeenCalledWith(bundle);
    expect(view.container.textContent).toContain("Import Preview");
    expect(view.container.textContent).toContain("bundle.json");
    const progressbar = view.container.querySelector("[role='progressbar']");
    expect(progressbar?.getAttribute("aria-valuenow")).toBe("65");

    clickByText(view.container, "Apply Import");
    await flush();
    expect(importExportState.importConfig).toHaveBeenCalledWith(bundle);
    const appliedProgressbar = view.container.querySelector("[role='progressbar']");
    expect(appliedProgressbar?.getAttribute("aria-valuenow")).toBe("100");
  } finally {
    view.cleanup();
  }
});
