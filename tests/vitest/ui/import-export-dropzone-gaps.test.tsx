// @vitest-environment happy-dom

// Gap-coverage suite for core/admin/ui/import-export/ImportDropzone.tsx.
// Complements tests/vitest/ui/import-export.test.tsx with the branches that
// suite leaves open: browse-to-picker wiring, size-limit and malformed-JSON
// rejection, preview/apply failure surfaces (api-client, Error and opaque),
// drag-and-drop handlers, empty change events, cached-history rendering with
// unparsable dates, and preview warning lists.

import React from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type {
  ImportHistoryItem,
  ImportSummary,
} from "../../../core/admin/services/importExportClient";
import { ImportDropzone } from "../../../core/admin/ui/import-export/ImportDropzone";

const importExportState = vi.hoisted(() => ({
  previewImport: vi.fn(),
  importConfig: vi.fn(),
  getCachedImportHistory: vi.fn(),
  writeImportHistoryCache: vi.fn(),
}));

vi.mock("@/services/importExportClient", () => ({
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

const baseSummary: ImportSummary = {
  settings: 2,
  menus: 1,
  menuItems: 3,
  themeProfiles: 0,
  themeRoutes: 0,
  adminThemeTemplates: 1,
  adminThemeProfiles: 2,
  redirects: 4,
  warnings: [],
};

const sampleBundle = {
  version: 1,
  exportedAt: "2026-06-01T10:00:00.000Z",
  settings: { "site.name": "Coderso" },
  menus: [],
  themeProfiles: [],
  adminThemes: { templates: [], profiles: [] },
  redirects: [],
};

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const mountSubject = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(<ImportDropzone />);
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

const clickButtonByText = (container: HTMLElement, text: string) => {
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

const findButtonByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === text
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text}`);
  }
  return button;
};

const changeFileInput = (container: HTMLElement, file?: File) => {
  const input = container.querySelector("input[type='file']");
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("Missing file input");
  }
  if (file) {
    Object.defineProperty(input, "files", { value: [file], configurable: true });
  }
  React.act(() => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const findDropCard = (container: HTMLElement) => {
  const card = Array.from(container.querySelectorAll("div")).find((div) =>
    div.className.includes("border-dashed")
  );
  if (!card) {
    throw new Error("Missing dropzone card");
  }
  return card;
};

const fireDragEvent = (target: Element, type: string, dataTransfer?: { files?: File[] }) => {
  const event = new DragEvent(type, { bubbles: true, cancelable: true });
  if (dataTransfer) {
    Object.defineProperty(event, "dataTransfer", {
      configurable: true,
      value: dataTransfer,
    });
  }
  React.act(() => {
    target.dispatchEvent(event);
  });
};

const progressBarFor = (container: HTMLElement, fileName: string) => {
  const bar = Array.from(container.querySelectorAll("[role='progressbar']")).find(
    (candidate) => candidate.getAttribute("aria-label") === `${fileName} import progress`
  );
  if (!bar) {
    throw new Error(`Missing progress bar for ${fileName}`);
  }
  return bar;
};

beforeEach(() => {
  importExportState.previewImport.mockReset();
  importExportState.importConfig.mockReset();
  importExportState.writeImportHistoryCache.mockReset();
  importExportState.getCachedImportHistory.mockReset();
  importExportState.getCachedImportHistory.mockReturnValue([]);
});

describe("ImportDropzone gap coverage", () => {
  test("Browse Files opens the hidden file picker", () => {
    const view = mountSubject();

    try {
      const clickSpy = vi
        .spyOn(HTMLInputElement.prototype, "click")
        .mockImplementation(() => undefined);

      React.act(() => {
        clickButtonByText(view.container, "Browse Files");
      });

      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(importExportState.previewImport).not.toHaveBeenCalled();
      clickSpy.mockRestore();
    } finally {
      view.cleanup();
    }
  });

  test("rejects oversized bundles before any preview request", () => {
    const view = mountSubject();

    try {
      const oversizeFile = new File(["{}"], "huge-bundle.json", { type: "application/json" });
      Object.defineProperty(oversizeFile, "size", {
        configurable: true,
        value: 51 * 1024 * 1024,
      });
      const clickSpy = vi
        .spyOn(HTMLInputElement.prototype, "click")
        .mockImplementation(() => undefined);

      changeFileInput(view.container, oversizeFile);

      expect(view.container.textContent).toContain("Import error");
      expect(view.container.textContent).toContain("Import file exceeds the 50MB limit.");
      expect(view.container.textContent).toContain("huge-bundle.json");
      expect(view.container.textContent).toContain("Upload again");
      expect(progressBarFor(view.container, "huge-bundle.json").getAttribute("aria-valuenow")).toBe(
        "0"
      );
      expect(importExportState.previewImport).not.toHaveBeenCalled();

      // The failed-row recovery affordance reopens the same picker.
      React.act(() => {
        clickButtonByText(view.container, "Upload again");
      });
      expect(clickSpy).toHaveBeenCalledTimes(1);
      clickSpy.mockRestore();

      const persisted = importExportState.writeImportHistoryCache.mock.calls.at(-1)?.[0] as
        ImportHistoryItem[] | undefined;
      expect(persisted?.[0]).toMatchObject({
        fileName: "huge-bundle.json",
        status: "failed",
        failureReason: "Import file exceeds the 50MB limit.",
        progress: 0,
      });
    } finally {
      view.cleanup();
    }
  });

  test("reports malformed JSON without contacting the preview endpoint", async () => {
    const view = mountSubject();

    try {
      changeFileInput(
        view.container,
        new File(["{ definitely not json"], "broken.json", { type: "application/json" })
      );
      await flush();

      expect(view.container.textContent).toContain("Import file must contain valid JSON.");
      expect(importExportState.previewImport).not.toHaveBeenCalled();
      expect(progressBarFor(view.container, "broken.json").getAttribute("aria-valuenow")).toBe(
        "100"
      );
      expect(findButtonByText(view.container, "Browse Files").disabled).toBe(false);
    } finally {
      view.cleanup();
    }
  });

  test("keeps the validating state visible until the preview request settles", async () => {
    const previewDeferred = createDeferred<{ summary: ImportSummary }>();
    importExportState.previewImport.mockImplementation(() => previewDeferred.promise);
    const view = mountSubject();

    try {
      changeFileInput(
        view.container,
        new File([JSON.stringify(sampleBundle)], "pending.json", { type: "application/json" })
      );

      // Synchronous post-dispatch frame: the record is mid-validation.
      const validatingButton = findButtonByText(view.container, "Validating...");
      expect(validatingButton.disabled).toBe(true);
      expect(view.container.textContent).toContain("35% complete");
      expect(progressBarFor(view.container, "pending.json").getAttribute("aria-valuenow")).toBe(
        "35"
      );

      previewDeferred.resolve({ summary: baseSummary });
      await flush();

      expect(importExportState.previewImport).toHaveBeenCalledWith(sampleBundle);
      expect(view.container.textContent).toContain("Import Preview");
      expect(view.container.textContent).toContain(
        "Preview is ready. Apply import to make changes."
      );
      expect(findButtonByText(view.container, "Apply Import").disabled).toBe(false);
      expect(progressBarFor(view.container, "pending.json").getAttribute("aria-valuenow")).toBe(
        "65"
      );
    } finally {
      view.cleanup();
    }
  });

  test("surfaces api-client, Error, and opaque preview failures", async () => {
    importExportState.previewImport
      .mockImplementationOnce(async () => {
        throw { kind: "api", message: "Bundle exceeds plan limits" };
      })
      .mockImplementationOnce(async () => {
        throw new Error("Preview service unavailable");
      })
      .mockImplementationOnce(async () => {
        throw "total meltdown";
      });
    const view = mountSubject();

    try {
      changeFileInput(
        view.container,
        new File([JSON.stringify(sampleBundle)], "api-reject.json", { type: "application/json" })
      );
      await flush();
      expect(view.container.textContent).toContain("Bundle exceeds plan limits");

      changeFileInput(
        view.container,
        new File([JSON.stringify(sampleBundle)], "error-reject.json", { type: "application/json" })
      );
      await flush();
      expect(view.container.textContent).toContain("Preview service unavailable");

      changeFileInput(
        view.container,
        new File([JSON.stringify(sampleBundle)], "opaque-reject.json", { type: "application/json" })
      );
      await flush();
      expect(view.container.textContent).toContain("Failed to preview import file.");

      expect(importExportState.previewImport).toHaveBeenCalledTimes(3);
      for (const name of ["api-reject.json", "error-reject.json", "opaque-reject.json"]) {
        expect(progressBarFor(view.container, name).getAttribute("aria-valuenow")).toBe("100");
        expect(view.container.textContent).toContain(name);
      }
    } finally {
      view.cleanup();
    }
  });

  test("marks the record failed when applying the import rejects", async () => {
    const applyDeferred = createDeferred<{ summary: ImportSummary }>();
    importExportState.previewImport.mockResolvedValue({ summary: baseSummary });
    importExportState.importConfig.mockImplementation(() => applyDeferred.promise);
    const view = mountSubject();

    try {
      changeFileInput(
        view.container,
        new File([JSON.stringify(sampleBundle)], "apply-fail.json", { type: "application/json" })
      );
      await flush();

      React.act(() => {
        clickButtonByText(view.container, "Apply Import");
      });

      // Mid-flight: the record is applying and the trigger is locked.
      expect(view.container.textContent).toContain("80% complete");
      expect(progressBarFor(view.container, "apply-fail.json").getAttribute("aria-valuenow")).toBe(
        "80"
      );
      const importingButton = findButtonByText(view.container, "Importing...");
      expect(importingButton.disabled).toBe(true);

      applyDeferred.reject(new Error("Apply rejected"));
      await flush();

      expect(importExportState.importConfig).toHaveBeenCalledWith(sampleBundle);
      expect(view.container.textContent).toContain("Import error");
      expect(view.container.textContent).toContain("Apply rejected");
      expect(progressBarFor(view.container, "apply-fail.json").getAttribute("aria-valuenow")).toBe(
        "100"
      );
      expect(findButtonByText(view.container, "Apply Import").disabled).toBe(false);

      const persisted = importExportState.writeImportHistoryCache.mock.calls.at(-1)?.[0] as
        ImportHistoryItem[] | undefined;
      expect(persisted?.[0]).toMatchObject({
        fileName: "apply-fail.json",
        status: "failed",
        failureReason: "Apply rejected",
        progress: 100,
      });
    } finally {
      view.cleanup();
    }
  });

  test("accepts drops on the card and clears the drag highlight", async () => {
    importExportState.previewImport.mockResolvedValue({ summary: baseSummary });
    const view = mountSubject();

    try {
      const card = findDropCard(view.container);
      const heading = Array.from(card.querySelectorAll("h3")).find(
        (candidate) => candidate.textContent === "Drop your files here"
      );
      if (!heading) {
        throw new Error("Missing dropzone heading");
      }

      fireDragEvent(heading, "dragover");
      expect(card.className).toContain("border-primary/50");
      expect(card.className).toContain("bg-primary-soft/40");

      fireDragEvent(heading, "dragleave");
      expect(card.className).not.toContain("bg-primary-soft/40");

      fireDragEvent(heading, "dragover");
      fireDragEvent(heading, "drop", {
        files: [
          new File([JSON.stringify(sampleBundle)], "dropped.json", { type: "application/json" }),
        ],
      });

      // Dropping ends the drag highlight immediately.
      expect(card.className).not.toContain("bg-primary-soft/40");
      await flush();

      expect(importExportState.previewImport).toHaveBeenCalledWith(sampleBundle);
      expect(view.container.textContent).toContain("Import Preview");
      expect(view.container.textContent).toContain("dropped.json");
    } finally {
      view.cleanup();
    }
  });

  test("ignores change events fired without a selected file", () => {
    const view = mountSubject();

    try {
      changeFileInput(view.container);

      expect(importExportState.previewImport).not.toHaveBeenCalled();
      expect(view.container.textContent).not.toContain("Import error");
      expect(view.container.textContent).toContain("No import activity in this session.");
      expect(view.container.querySelectorAll("[role='progressbar']")).toHaveLength(0);
    } finally {
      view.cleanup();
    }
  });

  test("renders seeded session history verbatim, including unparsable dates", () => {
    importExportState.getCachedImportHistory.mockReturnValue([
      {
        id: "seed-applied",
        fileName: "seeded-applied.json",
        type: "JSON bundle",
        sizeBytes: 2048,
        status: "applied",
        progress: 100,
        createdAt: "not-a-real-timestamp",
        completedAt: null,
        failureReason: null,
        summary: null,
      },
      {
        id: "seed-preview",
        fileName: "seeded-preview.json",
        type: "JSON bundle",
        sizeBytes: 4096,
        status: "preview-ready",
        progress: 65,
        createdAt: "2026-01-15T08:30:00.000Z",
        completedAt: null,
        failureReason: null,
        summary: null,
      },
    ] satisfies ImportHistoryItem[]);
    const view = mountSubject();

    try {
      expect(view.container.textContent).toContain("seeded-applied.json");
      expect(view.container.textContent).toContain("seeded-preview.json");
      expect(view.container.textContent).toContain("Applied.");
      expect(view.container.textContent).toContain(
        "Preview is ready. Apply import to make changes."
      );
      // Unparsable dates fall through to the raw stored value instead of Invalid Date.
      expect(view.container.textContent).toContain("not-a-real-timestamp");
      expect(
        progressBarFor(view.container, "seeded-applied.json").getAttribute("aria-valuenow")
      ).toBe("100");
      expect(
        progressBarFor(view.container, "seeded-preview.json").getAttribute("aria-valuenow")
      ).toBe("65");
    } finally {
      view.cleanup();
    }
  });

  test("lists preview warnings beneath the summary grid", async () => {
    importExportState.previewImport.mockResolvedValue({
      summary: {
        ...baseSummary,
        warnings: ["Theme tokens renamed", "Menu 'footer' has no target page"],
      },
    });
    const view = mountSubject();

    try {
      changeFileInput(
        view.container,
        new File([JSON.stringify(sampleBundle)], "warned.json", { type: "application/json" })
      );
      await flush();

      expect(view.container.textContent).toContain("Warnings");
      const listItems = Array.from(view.container.querySelectorAll("li"));
      expect(listItems.map((item) => item.textContent)).toEqual([
        "Theme tokens renamed",
        "Menu 'footer' has no target page",
      ]);

      // Summary tiles reflect the resolved counts.
      const menuItemsTile = Array.from(view.container.querySelectorAll("p")).find(
        (paragraph) => paragraph.textContent === "Menu items"
      )?.parentElement;
      expect(menuItemsTile?.textContent).toContain("3");
    } finally {
      view.cleanup();
    }
  });
});

describe("ImportDropzone residual gap coverage", () => {
  test("surfaces the generic fallback when an error carries an empty message", async () => {
    importExportState.previewImport.mockRejectedValueOnce(new Error(""));
    const view = mountSubject();

    try {
      changeFileInput(
        view.container,
        new File([JSON.stringify(sampleBundle)], "empty-message.json", {
          type: "application/json",
        })
      );
      await flush();

      // An Error with an empty message falls through to the shared fallback copy.
      expect(view.container.textContent).toContain("Failed to preview import file.");
      expect(
        progressBarFor(view.container, "empty-message.json").getAttribute("aria-valuenow")
      ).toBe("100");
      const persisted = importExportState.writeImportHistoryCache.mock.calls.at(-1)?.[0] as
        ImportHistoryItem[] | undefined;
      expect(persisted?.[0]).toMatchObject({
        fileName: "empty-message.json",
        status: "failed",
        failureReason: "Failed to preview import file.",
      });
    } finally {
      view.cleanup();
    }
  });

  test("falls back to an empty history when the session cache yields nothing", () => {
    importExportState.getCachedImportHistory.mockReturnValue(undefined);
    const view = mountSubject();

    try {
      expect(view.container.textContent).toContain("No import activity in this session.");
      expect(view.container.querySelectorAll("[role='progressbar']")).toHaveLength(0);
    } finally {
      view.cleanup();
    }
  });

  test("filters recent imports through status labels and failure reasons", () => {
    importExportState.getCachedImportHistory.mockReturnValue([
      {
        id: "seed-failed-reason",
        fileName: "quota-bundle.json",
        type: "JSON bundle",
        sizeBytes: 4096,
        status: "failed",
        progress: 100,
        createdAt: "2026-02-01T00:00:00.000Z",
        completedAt: "2026-02-01T00:00:01.000Z",
        failureReason: "Export quota exceeded",
        summary: null,
      },
      {
        id: "seed-preview-label",
        fileName: "menu-bundle.json",
        type: "JSON bundle",
        sizeBytes: 8192,
        status: "preview-ready",
        progress: 65,
        createdAt: "2026-02-02T00:00:00.000Z",
        completedAt: null,
        failureReason: null,
        summary: null,
      },
    ] satisfies ImportHistoryItem[]);
    const view = mountSubject();

    try {
      const search = view.container.querySelector("input[type='search']");
      if (!(search instanceof HTMLInputElement)) throw new Error("Missing search input");
      const setSearch = (value: string) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        React.act(() => {
          setter?.call(search, value);
          search.dispatchEvent(new Event("input", { bubbles: true }));
        });
      };

      // Matching the failure-reason text narrows to the failed record only.
      setSearch("quota");
      expect(view.container.textContent).toContain("quota-bundle.json");
      expect(view.container.textContent).not.toContain("menu-bundle.json");

      // Matching the human status label finds the preview-ready record only.
      setSearch("Preview ready");
      expect(view.container.textContent).toContain("menu-bundle.json");
      expect(view.container.textContent).not.toContain("quota-bundle.json");
    } finally {
      view.cleanup();
    }
  });

  test("ignores drops that carry no file", async () => {
    const view = mountSubject();

    try {
      const card = findDropCard(view.container);
      const heading = Array.from(card.querySelectorAll("h3")).find(
        (candidate) => candidate.textContent === "Drop your files here"
      );
      if (!heading) throw new Error("Missing dropzone heading");

      fireDragEvent(heading, "dragover");
      expect(card.className).toContain("bg-primary-soft/40");

      // An empty transfer list clears the drag highlight but starts nothing.
      fireDragEvent(heading, "drop", { files: [] });
      expect(card.className).not.toContain("bg-primary-soft/40");
      await flush();

      expect(importExportState.previewImport).not.toHaveBeenCalled();
      expect(view.container.textContent).toContain("No import activity in this session.");
    } finally {
      view.cleanup();
    }
  });

  test("renders a failed record without a stored reason as Import failed", () => {
    importExportState.getCachedImportHistory.mockReturnValue([
      {
        id: "seed-failed-bare",
        fileName: "bare-failure.json",
        type: "JSON bundle",
        sizeBytes: 2048,
        status: "failed",
        progress: 100,
        createdAt: "2026-03-01T00:00:00.000Z",
        completedAt: "2026-03-01T00:00:01.000Z",
        failureReason: null,
        summary: null,
      },
    ] satisfies ImportHistoryItem[]);
    const view = mountSubject();

    try {
      expect(view.container.textContent).toContain("bare-failure.json");
      expect(view.container.textContent).toContain("Import failed.");
      expect(view.container.textContent).toContain("Upload again");
      expect(
        progressBarFor(view.container, "bare-failure.json").getAttribute("aria-valuenow")
      ).toBe("100");
    } finally {
      view.cleanup();
    }
  });
});
