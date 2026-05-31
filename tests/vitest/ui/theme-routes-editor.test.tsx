// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import {
  ThemeRoutesEditor,
  type ThemeRouteDraft,
} from "../../../core/admin/ui/themes/ThemeRoutesEditor";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(globalThis, "crypto", {
  value: { randomUUID: () => "route-new" },
  configurable: true,
});

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    placeholder?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  }) => (
    <div>
      <input value={value} placeholder={placeholder} onChange={onChange} />
      <button
        type="button"
        data-input-action="set-route"
        onClick={() =>
          onChange?.({
            target: { value: "/catalog" },
          } as React.ChangeEvent<HTMLInputElement>)
        }
      >
        set-route
      </button>
    </div>
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    onValueChange?: (value: string) => void;
    value?: string;
  }) => (
    <button
      type="button"
      data-select-value={value}
      onClick={() => onValueChange?.(value === "none" ? "page-2" : "none")}
    >
      {children}
    </button>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
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

test("ThemeRoutesEditor supports empty, add, update, remove, and error states", () => {
  const changes: ThemeRouteDraft[][] = [];

  const Harness = () => {
    const [routes, setRoutes] = useState<ThemeRouteDraft[]>([]);
    return (
      <ThemeRoutesEditor
        routes={routes}
        pages={[
          { id: "page-1", title: "Home" },
          { id: "page-2", title: "Catalog" },
        ]}
        error="Duplicate route"
        onChange={(next) => {
          changes.push(next);
          setRoutes(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("No routes configured yet.");
    expect(view.container.textContent).toContain("Duplicate route");

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("Add route"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    React.act(() => {
      view.container
        .querySelector("button[data-input-action='set-route']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    React.act(() => {
      view.container
        .querySelector("button[data-select-value='none']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(changes.at(-1)).toEqual([{ id: "route-new", path: "/catalog", pageId: "page-2" }]);

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.getAttribute("aria-label") === "Remove route")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(changes.at(-1)).toEqual([]);
    expect(view.container.textContent).toContain("No routes configured yet.");
  } finally {
    view.cleanup();
  }
});
