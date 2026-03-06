// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { FormPicker } from "../../../core/admin/ui/pages/builder/FormPicker";
import { TemplatePicker } from "../../../core/admin/ui/pages/builder/TemplatePicker";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
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

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    className,
    defaultValue,
  }: {
    value?: string;
    defaultValue?: string;
    placeholder?: string;
    className?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  }) => {
    const matchValue =
      placeholder === "Find forms..." ? "support" : "footer";
    const missingValue =
      placeholder === "Find forms..." ? "missing" : "unknown";

    return (
      <div>
        <input
          className={className}
          defaultValue={defaultValue}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />
        <button
          type="button"
          data-input-action="match"
          onClick={() =>
            onChange?.({
              target: { value: matchValue },
            } as React.ChangeEvent<HTMLInputElement>)
          }
        >
          match
        </button>
        <button
          type="button"
          data-input-action="empty"
          onClick={() =>
            onChange?.({
              target: { value: missingValue },
            } as React.ChangeEvent<HTMLInputElement>)
          }
        >
          empty
        </button>
      </div>
    );
  },
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const formsState = vi.hoisted(() => ({
  current: { items: [], isLoading: false, error: null as string | null },
}));

const templatesState = vi.hoisted(() => ({
  current: { items: [], isLoading: false, error: null as string | null },
}));

vi.mock("@/ui/forms/hooks/useForms", () => ({
  useForms: () => formsState.current,
}));

vi.mock("@/ui/widgets/hooks/useWidgetTemplates", () => ({
  useWidgetTemplates: () => templatesState.current,
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
    rerender: (next: React.ReactNode) => {
      act(() => {
        root.render(next);
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

test("FormPicker renders loading, error, filtering, and add flows", () => {
  const onAdd = vi.fn();
  formsState.current = { items: [], isLoading: true, error: null };
  const view = mount(<FormPicker onAdd={onAdd} />);

  try {
    expect(view.container.textContent).toContain("Loading forms...");

    formsState.current = { items: [], isLoading: false, error: "Request failed" };
    view.rerender(<FormPicker onAdd={onAdd} />);
    expect(view.container.textContent).toContain("Request failed");

    formsState.current = {
      isLoading: false,
      error: null,
      items: [
        {
          id: "form-1",
          name: "Contact",
          description: "Lead capture",
          slug: "contact",
          status: "published",
        },
        {
          id: "form-2",
          name: "Support",
          description: null,
          slug: "help",
          status: "draft",
        },
      ],
    };
    view.rerender(<FormPicker onAdd={onAdd} />);
    expect(view.container.textContent).toContain("Contact");
    expect(view.container.textContent).toContain("No description yet.");

    act(() => {
      view.container
        .querySelector("button[data-input-action='match']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.textContent).toContain("Support");
    expect(view.container.textContent).not.toContain("Contact");

    act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onAdd).toHaveBeenCalledWith({ id: "form-2", name: "Support" });

    act(() => {
      view.container
        .querySelector("button[data-input-action='empty']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.textContent).toContain("No forms match this search.");
  } finally {
    view.cleanup();
  }
});

test("TemplatePicker renders loading, error, filtering, and add flows", () => {
  const onAdd = vi.fn();
  templatesState.current = { items: [], isLoading: true, error: null };
  const view = mount(<TemplatePicker onAdd={onAdd} />);

  try {
    expect(view.container.textContent).toContain("Loading templates...");

    templatesState.current = { items: [], isLoading: false, error: "Broken feed" };
    view.rerender(<TemplatePicker onAdd={onAdd} />);
    expect(view.container.textContent).toContain("Broken feed");

    templatesState.current = {
      isLoading: false,
      error: null,
      items: [
        {
          id: "template-1",
          name: "Hero Promo",
          description: null,
          category: "marketing",
          status: "published",
        },
        {
          id: "template-2",
          name: "Footer Links",
          description: "Navigation cluster",
          category: "footer",
          status: "draft",
        },
      ],
    };
    view.rerender(<TemplatePicker onAdd={onAdd} />);
    expect(view.container.textContent).toContain("Reusable template section.");

    act(() => {
      view.container
        .querySelector("button[data-input-action='match']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.textContent).toContain("Footer Links");
    expect(view.container.textContent).not.toContain("Hero Promo");

    act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onAdd).toHaveBeenCalledWith({
      id: "template-2",
      name: "Footer Links",
    });

    act(() => {
      view.container
        .querySelector("button[data-input-action='empty']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.textContent).toContain("No templates match this search.");
  } finally {
    view.cleanup();
  }
});
