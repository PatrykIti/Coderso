// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const tokensState = vi.hoisted(() => ({
  cached: null as unknown,
  fetchResult: null as unknown,
  listeners: [] as Array<(event: { key: string }) => void>,
  getCachedSettings: vi.fn(() => tokensState.cached),
  getSettingsCached: vi.fn(async () => {
    if (tokensState.fetchResult instanceof Error) throw tokensState.fetchResult;
    return tokensState.fetchResult as Record<string, unknown>;
  }),
  subscribeCacheEvents: vi.fn((listener: (event: { key: string }) => void) => {
    tokensState.listeners.push(listener);
    return () => {
      tokensState.listeners = tokensState.listeners.filter((entry) => entry !== listener);
    };
  }),
  reset() {
    tokensState.cached = null;
    tokensState.fetchResult = null;
    tokensState.listeners = [];
    tokensState.getCachedSettings.mockClear();
    tokensState.getSettingsCached.mockClear();
    tokensState.subscribeCacheEvents.mockClear();
  },
}));

vi.mock("@/services/settingsClient", () => ({
  getCachedSettings: tokensState.getCachedSettings,
  getSettingsCached: tokensState.getSettingsCached,
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: tokensState.subscribeCacheEvents,
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: { settingsRedacted: "settings:redacted" },
}));

import {
  useCanvasSiteName,
  useCanvasSiteTokens,
} from "../../../core/admin/ui/shared/useCanvasSiteTokens";

function Harness() {
  const tokens = useCanvasSiteTokens();
  const siteName = useCanvasSiteName();
  return (
    <div>
      <div data-testid="primary">{tokens.colors.primary}</div>
      <div data-testid="accent">{tokens.colors.accent}</div>
      <div data-testid="site-name">{siteName ?? "null"}</div>
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

afterEach(() => {
  tokensState.reset();
  document.body.innerHTML = "";
});

describe("useCanvasSiteTokens family", () => {
  it("anchors on DEFAULT_TOKENS with no settings and still revalidates in the background", async () => {
    const view = mount(<Harness />);
    expect(view.container.querySelector("[data-testid='primary']")!.textContent).toBe("#1d4ed8");
    expect(view.container.querySelector("[data-testid='site-name']")!.textContent).toBe("null");

    await flushEffects();
    expect(tokensState.getSettingsCached).toHaveBeenCalled();
    for (const call of tokensState.getSettingsCached.mock.calls as unknown as Array<
      [{ force: true }]
    >) {
      expect(call[0]).toEqual({ force: true });
    }
    // still anchored on defaults with an empty settings payload
    expect(view.container.querySelector("[data-testid='primary']")!.textContent).toBe("#1d4ed8");
    // one cache-bus subscription per hook instance (tokens + site name)
    expect(tokensState.subscribeCacheEvents).toHaveBeenCalled();
    view.unmount();
  });

  it("hydrates cached-first then repaints with the fetched token overrides", async () => {
    tokensState.cached = {
      "design.tokens": { colors: { primary: "#112233" } },
      "site.name": " Cached Site ",
    };
    tokensState.fetchResult = {
      "design.tokens": { colors: { primary: "#445566", accent: "#abcdef" } },
    };
    const view = mount(<Harness />);
    expect(view.container.querySelector("[data-testid='primary']")!.textContent).toBe("#112233");
    expect(view.container.querySelector("[data-testid='site-name']")!.textContent).toBe(
      "Cached Site"
    );

    await flushEffects();
    void tokensState;
    expect(view.container.querySelector("[data-testid='primary']")!.textContent).toBe("#445566");
    expect(view.container.querySelector("[data-testid='accent']")!.textContent).toBe("#abcdef");
    // fetched payload without site.name falls back to the null anchor
    expect(view.container.querySelector("[data-testid='site-name']")!.textContent).toBe("null");
    view.unmount();
  });

  it("fails closed to defaults for malformed token override shapes", async () => {
    tokensState.cached = {
      "design.tokens": { colors: "not-a-map", bogus: true },
    };
    const view = mount(<Harness />);
    expect(view.container.querySelector("[data-testid='primary']")!.textContent).toBe("#1d4ed8");
    view.unmount();

    tokensState.reset();
    tokensState.cached = { "design.tokens": 42 };
    const second = mount(<Harness />);
    expect(second.container.querySelector("[data-testid='primary']")!.textContent).toBe("#1d4ed8");
    second.unmount();
  });

  it("swallows fetch errors and keeps the previous anchor", async () => {
    tokensState.cached = { "site.name": "Kept" };
    tokensState.fetchResult = new Error("offline");
    const view = mount(<Harness />);
    await flushEffects();
    expect(view.container.querySelector("[data-testid='site-name']")!.textContent).toBe("Kept");
    view.unmount();
  });

  it("re-reads the full payload when a matching cache event arrives; ignores other keys", async () => {
    tokensState.fetchResult = {};
    const view = mount(<Harness />);
    await flushEffects();
    const initialCalls = tokensState.getSettingsCached.mock.calls.length;
    expect(tokensState.listeners.length).toBeGreaterThanOrEqual(1);

    React.act(() => {
      for (const listener of tokensState.listeners) listener({ key: "unrelated:key" });
    });
    await flushEffects();
    expect(tokensState.getSettingsCached.mock.calls.length).toBe(initialCalls);

    tokensState.fetchResult = {
      "design.tokens": { colors: { primary: "#999111" } },
      "site.name": "Repainted",
    };
    React.act(() => {
      for (const listener of tokensState.listeners) listener({ key: "settings:redacted" });
    });
    await flushEffects();

    expect(view.container.querySelector("[data-testid='primary']")!.textContent).toBe("#999111");
    expect(view.container.querySelector("[data-testid='site-name']")!.textContent).toBe(
      "Repainted"
    );

    view.unmount();
    expect(tokensState.listeners.length).toBe(0);
  });

  it("falls back to cached settings when the post-save refetch fails", async () => {
    tokensState.fetchResult = {};
    const view = mount(<Harness />);
    await flushEffects();

    tokensState.fetchResult = new Error("save refetch failed");
    tokensState.cached = { "site.name": "FromCache" };
    React.act(() => {
      for (const listener of tokensState.listeners) listener({ key: "settings:redacted" });
    });
    await flushEffects();

    expect(view.container.querySelector("[data-testid='site-name']")!.textContent).toBe(
      "FromCache"
    );
    view.unmount();
  });
});
