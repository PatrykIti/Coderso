// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { PluginErrorBoundary } from "../../../core/admin/ui/plugins/PluginErrorBoundary";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  return {
    container,
    render: () => {
      act(() => {
        root.render(node);
      });
    },
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

test("PluginErrorBoundary renders children when nothing fails", () => {
  const view = mount(
    <PluginErrorBoundary plugin={{ name: "Catalog", version: "1.0.0" }}>
      <div>Plugin content</div>
    </PluginErrorBoundary>
  );

  try {
    view.render();
    expect(view.container.textContent).toContain("Plugin content");
  } finally {
    view.cleanup();
  }
});

test("PluginErrorBoundary isolates crashes and forwards disable action", () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const onDisable = vi.fn();
  const view = mount(
    <PluginErrorBoundary
      plugin={{ name: "Catalog", version: "1.0.0" }}
      onDisable={onDisable}
    >
      <Crash />
    </PluginErrorBoundary>
  );

  try {
    expect(() => view.render()).not.toThrow();
    expect(view.container.textContent).toContain("Plugin crash");
    expect(view.container.textContent).toContain("Catalog");
    expect(view.container.textContent).toContain("Disable plugin");

    act(() => {
      Array.from(view.container.querySelectorAll("button"))[0]?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    expect(onDisable).toHaveBeenCalledWith({
      name: "Catalog",
      version: "1.0.0",
    });
    expect(errorSpy).toHaveBeenCalled();
  } finally {
    view.cleanup();
    errorSpy.mockRestore();
  }
});

function Crash() {
  throw new Error("plugin crashed");
}
