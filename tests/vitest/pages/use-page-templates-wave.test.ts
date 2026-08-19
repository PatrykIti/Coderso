// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { usePageTemplates } from "../../../core/admin/ui/pages/templates/usePageTemplates";

// TASK-105-05 LEAF B1: usePageTemplates hook branches in isolation — cache-hit
// seeding, force-refresh, error resolution variants, skip options, and the
// cacheBus subscription add/remove lifecycle.

type TemplateStatus = "draft" | "published";

type TemplateSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  status: TemplateStatus;
  sectionsCount: number;
  createdAt: string;
  updatedAt: string;
};

type ApiError = { kind: "api"; message: string };

const hookState = vi.hoisted(() => {
  const listeners = new Set<(event: { key: string }) => void>();
  const state = {
    cached: null as TemplateSummary[] | null,
    items: [] as TemplateSummary[],
    nextListError: null as unknown,
    listCalls: [] as Array<{ force?: boolean }>,
    apiError(message: string): ApiError {
      return { kind: "api", message };
    },
    reset() {
      listeners.clear();
      state.cached = null;
      state.items = [];
      state.nextListError = null;
      state.listCalls = [];
    },
    trigger(key: string) {
      for (const listener of [...listeners]) listener({ key });
    },
    subscribe(listener: (event: { key: string }) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    listenerCount() {
      return listeners.size;
    },
  };
  return state;
});

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    (error as { kind?: string }).kind === "api",
}));

vi.mock("@/services/pageTemplatesClient", () => ({
  getCachedPageTemplates: () => hookState.cached,
  listPageTemplatesCached: async (options?: { force?: boolean }) => {
    hookState.listCalls.push({ force: options?.force });
    const error = hookState.nextListError;
    if (error) {
      hookState.nextListError = null;
      throw error;
    }
    return hookState.items;
  },
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: (listener: (event: { key: string }) => void) =>
    hookState.subscribe(listener),
}));

const summary = (overrides: Partial<TemplateSummary> = {}): TemplateSummary => ({
  id: "tpl-1",
  name: "Landing stack",
  slug: "landing-stack",
  description: null,
  category: "marketing",
  status: "published",
  sectionsCount: 3,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
  ...overrides,
});

type HookValue = {
  items: TemplateSummary[];
  isLoading: boolean;
  error: string | null;
  refresh: (force?: boolean) => Promise<void>;
};

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function flushAsync() {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

const mountHook = (options?: { skip?: boolean }) => {
  const handle: HookValue = {
    items: [],
    isLoading: true,
    error: null,
    refresh: async () => undefined,
  };
  let renderCount = 0;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  function Probe(props: { options?: { skip?: boolean } }) {
    const result = usePageTemplates(props.options);
    renderCount += 1;
    handle.items = result.items;
    handle.isLoading = result.isLoading;
    handle.error = result.error;
    handle.refresh = result.refresh;
    return null;
  }

  const render = (next?: { skip?: boolean }) => {
    React.act(() => {
      root.render(React.createElement(Probe, { options: next }));
    });
  };
  render(options);

  return {
    handle,
    getRenderCount: () => renderCount,
    rerender: render,
    unmount: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const triggerCache = (key: string) => {
  React.act(() => {
    hookState.trigger(key);
  });
};

beforeEach(() => {
  hookState.reset();
});

afterEach(() => {
  document.body.innerHTML = "";
});

test("seeds items from the cache and still force-refreshes on mount", async () => {
  hookState.cached = [summary()];
  hookState.items = [summary()];
  const hook = mountHook();

  try {
    expect(hook.handle.items).toEqual([summary()]);
    expect(hook.handle.isLoading).toBe(false);
    expect(hook.handle.error).toBeNull();

    await flushAsync();
    expect(hookState.listCalls).toEqual([{ force: true }]);
    expect(hookState.listenerCount()).toBe(1);
  } finally {
    hook.unmount();
  }
});

test("treats an empty cached list as a cache hit without loading", async () => {
  hookState.cached = [];
  hookState.items = [];
  const hook = mountHook();

  try {
    expect(hook.handle.items).toEqual([]);
    expect(hook.handle.isLoading).toBe(false);
    await flushAsync();
  } finally {
    hook.unmount();
  }
});

test("loads from the API when the cache is empty, clearing loading", async () => {
  hookState.cached = null;
  hookState.items = [summary()];
  const hook = mountHook();

  try {
    expect(hook.handle.items).toEqual([]);
    expect(hook.handle.isLoading).toBe(true);

    await flushAsync();
    expect(hook.handle.items).toEqual([summary()]);
    expect(hook.handle.isLoading).toBe(false);
    expect(hook.handle.error).toBeNull();
    expect(hookState.listCalls).toEqual([{ force: true }]);
  } finally {
    hook.unmount();
  }
});

test("surfaces the api error message when the mount fetch fails", async () => {
  hookState.cached = null;
  hookState.nextListError = hookState.apiError("templates_list_failed");
  const hook = mountHook();

  try {
    await flushAsync();
    expect(hook.handle.error).toBe("templates_list_failed");
    expect(hook.handle.isLoading).toBe(false);
    expect(hook.handle.items).toEqual([]);
  } finally {
    hook.unmount();
  }
});

test("surfaces Error instances and falls back for unknown failures", async () => {
  hookState.cached = null;
  hookState.nextListError = new Error("boom");
  const errorHook = mountHook();
  try {
    await flushAsync();
    expect(errorHook.handle.error).toBe("boom");
  } finally {
    errorHook.unmount();
  }

  hookState.reset();
  hookState.cached = null;
  hookState.nextListError = "unexpected";
  const fallbackHook = mountHook();
  try {
    await flushAsync();
    expect(fallbackHook.handle.error).toBe("Failed to load page templates.");
  } finally {
    fallbackHook.unmount();
  }
});

test("refresh force-reloads items and clears prior errors", async () => {
  hookState.cached = null;
  hookState.nextListError = hookState.apiError("first_fetch_failed");
  const hook = mountHook();
  try {
    await flushAsync();
    expect(hook.handle.error).toBe("first_fetch_failed");
    expect(hookState.listCalls).toEqual([{ force: true }]);

    hookState.items = [summary({ id: "tpl-2", name: "Second load" })];
    await React.act(async () => {
      await hook.handle.refresh(true);
    });

    expect(hook.handle.items).toEqual([summary({ id: "tpl-2", name: "Second load" })]);
    expect(hook.handle.error).toBeNull();
    expect(hookState.listCalls).toEqual([{ force: true }, { force: true }]);
  } finally {
    hook.unmount();
  }
});

test("refresh failures set the error while loading settles", async () => {
  hookState.cached = [summary()];
  hookState.items = [summary()];
  const hook = mountHook();
  try {
    await flushAsync();
    hookState.nextListError = hookState.apiError("refresh_failed");
    await React.act(async () => {
      await hook.handle.refresh();
    });

    expect(hook.handle.error).toBe("refresh_failed");
    expect(hook.handle.isLoading).toBe(false);
    // Items are left untouched by a failed refresh.
    expect(hook.handle.items).toEqual([summary()]);
    expect(hookState.listCalls).toEqual([{ force: true }, { force: undefined }]);
  } finally {
    hook.unmount();
  }
});

test("skip suppresses the fetch and the cacheBus subscription until removed", async () => {
  const hook = mountHook({ skip: true });

  try {
    expect(hookState.listCalls).toEqual([]);
    expect(hookState.listenerCount()).toBe(0);
    expect(hook.handle.isLoading).toBe(true);

    hook.rerender();
    await flushAsync();

    expect(hookState.listCalls).toEqual([{ force: true }]);
    expect(hookState.listenerCount()).toBe(1);
  } finally {
    hook.unmount();
  }
});

test("cacheBus events revalidate only for the pageTemplates list key", async () => {
  hookState.cached = [summary()];
  hookState.items = [summary()];
  const hook = mountHook();

  try {
    await flushAsync();
    expect(hookState.listCalls).toEqual([{ force: true }]);

    hookState.items = [summary({ id: "tpl-9", name: "Revalidated" })];
    triggerCache(cacheKeys.pageTemplatesList);
    await flushAsync();

    expect(hookState.listCalls).toEqual([{ force: true }, { force: true }]);
    expect(hook.handle.items).toEqual([summary({ id: "tpl-9", name: "Revalidated" })]);

    triggerCache(cacheKeys.pagesList);
    await flushAsync();
    expect(hookState.listCalls).toEqual([{ force: true }, { force: true }]);
  } finally {
    hook.unmount();
  }
});

test("a failed cacheBus revalidation surfaces the error", async () => {
  hookState.cached = [summary()];
  hookState.items = [summary()];
  const hook = mountHook();

  try {
    await flushAsync();
    hookState.nextListError = hookState.apiError("revalidation_failed");
    triggerCache(cacheKeys.pageTemplatesList);
    await flushAsync();

    expect(hook.handle.error).toBe("revalidation_failed");
    expect(hookState.listCalls).toEqual([{ force: true }, { force: true }]);
  } finally {
    hook.unmount();
  }
});

test("unmounting removes the cacheBus subscription", async () => {
  hookState.cached = [summary()];
  hookState.items = [summary()];
  const hook = mountHook();

  try {
    await flushAsync();
    expect(hookState.listenerCount()).toBe(1);
  } finally {
    hook.unmount();
  }

  expect(hookState.listenerCount()).toBe(0);
  triggerCache(cacheKeys.pageTemplatesList);
  await flushAsync();
  expect(hookState.listCalls).toEqual([{ force: true }]);
});
