// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { LayoutPanel } from "../../../core/admin/ui/pages/builder/LayoutPanel";
import type { LayoutValue } from "../../../core/admin/ui/pages/builder/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    onValueChange?: (value: string) => void;
    value: string;
  }) => {
    const nextValue =
      value === "default" ? "full" : value === "xl" ? "md" : value === "none" ? "lg" : "sm";

    return (
      <button type="button" data-select-value={value} onClick={() => onValueChange?.(nextValue)}>
        {children}
      </button>
    );
  },
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
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

test("LayoutPanel normalizes container and spacing selections", () => {
  const calls: LayoutValue[] = [];
  const { container, cleanup } = mount(
    <LayoutPanel
      value={{
        container: "default",
        padding: { top: "xl", bottom: "md" },
        margin: { top: "none", bottom: "none" },
        background: { color: "transparent", image: null },
      }}
      onChange={(next) => calls.push(next)}
    />
  );

  try {
    const buttons = Array.from(container.querySelectorAll("button[data-select-value]"));
    expect(buttons).toHaveLength(5);

    for (const button of buttons) {
      React.act(() => {
        button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
    }

    expect(calls).toContainEqual(expect.objectContaining({ container: "full" }));
    expect(calls).toContainEqual(
      expect.objectContaining({
        padding: expect.objectContaining({ top: "md" }),
      })
    );
    expect(calls).toContainEqual(
      expect.objectContaining({
        padding: expect.objectContaining({ bottom: "sm" }),
      })
    );
    expect(calls).toContainEqual(
      expect.objectContaining({
        margin: expect.objectContaining({ top: "lg" }),
      })
    );
    expect(calls).toContainEqual(
      expect.objectContaining({
        margin: expect.objectContaining({ bottom: "lg" }),
      })
    );
  } finally {
    cleanup();
  }
});
