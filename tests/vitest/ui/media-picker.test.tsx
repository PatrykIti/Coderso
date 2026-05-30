// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { clearMediaCache, type MediaRecord } from "../../../core/admin/services/mediaClient";
import { MediaPicker } from "../../../core/admin/ui/media/MediaPicker";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const mediaRecord = (overrides: Partial<MediaRecord> = {}): MediaRecord => ({
  id: overrides.id ?? "asset-1",
  key: overrides.key ?? "asset-1.png",
  url: overrides.url ?? "https://example.com/asset-1.png",
  type: overrides.type ?? "image",
  mimeType: overrides.mimeType ?? "image/png",
  size: overrides.size ?? 2048,
  width: overrides.width ?? 100,
  height: overrides.height ?? 100,
  alt: overrides.alt ?? null,
  title: overrides.title ?? "Cached picker asset",
  caption: overrides.caption ?? null,
  originalName: overrides.originalName ?? "asset-1.png",
  createdAt: overrides.createdAt ?? "2026-04-24T00:00:00.000Z",
  createdBy: overrides.createdBy ?? null,
});

const writeMediaCache = (rows: MediaRecord[]) => {
  window.localStorage.setItem(
    cacheKeys.mediaList,
    JSON.stringify({ value: rows, savedAt: Date.now() })
  );
};

const flushEffects = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const clickButtonByText = (root: ParentNode, label: string) => {
  const button = Array.from(root.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === label
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${label}`);
  }
  React.act(() => {
    button.click();
  });
};

const getDialogDescription = (dialog: Element) => {
  const describedBy = dialog.getAttribute("aria-describedby");
  expect(describedBy).toBeTruthy();
  const ids = describedBy?.split(/\s+/).filter(Boolean) ?? [];
  const descriptions = ids.map((id) => document.getElementById(id)).filter(Boolean);
  expect(descriptions).toHaveLength(ids.length);
  return descriptions.map((element) => element?.textContent ?? "").join(" ");
};

const hasMissingDialogDescriptionWarning = (calls: unknown[][]) =>
  calls.some((args) => {
    const message = args.map((arg) => String(arg)).join(" ");
    return (
      message.includes("Missing") &&
      message.includes("Description") &&
      message.includes("DialogContent")
    );
  });

const mountPicker = (node: React.ReactNode) => {
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

afterEach(() => {
  vi.restoreAllMocks();
  clearMediaCache();
  window.localStorage.clear();
});

test("MediaPicker renders browse button", () => {
  const html = renderAdminUi(<MediaPicker value={null} onChange={() => undefined} />);

  expect(html).toContain("Browse media");
});

test("MediaPicker shows loading state for selected media until assets are resolved", () => {
  const html = renderAdminUi(<MediaPicker value="asset-1" onChange={() => undefined} />);

  expect(html).toContain("Loading selected media...");
});

test("MediaPicker stays idle while closed without a selection", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };

  const view = mountPicker(<MediaPicker value={null} onChange={() => undefined} />);
  try {
    await flushEffects();

    expect(view.container.textContent).toContain("No media selected yet.");
    expect(calls.filter((call) => String(call.input) === "/admin/api/media")).toHaveLength(0);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("MediaPicker dialog has a shared description without Radix warnings across widget fields", async () => {
  writeMediaCache([mediaRecord({ title: "Shared media asset" })]);
  const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

  const view = mountPicker(
    <div>
      <section aria-label="Hero media field">
        <MediaPicker value={null} onChange={() => undefined} accept={["image/*"]} />
      </section>
      <section aria-label="Logo Cloud media field">
        <MediaPicker value={null} onChange={() => undefined} accept={["image/*"]} />
      </section>
    </div>
  );

  try {
    await flushEffects();

    for (const sectionLabel of ["Hero media field", "Logo Cloud media field"]) {
      const section = view.container.querySelector(`section[aria-label="${sectionLabel}"]`);
      expect(section).toBeInstanceOf(HTMLElement);

      clickButtonByText(section as ParentNode, "Browse media");
      await flushEffects();

      const dialog = document.body.querySelector('[role="dialog"]');
      expect(dialog).toBeInstanceOf(HTMLElement);
      expect(getDialogDescription(dialog!)).toContain(
        "Choose an existing media asset for this widget field."
      );
      expect(dialog?.textContent).toContain("Shared media asset");

      clickButtonByText(document.body, "Done");
      await flushEffects();
    }

    expect(hasMissingDialogDescriptionWarning(consoleWarn.mock.calls)).toBe(false);
    expect(hasMissingDialogDescriptionWarning(consoleError.mock.calls)).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("MediaPicker resolves selected media from cache without fetching media", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  writeMediaCache([mediaRecord({ title: "Picker cached asset" })]);
  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([mediaRecord({ title: "Network asset" })]);
  };

  const view = mountPicker(<MediaPicker value="asset-1" onChange={() => undefined} />);
  try {
    await flushEffects();

    expect(view.container.textContent).toContain("Picker cached asset");
    expect(view.container.textContent).not.toContain("Loading selected media");
    expect(calls.filter((call) => String(call.input) === "/admin/api/media")).toHaveLength(0);
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});
