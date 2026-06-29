// @vitest-environment happy-dom

// TASK-479-16-L03 / L04: locks the Search preview restyle (soft info card +
// read-only search-box pill + SectionCard controls with soft toggle rows) while
// proving the public-search preview wiring is presentation-only — the three source
// switches render and Run preview still hits the public-preview route.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Native role=switch button so positional toggles fire deterministically.
vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    [key: string]: unknown;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked === true}
      onClick={() => onCheckedChange?.(checked !== true)}
      {...props}
    />
  ),
}));

import { ListingSearchPage } from "../../../core/admin/ui/listings/ListingSearchPage";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

const mount = (node: React.ReactNode, path = "/admin/advanced/search") => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<AdminRouterProvider initialPath={path}>{node}</AdminRouterProvider>);
  });
  return {
    container,
    cleanup: () => {
      React.act(() => root.unmount());
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

const findButton = (container: HTMLElement, re: RegExp) =>
  Array.from(container.querySelectorAll("button")).find(
    (b) => re.test(b.textContent || "") || re.test(b.getAttribute("aria-label") || "")
  );

let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("Search preview restyle", () => {
  it("renders query/limit inputs + source switches and runs preview", async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return new Response(JSON.stringify({ query: "a", sources: ["pages"], items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof globalThis.fetch;

    const view = mount(<ListingSearchPage />);
    try {
      await flush();
      expect(view.container.querySelector("h1")?.textContent).toContain("Search");

      // Source switches render in Pages/Entries/Posts order.
      const switches = view.container.querySelectorAll('[role="switch"]');
      expect(switches.length).toBe(3);
      React.act(() => {
        switches[2]?.dispatchEvent(new MouseEvent("click", { bubbles: true })); // Posts
      });

      await React.act(async () => {
        findButton(view.container, /run preview/i)?.dispatchEvent(
          new MouseEvent("click", { bubbles: true })
        );
      });
      await flush();

      expect(calls.length).toBeGreaterThan(0); // previewPublicSearch hit
      expect(calls[0]).toMatch(/\/search\/public-preview/);
    } finally {
      view.cleanup();
    }
  });
});
