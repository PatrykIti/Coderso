// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { clearMediaCache, type MediaRecord } from "../../../core/admin/services/mediaClient";
import { MediaPicker } from "../../../core/admin/ui/media/MediaPicker";
import { normalizeMediaPickerValue } from "../../../core/admin/ui/media/mediaPickerValue";

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

test("normalizeMediaPickerValue preserves string ids and rejects non-string ids", () => {
  expect(normalizeMediaPickerValue("asset-1", false)).toBe("asset-1");
  expect(normalizeMediaPickerValue(["asset-1", "asset-2"], true)).toEqual(["asset-1", "asset-2"]);
  expect(normalizeMediaPickerValue(42, false)).toBeNull();
  expect(normalizeMediaPickerValue({ id: "asset-1" }, false)).toBeNull();
  expect(normalizeMediaPickerValue(["asset-1", 42, { id: "asset-2" }], true)).toEqual(["asset-1"]);
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

test("MediaPicker dialog has a shared description without Radix warnings across editor fields", async () => {
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
        "Choose an existing media asset for this editor field."
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

test("MediaPicker applies trigger/remove chrome overrides so dark surfaces never invert", async () => {
  const originalFetch = globalThis.fetch;
  writeMediaCache([mediaRecord({ title: "Removable asset" })]);
  globalThis.fetch = async () => jsonResponse([]);

  const view = mountPicker(
    <MediaPicker
      value="asset-1"
      onChange={() => undefined}
      triggerButtonClassName="bg-white/10 text-slate-100 hover:bg-white/20"
      removeButtonClassName="text-slate-200 hover:bg-white/10"
    />
  );
  try {
    await flushEffects();

    const browse = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Browse media")
    );
    expect(browse).toBeTruthy();
    // tailwind-merge drops the conflicting admin-theme outline idle/hover
    // classes in favor of the dark-surface chrome.
    expect(browse?.className).toContain("bg-white/10");
    expect(browse?.className).toContain("hover:bg-white/20");
    expect(browse?.className).not.toContain("bg-transparent");
    expect(browse?.className).not.toContain("--admin-button-outline-hover-bg");

    const remove = view.container.querySelector('button[data-size="icon"]');
    expect(remove).toBeTruthy();
    expect(remove?.className).toContain("hover:bg-white/10");
    expect(remove?.className).not.toContain("--admin-button-ghost-hover-bg");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
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

test("MediaPicker image wildcard admits only projected passive images", async () => {
  writeMediaCache([
    mediaRecord({ id: "png", title: "Passive PNG", type: "image", mimeType: "image/png" }),
    mediaRecord({
      id: "svg",
      key: "icon.svg",
      url: "/media/icon.svg",
      title: "Active SVG",
      originalName: "icon.svg",
      type: "file",
      mimeType: "image/svg+xml",
    }),
    mediaRecord({
      id: "mismatched-png",
      key: "legacy.png",
      url: "/media/legacy.png",
      title: "Mismatched PNG file",
      originalName: "legacy.png",
      type: "file",
      mimeType: "image/png",
    }),
    mediaRecord({
      id: "avif",
      key: "legacy.avif",
      url: "/media/legacy.avif",
      title: "Unsupported image",
      originalName: "legacy.avif",
      type: "image",
      mimeType: "image/avif",
    }),
  ]);

  const view = mountPicker(
    <MediaPicker value={null} onChange={() => undefined} accept={["image/*"]} />
  );
  try {
    clickButtonByText(view.container, "Browse media");
    await flushEffects();

    const dialogText = document.body.querySelector('[role="dialog"]')?.textContent ?? "";
    expect(dialogText).toContain("Passive PNG");
    expect(dialogText).not.toContain("Active SVG");
    expect(dialogText).not.toContain("Mismatched PNG file");
    expect(dialogText).not.toContain("Unsupported image");
  } finally {
    view.cleanup();
  }
});

test("MediaPicker exact SVG MIME wins alongside the image wildcard without enabling preview", async () => {
  writeMediaCache([
    mediaRecord({ id: "png", title: "Passive PNG", type: "image", mimeType: "image/png" }),
    mediaRecord({
      id: "svg",
      key: "icon.svg",
      url: "/media/icon.svg",
      title: "Exact SVG attachment",
      originalName: "icon.svg",
      type: "file",
      mimeType: "image/svg+xml",
    }),
  ]);

  const view = mountPicker(
    <MediaPicker value={null} onChange={() => undefined} accept={["image/*", "image/svg+xml"]} />
  );
  try {
    clickButtonByText(view.container, "Browse media");
    await flushEffects();

    const dialogText = document.body.querySelector('[role="dialog"]')?.textContent ?? "";
    expect(dialogText).toContain("Exact SVG attachment");
    expect(dialogText).toContain("Passive PNG");
    expect(document.body.querySelector('img[src="/media/icon.svg"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("MediaPicker non-image wildcard agrees with the projected document kind", async () => {
  writeMediaCache([
    mediaRecord({
      id: "pdf",
      key: "guide.pdf",
      url: "/media/guide.pdf",
      title: "PDF guide",
      originalName: "guide.pdf",
      type: "file",
      mimeType: "application/pdf",
    }),
    mediaRecord({
      id: "mismatch",
      key: "mismatch.pdf",
      url: "/media/mismatch.pdf",
      title: "Mismatched audio",
      originalName: "mismatch.pdf",
      type: "file",
      mimeType: "audio/mpeg",
    }),
  ]);

  const view = mountPicker(
    <MediaPicker value={null} onChange={() => undefined} accept={["application/*"]} />
  );
  try {
    clickButtonByText(view.container, "Browse media");
    await flushEffects();

    const dialogText = document.body.querySelector('[role="dialog"]')?.textContent ?? "";
    expect(dialogText).toContain("PDF guide");
    expect(dialogText).not.toContain("Mismatched audio");
  } finally {
    view.cleanup();
  }
});
