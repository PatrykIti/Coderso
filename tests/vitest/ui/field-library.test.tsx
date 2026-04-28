// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { FieldLibrary } from "../../../core/admin/ui/forms/FieldLibrary";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      act(() => {
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
        { id: "checkbox", label: "Checkbox", icon: Icon as never, type: "checkbox" },
      ]}
      onAddField={onAddField}
    />
  );

  try {
    expect(view.container.textContent).toContain("Fields Library");
    expect(view.container.textContent).toContain("Advanced Fields");

    act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("Checkbox"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onAddField).toHaveBeenCalledWith({
      id: "checkbox",
      label: "Checkbox",
      icon: Icon,
      type: "checkbox",
    });
  } finally {
    view.cleanup();
  }
});
