// @vitest-environment happy-dom

import React from "react";

import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  ScreenFieldValueVisualEditor,
  ScreenRecordHeaderVisualEditor,
} from "../../../core/admin/ui/widgets/editors/ScreenEditors";
import type { WidgetEditorContext } from "../../../core/widgets/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
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
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
  }) => <input value={value} onChange={onChange} placeholder={placeholder} {...props} />,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children }: { value: string; children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    placeholder,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
  }) => <textarea value={value} onChange={onChange} placeholder={placeholder} {...props} />,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) => values.filter(Boolean).join(" "),
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

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("record header visual editor exposes binding state badges and jump actions", () => {
  const jumpToBindingPropPath = vi.fn();
  const context: WidgetEditorContext = {
    surface: "admin-editor-view",
    jumpToBindingPropPath,
    getBindingState: (propPath) => (propPath === "title" ? "bound" : "literal"),
  };

  const view = mount(
    <ScreenRecordHeaderVisualEditor
      value={{ title: "Entry", subtitle: "Overview", description: "Details" }}
      onChange={() => undefined}
      variant="card"
      onVariantChange={() => undefined}
      context={context}
    />
  );

  try {
    expect(view.container.textContent).toContain("Bound");
    expect(view.container.textContent).toContain("Literal");
    const titleButton = view.container.querySelector('button[data-binding-prop-path="title"]');
    expect(titleButton).not.toBeNull();
    React.act(() => {
      titleButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(jumpToBindingPropPath).toHaveBeenCalledWith("title");
  } finally {
    view.cleanup();
  }
});

test("field value visual editor keeps context optional", () => {
  const view = mount(
    <ScreenFieldValueVisualEditor
      value={{ label: "Status", value: "Draft", helper: "Visible to editors." }}
      onChange={() => undefined}
      variant="stacked"
      onVariantChange={() => undefined}
    />
  );

  try {
    expect(view.container.textContent).toContain(
      "Literal value only until you map this prop in Data."
    );
    expect(view.container.querySelectorAll("button[data-binding-prop-path]").length).toBe(0);
  } finally {
    view.cleanup();
  }
});
