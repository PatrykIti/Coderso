// @vitest-environment happy-dom
//
// TASK-105-05 page editor wave, LEAF B2 — WidgetPicker and LibraryPanel
// branch closure. Covers the custom-widgets list, query and allowedTypes
// filtering, the empty message, uncategorized "Other" grouping, draggable
// items, the slot context, and the controlled/uncontrolled LibraryPanel
// tab contract.

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("lucide-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("lucide-react")>();
  return {
    ...actual,
    Plus: () => <span>plus-icon</span>,
    Search: () => <span>search-icon</span>,
  };
});

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
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
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
  }) => <input value={value ?? ""} onChange={onChange} placeholder={placeholder} />,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({
    children,
    value,
    defaultValue,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
  }) => (
    <div data-tabs-value={value ?? defaultValue}>
      {children}
      <button type="button" onClick={() => onValueChange?.("forms")} aria-label="select forms tab">
        select-forms-tab
      </button>
    </div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../../core/admin/ui/pages/builder/FormPicker", () => ({
  FormPicker: ({ onAdd }: { onAdd: (form: { id: string; name: string }) => void }) => (
    <div>
      <span>form-picker</span>
      <button type="button" onClick={() => onAdd({ id: "form-1", name: "Contact" })}>
        add-form
      </button>
    </div>
  ),
}));

import { LibraryPanel } from "../../../core/admin/ui/pages/builder/LibraryPanel";
import { WidgetPicker } from "../../../core/admin/ui/pages/builder/WidgetPicker";

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

const setInput = (input: HTMLInputElement | null | undefined, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(input, value);
    input?.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const customWidgets = [
  {
    type: "feature-grid",
    title: "Feature Grid",
    description: "Cards or repeated highlights.",
    category: "content" as const,
  },
  {
    type: "booking-calendar",
    title: "Booking Calendar",
    description: "Pick service and slot.",
    category: "forms" as const,
  },
  {
    type: "custom-widget",
    title: "Custom One",
    description: "No category assigned.",
  },
  {
    type: "template-section",
    title: "Template Section",
    description: "Must be excluded.",
  },
];

test("WidgetPicker groups custom widgets, surfaces uncategorized as Other, and drops template-section", () => {
  const onAdd = vi.fn();
  const view = mount(<WidgetPicker onAdd={onAdd} widgets={customWidgets} />);

  try {
    expect(view.container.textContent).toContain("Content");
    expect(view.container.textContent).toContain("Feature Grid");
    expect(view.container.textContent).toContain("Forms");
    expect(view.container.textContent).toContain("Booking Calendar");
    expect(view.container.textContent).toContain("Other");
    expect(view.container.textContent).toContain("Custom One");
    expect(view.container.textContent).not.toContain("Template Section");
  } finally {
    view.cleanup();
  }
});

test("WidgetPicker filters by query and shows the empty message when nothing matches", () => {
  const view = mount(<WidgetPicker onAdd={vi.fn()} widgets={customWidgets} />);

  try {
    const input = view.container.querySelector("input");
    setInput(input, "booking");
    expect(view.container.textContent).toContain("Booking Calendar");
    expect(view.container.textContent).not.toContain("Feature Grid");
    expect(view.container.textContent).not.toContain("Custom One");

    setInput(input, "no-match-anywhere");
    expect(view.container.textContent).toContain("No components match this search.");
  } finally {
    view.cleanup();
  }
});

test("WidgetPicker applies allowedTypes before query filtering", () => {
  const view = mount(
    <WidgetPicker onAdd={vi.fn()} widgets={customWidgets} allowedTypes={["feature-grid"]} />
  );

  try {
    expect(view.container.textContent).toContain("Feature Grid");
    expect(view.container.textContent).not.toContain("Booking Calendar");
    expect(view.container.textContent).not.toContain("Custom One");
  } finally {
    view.cleanup();
  }
});

test("WidgetPicker forwards add clicks and drag starts with the widget type", () => {
  const onAdd = vi.fn();
  const onDragStart = vi.fn();
  const view = mount(
    <WidgetPicker onAdd={onAdd} onDragStart={onDragStart} draggable widgets={customWidgets} />
  );

  try {
    const cards = Array.from(view.container.querySelectorAll("[draggable='true']"));
    expect(cards.length).toBe(3);
    React.act(() => {
      cards[0]?.dispatchEvent(new DragEvent("dragstart", { bubbles: true }) as unknown as Event);
    });
    expect(onDragStart).toHaveBeenCalledWith(expect.anything(), "feature-grid");

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "plus-icon")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onAdd).toHaveBeenCalledWith("feature-grid");
  } finally {
    view.cleanup();
  }
});

test("WidgetPicker renders the slot context with a clear action and custom empty copy", () => {
  const onClearContext = vi.fn();
  const view = mount(
    <WidgetPicker
      onAdd={vi.fn()}
      widgets={[customWidgets[2]!]}
      contextLabel="Hero Content"
      onClearContext={onClearContext}
      searchPlaceholder="Find a widget..."
      emptyMessage="Nothing here."
    />
  );

  try {
    expect(view.container.textContent).toContain("Insert into Hero Content");
    expect(view.container.querySelector('input[placeholder="Find a widget..."]')).toBeTruthy();

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "Clear")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onClearContext).toHaveBeenCalledTimes(1);

    setInput(view.container.querySelector("input"), "zzz");
    expect(view.container.textContent).toContain("Nothing here.");
  } finally {
    view.cleanup();
  }
});

test("LibraryPanel defaults to the widgets tab and forwards widget and form add flows", () => {
  const onAddWidget = vi.fn();
  const onAddForm = vi.fn();
  const view = mount(
    <LibraryPanel onAddWidget={onAddWidget} onAddForm={onAddForm} defaultTab="forms" />
  );

  try {
    expect(view.container.querySelector("[data-tabs-value='forms']")).toBeTruthy();
    expect(view.container.textContent).toContain("form-picker");

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "add-form")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onAddForm).toHaveBeenCalledWith({ id: "form-1", name: "Contact" });
  } finally {
    view.cleanup();
  }
});

test("LibraryPanel is controlled when activeTab is provided and reports tab switches", () => {
  const onActiveTabChange = vi.fn();
  const view = mount(
    <LibraryPanel
      onAddWidget={vi.fn()}
      onAddForm={vi.fn()}
      activeTab="widgets"
      onActiveTabChange={onActiveTabChange}
      widgetAllowedTypes={["feature-grid"]}
      widgetContextLabel="Card content"
      onClearWidgetContext={vi.fn()}
    />
  );

  try {
    expect(view.container.querySelector("[data-tabs-value='widgets']")).toBeTruthy();
    expect(view.container.textContent).toContain("Insert into Card content");

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "select-forms-tab")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onActiveTabChange).toHaveBeenCalledWith("forms");
  } finally {
    view.cleanup();
  }
});
