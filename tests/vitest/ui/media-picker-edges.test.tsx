// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { ApiClientError } from "../../../core/admin/services/apiClient";
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

const mountPicker = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  const cleanup = () => {
    React.act(() => root.unmount());
    container.remove();
  };
  return { container, cleanup };
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

const dialogText = () => document.body.querySelector('[role="dialog"]')?.textContent ?? "";

afterEach(() => {
  vi.restoreAllMocks();
  clearMediaCache();
  window.localStorage.clear();
});

test("MediaPicker accepts every item when the accept pattern is the */* wildcard", async () => {
  writeMediaCache([
    mediaRecord({ id: "png", title: "PNG image", type: "image", mimeType: "image/png" }),
    mediaRecord({
      id: "pdf",
      key: "guide.pdf",
      url: "/media/guide.pdf",
      title: "PDF guide",
      originalName: "guide.pdf",
      type: "file",
      mimeType: "application/pdf",
    }),
  ]);
  const view = mountPicker(
    <MediaPicker value={null} onChange={() => undefined} accept={["*/*"]} />
  );
  try {
    clickButtonByText(view.container, "Browse media");
    await flushEffects();
    expect(dialogText()).toContain("PNG image");
    expect(dialogText()).toContain("PDF guide");
  } finally {
    view.cleanup();
  }
});

test("MediaPicker audio and video wildcards admit only matching kinds", async () => {
  writeMediaCache([
    mediaRecord({
      id: "mp3",
      key: "clip.mp3",
      url: "/media/clip.mp3",
      title: "Voice clip",
      originalName: "clip.mp3",
      type: "file",
      mimeType: "audio/mpeg",
    }),
    mediaRecord({
      id: "mp4",
      key: "movie.mp4",
      url: "/media/movie.mp4",
      title: "Movie",
      originalName: "movie.mp4",
      type: "file",
      mimeType: "video/mp4",
    }),
    mediaRecord({
      id: "png",
      key: "photo.png",
      url: "/media/photo.png",
      title: "Photo",
      originalName: "photo.png",
      type: "image",
      mimeType: "image/png",
    }),
  ]);
  const view = mountPicker(
    <MediaPicker value={null} onChange={() => undefined} accept={["audio/*", "video/*"]} />
  );
  try {
    clickButtonByText(view.container, "Browse media");
    await flushEffects();
    const text = dialogText();
    expect(text).toContain("Voice clip");
    expect(text).toContain("Movie");
    expect(text).not.toContain("Photo");
  } finally {
    view.cleanup();
  }
});

test("MediaPicker surfaces the API error message when listing fails with ApiClientError", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new ApiClientError("media_list_failed", "List failed", 500);
  };
  const view = mountPicker(<MediaPicker value={null} onChange={() => undefined} />);
  try {
    clickButtonByText(view.container, "Browse media");
    await flushEffects();
    expect(dialogText()).toContain("List failed");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("MediaPicker falls back to a generic message for non-API load failures", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new TypeError("network down");
  };
  const view = mountPicker(<MediaPicker value={null} onChange={() => undefined} />);
  try {
    clickButtonByText(view.container, "Browse media");
    await flushEffects();
    expect(dialogText()).toContain("Failed to load media assets.");
  } finally {
    view.cleanup();
    globalThis.fetch = originalFetch;
  }
});

test("MediaPicker ignores a pending load result after unmount", async () => {
  const originalFetch = globalThis.fetch;
  let resolveLoad: ((response: Response) => void) | null = null;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/media")) {
      return new Promise<Response>((resolve) => {
        resolveLoad = resolve;
      });
    }
    return jsonResponse({});
  };
  const view = mountPicker(<MediaPicker value={null} onChange={() => undefined} />);
  clickButtonByText(view.container, "Browse media");
  await React.act(async () => {
    await Promise.resolve();
  });
  // Unmount while the list request is still pending.
  view.cleanup();
  await React.act(async () => {
    resolveLoad?.(
      jsonResponse({
        items: [mediaRecord({ id: "late-1", title: "Late asset" })],
        pagination: { page: 1, pageSize: 50, total: 1 },
      })
    );
    await Promise.resolve();
  });
  // The stale result must not reach the DOM (dialog is gone, nothing thrown).
  expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  globalThis.fetch = originalFetch;
});

test("MediaPicker filters items by a search query across display name and original name", async () => {
  writeMediaCache([
    mediaRecord({ id: "hero", title: "Hero banner" }),
    mediaRecord({
      id: "logo",
      key: "logo.png",
      title: "Logo mark",
      originalName: "logo-final.png",
    }),
  ]);
  const view = mountPicker(<MediaPicker value={null} onChange={() => undefined} />);
  try {
    clickButtonByText(view.container, "Browse media");
    await flushEffects();
    expect(dialogText()).toContain("Hero banner");
    const input = document.body.querySelector('input[placeholder="Search by name or title..."]');
    expect(input).toBeInstanceOf(HTMLInputElement);
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    React.act(() => {
      descriptor?.set?.call(input, "logo-final");
      input?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(dialogText()).toContain("Logo mark");
    expect(dialogText()).not.toContain("Hero banner");
  } finally {
    view.cleanup();
  }
});

test("MediaPicker multi-select toggles items and honors maxItems", async () => {
  writeMediaCache([
    mediaRecord({ id: "a", title: "Asset A" }),
    mediaRecord({ id: "b", title: "Asset B" }),
    mediaRecord({ id: "c", title: "Asset C" }),
  ]);
  const changes: Array<string[]> = [];

  function MultiHarness() {
    const [value, setValue] = React.useState<string[]>([]);
    return (
      <div>
        <MediaPicker
          value={value}
          multiple
          maxItems={2}
          onChange={(next) => {
            const asArray = next as string[];
            changes.push(asArray);
            setValue(asArray);
          }}
        />
        <output data-testid="multi-value">{value.join("|")}</output>
      </div>
    );
  }
  const view = mountPicker(<MultiHarness />);
  try {
    clickButtonByText(view.container, "Browse media");
    await flushEffects();

    const selectCard = (id: string) => {
      const card = Array.from(document.body.querySelectorAll("button")).find((b) =>
        b.textContent?.includes(`Asset ${id}`)
      );
      if (!card) throw new Error(`Missing card ${id}`);
      React.act(() => {
        card.click();
      });
    };

    selectCard("A");
    selectCard("B");
    expect(changes).toEqual([["a"], ["a", "b"]]);
    // Max reached: selecting C is a no-op.
    selectCard("C");
    expect(changes).toHaveLength(2);
    // Toggling A off removes it.
    selectCard("A");
    expect(changes).toEqual([["a"], ["a", "b"], ["b"]]);
  } finally {
    view.cleanup();
  }
});

test("MediaPicker single-select replace value and close dialog on selection", async () => {
  writeMediaCache([
    mediaRecord({ id: "a", title: "Asset A" }),
    mediaRecord({ id: "b", title: "Asset B" }),
  ]);
  const changes: Array<string | null> = [];
  const view = mountPicker(
    <MediaPicker value="a" onChange={(next) => changes.push(next as string | null)} />
  );
  try {
    clickButtonByText(view.container, "Browse media");
    await flushEffects();
    expect(view.container.textContent).toContain("Asset A");
    const bCard = Array.from(document.body.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Asset B")
    );
    React.act(() => {
      bCard?.click();
    });
    expect(changes).toEqual(["b"]);
    // Dialog closes after a single-select pick.
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("MediaPicker remove button clears a single selection and filters multi-selections", async () => {
  writeMediaCache([
    mediaRecord({ id: "a", title: "Asset A" }),
    mediaRecord({ id: "b", title: "Asset B" }),
  ]);
  const singleChanges: Array<string | null> = [];

  function SingleHarness() {
    const [value, setValue] = React.useState<string | null>("a");
    return (
      <div>
        <MediaPicker
          value={value}
          onChange={(next) => {
            const asValue = next as string | null;
            singleChanges.push(asValue);
            setValue(asValue);
          }}
        />
        <output data-testid="single-value">{value ?? "none"}</output>
      </div>
    );
  }
  const singleView = mountPicker(<SingleHarness />);
  try {
    await flushEffects();
    const remove = singleView.container.querySelector('button[data-size="icon"]');
    expect(remove).toBeTruthy();
    React.act(() => {
      remove?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(singleChanges).toEqual([null]);
    expect(singleView.container.textContent).toContain("No media selected yet.");
  } finally {
    singleView.cleanup();
  }

  const multiChanges: Array<string[]> = [];
  function MultiHarness() {
    const [value, setValue] = React.useState<string[]>(["a", "b"]);
    return (
      <div>
        <MediaPicker
          value={value}
          multiple
          onChange={(next) => {
            const asArray = next as string[];
            multiChanges.push(asArray);
            setValue(asArray);
          }}
        />
        <output data-testid="multi-value">{value.join("|")}</output>
      </div>
    );
  }
  const multiView = mountPicker(<MultiHarness />);
  try {
    await flushEffects();
    const removeButtons = multiView.container.querySelectorAll('button[data-size="icon"]');
    expect(removeButtons).toHaveLength(2);
    React.act(() => {
      removeButtons[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(multiChanges).toEqual([["b"]]);
  } finally {
    multiView.cleanup();
  }
});

test("MediaPicker ignores a pending load rejection after unmount", async () => {
  const originalFetch = globalThis.fetch;
  let rejectLoad: ((reason: unknown) => void) | null = null;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/media")) {
      return new Promise<Response>((_resolve, reject) => {
        rejectLoad = reject;
      });
    }
    return jsonResponse({});
  };
  const view = mountPicker(<MediaPicker value={null} onChange={() => undefined} />);
  clickButtonByText(view.container, "Browse media");
  await React.act(async () => {
    await Promise.resolve();
  });
  view.cleanup();
  await React.act(async () => {
    rejectLoad?.(new TypeError("late network failure"));
    await Promise.resolve();
  });
  expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  globalThis.fetch = originalFetch;
});
