// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { FieldLibrary } from "../../../core/admin/ui/forms/FieldLibrary";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

test("FieldLibrary renders items and forwards add callbacks", () => {
  const onAddField = vi.fn();
  const Icon = () => <span>icon</span>;
  const view = mount(
    <FieldLibrary
      items={[
        { id: "text", label: "Text", icon: Icon as never, type: "text" },
        { id: "radio", label: "Radio", icon: Icon as never, type: "radio" },
        { id: "number", label: "Number", icon: Icon as never, type: "number" },
        { id: "checkbox", label: "Checkbox", icon: Icon as never, type: "checkbox" },
      ]}
      onAddField={onAddField}
    />
  );

  try {
    expect(view.container.textContent).toContain("Fields Library");
    expect(view.container.textContent).toContain("Advanced Fields");
    expect(view.container.textContent).toContain("Number");

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("Radio"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onAddField).toHaveBeenCalledWith({
      id: "radio",
      label: "Radio",
      icon: Icon,
      type: "radio",
    });
  } finally {
    view.cleanup();
  }
});
