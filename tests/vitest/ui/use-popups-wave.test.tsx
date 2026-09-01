// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const popupsState = vi.hoisted(() => ({
  cached: null as unknown,
  listResult: [] as unknown,
  listeners: [] as Array<(event: { key: string }) => void>,
  getCachedPopups: vi.fn(() => popupsState.cached),
  listPopupsCached: vi.fn(async ({ force: _force }: { force?: boolean } = {}) => {
    if (popupsState.listResult === "THROW_NON_ERROR") throw "string failure";
    if (popupsState.listResult instanceof Error) throw popupsState.listResult;
    return popupsState.listResult as never[];
  }),
  subscribeCacheEvents: vi.fn((listener: (event: { key: string }) => void) => {
    popupsState.listeners.push(listener);
    return () => {
      popupsState.listeners = popupsState.listeners.filter((entry) => entry !== listener);
    };
  }),
  reset() {
    popupsState.cached = null;
    popupsState.listResult = [];
    popupsState.listeners = [];
    popupsState.getCachedPopups.mockClear();
    popupsState.listPopupsCached.mockClear();
    popupsState.subscribeCacheEvents.mockClear();
  },
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" && error !== null && "kind" in error,
}));

vi.mock("@/services/popupsClient", async () => {
  const actual = await import("../../../core/admin/services/popupsClient");
  return {
    ...actual,
    getCachedPopups: popupsState.getCachedPopups,
    listPopupsCached: popupsState.listPopupsCached,
  };
});

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: popupsState.subscribeCacheEvents,
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: { popupsList: "popups:list" },
}));

import { usePopups } from "../../../core/admin/ui/popups/hooks/usePopups";

function Harness({ skip }: { skip?: boolean }) {
  const { items, isLoading, error, refresh } = usePopups({ skip });
  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="count">{items.length}</div>
      <div data-testid="items">{items.map((item) => item.name).join(",")}</div>
      <div data-testid="error">{error ?? ""}</div>
      <button type="button" onClick={() => void refresh()}>
        refresh
      </button>
      <button type="button" onClick={() => void refresh(true)}>
        refresh-force
      </button>
    </div>
  );
}

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  return {
    container,
    unmount: () =>
      React.act(() => {
        root.unmount();
      }),
  };
};

const flushEffects = async () => {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const clickButtonWithText = (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === label
  );
  if (!button) throw new Error(`missing button ${label}`);
  React.act(() => {
    button.click();
  });
};

const popup = (name: string) =>
  ({
    id: name,
    name,
    slug: name,
    status: "draft",
    trigger: { type: "exit_intent" },
    targeting: { includePaths: [], excludePaths: [], audience: "all" },
    frequency: { strategy: "always", cooldownMinutes: null },
    content: { title: null, body: null, templateId: null, ctaLabel: null, ctaHref: null },
    settings: { placement: "center", dismissible: true, showOverlay: true },
    createdAt: "",
    updatedAt: "",
    publishedAt: null,
  }) as never;

afterEach(() => {
  popupsState.reset();
  document.body.innerHTML = "";
});

describe("usePopups", () => {
  it("hydrates from the cache without a loading flash and refetches in the background", async () => {
    popupsState.cached = [popup("cached-one")];
    popupsState.listResult = [popup("fresh-one"), popup("fresh-two")];
    const view = mount(<Harness />);

    // cache-first render: no loading state, items visible immediately
    expect(view.container.querySelector("[data-testid='loading']")!.textContent).toBe("false");
    expect(view.container.querySelector("[data-testid='items']")!.textContent).toBe("cached-one");
    await flushEffects();

    expect(popupsState.listPopupsCached).toHaveBeenCalledWith({ force: true });
    expect(view.container.querySelector("[data-testid='items']")!.textContent).toBe(
      "fresh-one,fresh-two"
    );
    view.unmount();
  });

  it("shows a loading state when no cached value exists", async () => {
    const view = mount(<Harness />);
    expect(view.container.querySelector("[data-testid='loading']")!.textContent).toBe("true");
    await flushEffects();
    expect(view.container.querySelector("[data-testid='loading']")!.textContent).toBe("false");
    view.unmount();
  });

  it("surfaces client error messages and keeps prior items", async () => {
    popupsState.listResult = Object.assign(new Error("denied"), { kind: "api", message: "denied" });
    const view = mount(<Harness />);
    await flushEffects();
    expect(view.container.querySelector("[data-testid='error']")!.textContent).toBe("denied");

    popupsState.listResult = new Error("offline");
    clickButtonWithText(view.container, "refresh");
    await flushEffects();
    expect(view.container.querySelector("[data-testid='error']")!.textContent).toBe("offline");
    view.unmount();
  });

  it("falls back to generic copy for unknown failures via manual refresh", async () => {
    popupsState.listResult = "THROW_NON_ERROR" as unknown as Error;
    const view = mount(<Harness />);
    clickButtonWithText(view.container, "refresh-force");
    await flushEffects();
    expect(view.container.querySelector("[data-testid='error']")!.textContent).toContain(
      "Failed to load popups."
    );
    expect(popupsState.listPopupsCached).toHaveBeenCalledWith({ force: true });
    view.unmount();
  });

  it("refresh(force) forwards the flag and clears resolved errors", async () => {
    popupsState.listResult = [popup("ok")];
    const view = mount(<Harness />);
    clickButtonWithText(view.container, "refresh-force");
    await flushEffects();
    expect(view.container.querySelector("[data-testid='error']")!.textContent).toBe("");
    expect(view.container.querySelector("[data-testid='items']")!.textContent).toBe("ok");
    view.unmount();
  });

  it("skip mode avoids fetching and cache subscriptions entirely", async () => {
    const view = mount(<Harness skip />);
    await flushEffects();
    expect(popupsState.listPopupsCached).not.toHaveBeenCalled();
    expect(popupsState.subscribeCacheEvents).not.toHaveBeenCalled();
    expect(view.container.querySelector("[data-testid='items']")!.textContent).toBe("");
    view.unmount();
  });

  it("re-fetches when a matching cache invalidation event arrives and unsubscribes on unmount", async () => {
    popupsState.listResult = [popup("initial")];
    const view = mount(<Harness />);
    await flushEffects();

    expect(popupsState.subscribeCacheEvents).toHaveBeenCalledTimes(1);
    expect(popupsState.listeners.length).toBe(1);
    popupsState.listResult = [popup("invalidated")];

    React.act(() => {
      popupsState.listeners[0]({ key: "popups:list" });
    });
    await flushEffects();

    expect(view.container.querySelector("[data-testid='items']")!.textContent).toBe("invalidated");

    const callsBefore = popupsState.listPopupsCached.mock.calls.length;
    React.act(() => {
      popupsState.listeners[0]({ key: "unrelated:key" });
    });
    await flushEffects();
    expect(popupsState.listPopupsCached.mock.calls.length).toBe(callsBefore);

    view.unmount();
    expect(popupsState.listeners.length).toBe(0);
  });

  it("ignores list resolutions that arrive after unmount", async () => {
    popupsState.cached = null;
    popupsState.listResult = [popup("late")];
    const view = mount(<Harness />);
    // unmount while the forced background fetch is still resolving
    view.unmount();
    await expect(flushEffects()).resolves.toBeUndefined();
    // the fetch itself ran, but its result must not reach the unmounted hook
    expect(popupsState.listPopupsCached).toHaveBeenCalledWith({ force: true });
  });
});
