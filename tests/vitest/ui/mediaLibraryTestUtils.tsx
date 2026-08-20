import React from "react";
import { createRoot } from "react-dom/client";

import type { MediaRecord } from "../../../core/admin/services/mediaClient";
import type { MediaFolder } from "../../../core/admin/ui/media/types";
import { MediaLibraryPage } from "../../../core/admin/ui/media/MediaLibraryPage";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

export const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const userSettingsResponse = {
  "pages.openAfterCreate": false,
  "media.openAfterUpload": false,
  "widgets.hero.presets": [],
  "posts.editor.preferences": {},
  "assistant.mode": null,
  "assistant.ui.enabled": true,
  "assistant.ui.avatarEnabled": false,
  "assistant.ui.avatarAsset": null,
};

export const mediaRecord = (overrides: Partial<MediaRecord> = {}): MediaRecord => ({
  id: overrides.id ?? "media-1",
  key: overrides.key ?? "key-1",
  url: overrides.url ?? "https://example.com/a.jpg",
  type: overrides.type ?? "image",
  mimeType: overrides.mimeType ?? "image/jpeg",
  size: overrides.size ?? 1234,
  width: overrides.width ?? 100,
  height: overrides.height ?? 100,
  alt: overrides.alt ?? null,
  title: overrides.title ?? "Cached asset",
  caption: overrides.caption ?? null,
  originalName: overrides.originalName ?? "a.jpg",
  createdAt: overrides.createdAt ?? "2026-02-15T00:00:00.000Z",
  createdBy: overrides.createdBy ?? null,
});

export const writeMediaCache = (rows: MediaRecord[]) => {
  window.localStorage.setItem(
    cacheKeys.mediaList,
    JSON.stringify({ value: rows, savedAt: Date.now() })
  );
};

export const flushEffects = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

export const click = async (element: Element | null) => {
  if (!element) {
    throw new Error("Expected element to exist before clicking");
  }
  await React.act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
  });
};

export const getButton = (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (entry) => entry.textContent?.trim() === label
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Expected button "${label}" to exist`);
  }
  return button;
};

export const mountMediaLibrary = (options?: { strict?: boolean }) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const page = (
    <AdminRouterProvider initialPath="/admin/media">
      <MediaLibraryPage />
    </AdminRouterProvider>
  );
  React.act(() => {
    root.render(options?.strict ? <React.StrictMode>{page}</React.StrictMode> : page);
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

export const folder = (overrides: Partial<MediaFolder> = {}): MediaFolder => ({
  id: overrides.id ?? "folder-1",
  name: overrides.name ?? "Marketing",
  slug: overrides.slug ?? "marketing",
  parentId: overrides.parentId ?? null,
  orderIndex: overrides.orderIndex ?? 0,
  createdAt: overrides.createdAt ?? "2026-02-15T00:00:00.000Z",
});

export const setInputValue = async (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")?.set;
  await React.act(async () => {
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();
  });
};

export const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

export const getAriaButton = (container: ParentNode, label: string) => {
  const button = container.querySelector(`button[aria-label="${label}"]`);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Expected aria button "${label}" to exist`);
  }
  return button;
};

export const folderRowIds = (container: ParentNode) =>
  Array.from(container.querySelectorAll("[data-media-folder-id]")).map((row) =>
    row.getAttribute("data-media-folder-id")
  );

export const apiErrorResponse = (code: string, message: string, status = 500) =>
  jsonResponse({ error: { code, message, details: `<b>SQL stack for ${message}</b>` } }, status);

export const getFiltersButton = (container: HTMLElement) => {
  const button = Array.from(container.querySelectorAll("button")).find((entry) =>
    entry.textContent?.trim().startsWith("Filters")
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error("Expected Filters button to exist");
  }
  return button;
};

export const gridSelectLabels = () =>
  Array.from(document.querySelectorAll('button[aria-label^="Select "]'))
    .map((el) => el.getAttribute("aria-label"))
    .filter((label): label is string => label !== null && label !== "Select visible");

export const hasGridItem = (name: string) =>
  document.querySelector(`button[aria-label="Select ${name}"]`) !== null;

export const createLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

// TASK-512-06 page integration ------------------------------------------------

export const GB = 1024 ** 3;

export const flushRaf = async () => {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
};

export const getPanelButton = (text: string) => {
  const button = Array.from(document.querySelectorAll("button")).find(
    (entry) => entry.textContent?.trim() === text
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Expected panel button "${text}" to exist`);
  }
  return button;
};

export const setSelectValue = async (select: HTMLSelectElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(select), "value")?.set;
  await React.act(async () => {
    setter?.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();
  });
};
