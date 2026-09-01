// @vitest-environment happy-dom
import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ContentTypeFieldsPanel } from "../../../core/admin/ui/content-types/ContentTypeFieldsPanel";
import type { ContentField } from "../../../core/admin/ui/content-types/SchemaBuilder";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-slot="badge">{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    "aria-label": ariaLabel,
  }: {
    children?: React.ReactNode;
    onClick?: (event: React.MouseEvent) => void;
    "aria-label"?: string;
  }) => (
    <button type="button" aria-label={ariaLabel} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="dropdown-menu">{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="dropdown-trigger">{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onSelect,
    className,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
    className?: string;
  }) => (
    <button type="button" data-slot="dropdown-item" className={className} onClick={onSelect}>
      {children}
    </button>
  ),
}));

const fields: ContentField[] = [
  { id: "f1", name: "title", type: "text", label: "Title" },
  { id: "f2", name: "body", type: "richtext", label: "Body" },
  { id: "f3", name: "publishedAt", type: "date", label: "Published at" },
];

let container: HTMLDivElement | null = null;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  container?.remove();
  container = null;
});

function mount(overrides?: { selectedId?: string | null; fields?: ContentField[] }) {
  const onSelect = vi.fn();
  const onReorder = vi.fn();
  const onDuplicateField = vi.fn();
  const onDeleteField = vi.fn();
  const root = createRoot(container!);
  React.act(() => {
    root.render(
      <ContentTypeFieldsPanel
        fields={overrides?.fields ?? fields}
        selectedId={overrides?.selectedId ?? null}
        onSelect={onSelect}
        onReorder={onReorder}
        onDuplicateField={onDuplicateField}
        onDeleteField={onDeleteField}
      />
    );
  });
  return { onSelect, onReorder, onDuplicateField, onDeleteField };
}

function rows() {
  return Array.from(
    container!.querySelectorAll<HTMLElement>('[aria-label^="Field "][role="button"]')
  );
}

describe("ContentTypeFieldsPanel", () => {
  test("renders the empty state when there are no fields", () => {
    mount({ fields: [] });
    expect(container!.textContent).toContain("Add your first field to start building the schema.");
  });

  test("renders field rows with labels and canonical type badges", () => {
    mount();
    expect(rows()).toHaveLength(3);
    const badges = container!.querySelectorAll('[data-slot="badge"]');
    expect(badges[0].textContent).toBe("Text");
    expect(badges[1].textContent).toBe("Rich text");
    expect(badges[2].textContent).toBe("Date");
    expect(container!.textContent).toContain("Title");
    expect(container!.textContent).toContain("Body");
  });

  test("selects a field when its row is clicked", () => {
    const { onSelect } = mount();
    rows()[1].click();
    expect(onSelect).toHaveBeenCalledWith("f2");
  });

  test("marks the selected row with the active background", () => {
    mount({ selectedId: "f2" });
    const row = rows()[1];
    expect(row.className.split(" ")).toContain("bg-accent");
    expect(rows()[0].className.split(" ")).not.toContain("bg-accent");
  });

  test("reorders with Arrow Up and Arrow Down keyboard events", () => {
    const { onReorder } = mount();
    rows()[2].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    expect(onReorder).toHaveBeenCalledWith(2, 1);
    rows()[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(onReorder).toHaveBeenCalledWith(0, 1);
  });

  test("drag start then drop calls onReorder with final indices", () => {
    const { onReorder } = mount();
    const fakeDataTransfer = { effectAllowed: "", dropEffect: "" } as unknown as DataTransfer;
    const dragStart = new Event("dragstart", { bubbles: true });
    Object.defineProperty(dragStart, "dataTransfer", { value: fakeDataTransfer });
    const drop = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(drop, "dataTransfer", { value: fakeDataTransfer });
    React.act(() => {
      rows()[0].dispatchEvent(dragStart);
    });
    React.act(() => {
      rows()[2].dispatchEvent(drop);
    });
    expect(onReorder).toHaveBeenCalledWith(0, 2);
  });

  test("prevents native dragover and announces a move drop effect", () => {
    mount();
    const dataTransfer = { dropEffect: "none" } as Pick<DataTransfer, "dropEffect">;
    const dragOver = new Event("dragover", { bubbles: true, cancelable: true });
    Object.defineProperty(dragOver, "dataTransfer", { value: dataTransfer });
    React.act(() => {
      rows()[1].dispatchEvent(dragOver);
    });
    expect(dragOver.defaultPrevented).toBe(true);
    expect(dataTransfer.dropEffect).toBe("move");
  });

  test("drop without a drag start never calls onReorder", () => {
    const { onReorder } = mount();
    const drop = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(drop, "dataTransfer", { value: {} as DataTransfer });
    React.act(() => {
      rows()[1].dispatchEvent(drop);
    });
    expect(onReorder).not.toHaveBeenCalled();
  });

  test("dropdown actions emit edit, duplicate and delete intents", () => {
    const { onSelect, onDuplicateField, onDeleteField } = mount();
    const items = rows()[0].querySelectorAll<HTMLButtonElement>('[data-slot="dropdown-item"]');
    expect(items).toHaveLength(3);
    items[0].click(); // Edit
    expect(onSelect).toHaveBeenCalledWith("f1");
    items[1].click(); // Duplicate field
    expect(onDuplicateField).toHaveBeenCalledWith("f1");
    items[2].click(); // Delete field
    expect(onDeleteField).toHaveBeenCalledWith("f1");
    expect(items[2].className).toContain("text-destructive");
  });

  test("clicking the action button does not select the row", () => {
    const { onSelect } = mount();
    const actionButton = container!.querySelector<HTMLButtonElement>(
      '[aria-label="Field actions"]'
    );
    expect(actionButton).not.toBeNull();
    const clickEvent = new MouseEvent("click", { bubbles: true });
    actionButton!.dispatchEvent(clickEvent);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
