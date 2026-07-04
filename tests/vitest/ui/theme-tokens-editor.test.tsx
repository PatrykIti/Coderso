// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { ThemeTokensEditor } from "../../../core/admin/ui/themes/ThemeTokensEditor";
import type { DesignTokens } from "../../../core/services/theme/tokenTypes";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  }) => (
    <div>
      <textarea value={value} onChange={onChange} />
      <button
        type="button"
        data-textarea-action="change"
        onClick={() =>
          onChange?.({
            target: { value: '{\n  "ok": true\n}' },
          } as React.ChangeEvent<HTMLTextAreaElement>)
        }
      >
        change-draft
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/themes/ThemeRoutesEditor", () => ({
  ThemeRoutesEditor: ({
    routes,
    error,
    onChange,
  }: {
    routes: Array<{ id: string; path: string; pageId: string | null }>;
    error?: string | null;
    onChange: (next: Array<{ id: string; path: string; pageId: string | null }>) => void;
  }) => (
    <div>
      <span>{error}</span>
      <button
        type="button"
        onClick={() => onChange([...routes, { id: "route-2", path: "/shop", pageId: null }])}
      >
        update-routes
      </button>
    </div>
  ),
}));

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

test("ThemeTokensEditor renders token summary and forwards draft and route changes", () => {
  const onDraftChange = vi.fn();
  const onRoutesChange = vi.fn();
  const resolvedTokens: DesignTokens = {
    colors: { primary: "#111111", secondary: "#222222", accent: "#333333" },
    neutrals: {
      bg: "#ffffff",
      surface: "#f8fafc",
      border: "#e2e8f0",
      text: "#0f172a",
    },
    spacing: {
      xs: "0.25rem",
      sm: "0.5rem",
      md: "1rem",
      lg: "1.5rem",
      xl: "2rem",
      "2xl": "3rem",
    },
    radius: { sm: "4px", md: "8px", lg: "12px", xl: "16px" },
    typography: {
      sans: "Inter",
      display: "Space Grotesk",
      "2xs": "0.625rem",
      xs: "0.75rem",
      sm: "0.875rem",
      md: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem",
    },
  };

  const view = mount(
    <ThemeTokensEditor
      draft={`{\n  "colors": {\n    "primary": "#111111"\n  }\n}`}
      error="Invalid JSON"
      resolvedTokens={resolvedTokens}
      routes={[{ id: "route-1", path: "/", pageId: "page-1" }]}
      pages={[{ id: "page-1", title: "Home" }]}
      routesError="Duplicate route"
      onDraftChange={onDraftChange}
      onRoutesChange={onRoutesChange}
    />
  );

  try {
    expect(view.container.textContent).toContain("theme.config.json");
    expect(view.container.textContent).toContain("Invalid JSON");
    expect(view.container.textContent).toContain("Primary");
    expect(view.container.textContent).toContain("#111111");
    expect(view.container.textContent).toContain("Duplicate route");

    React.act(() => {
      view.container
        .querySelector("button[data-textarea-action='change']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "update-routes")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onDraftChange).toHaveBeenCalledWith('{\n  "ok": true\n}');
    expect(onRoutesChange).toHaveBeenCalledWith([
      { id: "route-1", path: "/", pageId: "page-1" },
      { id: "route-2", path: "/shop", pageId: null },
    ]);
  } finally {
    view.cleanup();
  }
});
