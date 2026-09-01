// @vitest-environment happy-dom
//
// TASK-105-08-04: ListViewDesigner / ListViewColumnInspector / ListViewElementLibrary
// interactive flows (default sort, direction, filter toggles, bulk action
// checkboxes, column label/formatter/visibility edits, element library add).

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { ListViewColumnInspector } from "../../../core/admin/ui/custom-screens/ListViewColumnInspector";
import { ListViewDesigner } from "../../../core/admin/ui/custom-screens/ListViewDesigner";
import { ListViewElementLibrary } from "../../../core/admin/ui/custom-screens/ListViewElementLibrary";
import type { CustomScreenListColumn } from "../../../core/services/customScreens/customScreenSchemas";
import type { CustomScreenListViewDefinition } from "../../../core/services/customScreens/customScreenSchemas";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const contentType = {
  id: "type-1",
  name: "Projects",
  slug: "projects",
  status: "published" as const,
  schema: {
    type: "object" as const,
    additionalProperties: false as const,
    properties: {
      projectTitle: {
        type: "string" as const,
        title: "Project title",
        xFieldType: "text",
      },
      city: {
        type: "string" as const,
        title: "City",
        xFieldType: "text",
      },
      priority: {
        type: "string" as const,
        title: "Priority",
        xFieldType: "select",
      },
      region: {
        type: "string" as const,
        title: "Region",
        xFieldType: "select",
      },
    },
  },
  createdAt: "2026-05-02T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
};

const initialListView: CustomScreenListViewDefinition = {
  columns: [
    {
      id: "title",
      source: "system",
      field: "title",
      label: "Record",
      formatter: "text",
      visible: true,
    },
    {
      id: "city",
      source: "field",
      field: "city",
      label: "City",
      formatter: "text",
      visible: true,
    },
  ],
  filters: [
    {
      id: "filter-field-priority",
      source: "field",
      field: "priority",
      label: "Priority",
      operator: "equals",
      enabled: true,
    },
    {
      id: "filter-system-status",
      source: "system",
      field: "status",
      label: "Status",
      operator: "equals",
      enabled: false,
    },
  ],
  defaultSort: { field: "updatedAt", direction: "desc" },
  bulkActions: { delete: true, publish: true, unpublish: true },
};

function DesignerHost() {
  const [value, setValue] = useState(initialListView);
  return <ListViewDesigner contentType={contentType} value={value} onChange={setValue} />;
}

function ColumnInspectorHost({
  column,
  onChange,
  onRemove,
}: {
  column: CustomScreenListColumn | null;
  onChange: (patch: Partial<CustomScreenListColumn>) => void;
  onRemove: () => void;
}) {
  return <ListViewColumnInspector column={column} onChange={onChange} onRemove={onRemove} />;
}

const mount = (node: React.ReactElement) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  return {
    container,
    cleanup: () => {
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

const pointerClick = (element: Element | null | undefined) => {
  expect(element, "pointer click target missing").not.toBeNull();
  const target = element as HTMLElement;
  React.act(() => {
    target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
};

const clickElement = (element: Element | null | undefined) => {
  expect(element, "expected element to exist").toBeTruthy();
  if (!element) throw new Error("expected element to exist");
  React.act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const findButton = (root: ParentNode, text: string) =>
  Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.textContent?.trim() === text
  ) ?? null;

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("designer shows the content-type placeholder when none is selected", () => {
  const view = mount(
    <ListViewDesigner contentType={null} value={initialListView} onChange={() => undefined} />
  );
  try {
    expect(view.container.textContent).toContain(
      "Select a content type before configuring List View."
    );
  } finally {
    view.cleanup();
  }
});

test("designer renders default sort and direction selects with the current values", () => {
  const view = mount(<DesignerHost />);
  try {
    expect(view.container.textContent).toContain("Default sort");
    expect(view.container.textContent).toContain("Direction");

    const triggers = Array.from(view.container.querySelectorAll<HTMLElement>("[role='combobox']"));
    expect(triggers.length).toBe(2);
    pointerClick(triggers[0]);
    const options = Array.from(document.body.querySelectorAll<HTMLElement>("[role='option']"));
    const labels = options.map((option) => option.textContent?.trim());
    expect(labels).toContain("Record");
    expect(labels).toContain("City");
    expect(labels).toContain("Status");
    expect(labels).toContain("Updated");
  } finally {
    view.cleanup();
  }
});

test("designer changes the direction through the direction select", () => {
  const view = mount(<DesignerHost />);
  try {
    const triggers = Array.from(view.container.querySelectorAll<HTMLElement>("[role='combobox']"));
    pointerClick(triggers[1]);
    const ascOption = Array.from(
      document.body.querySelectorAll<HTMLElement>("[role='option']")
    ).find((option) => option.textContent?.trim() === "Ascending");
    expect(ascOption).not.toBeNull();
    pointerClick(ascOption);
    expect(triggers[1]!.textContent?.trim()).toBe("Ascending");
  } finally {
    view.cleanup();
  }
});

test("designer toggles an existing disabled filter to enabled and keeps others intact", () => {
  const view = mount(<DesignerHost />);
  try {
    const statusCheckbox = Array.from(view.container.querySelectorAll<HTMLElement>("label"))
      .find((label) => label.textContent?.includes("Status"))
      ?.querySelector("button");
    expect(statusCheckbox?.getAttribute("data-state")).toBe("unchecked");
    clickElement(statusCheckbox);
    expect(statusCheckbox?.getAttribute("data-state")).toBe("checked");

    const priorityCheckbox = Array.from(view.container.querySelectorAll<HTMLElement>("label"))
      .find((label) => label.textContent?.includes("Priority"))
      ?.querySelector("button");
    expect(priorityCheckbox?.getAttribute("data-state")).toBe("checked");
  } finally {
    view.cleanup();
  }
});

test("designer toggles a select-formatter filter off without removing it", () => {
  const view = mount(<DesignerHost />);
  try {
    const priorityCheckbox = Array.from(view.container.querySelectorAll<HTMLElement>("label"))
      .find((label) => label.textContent?.includes("Priority"))
      ?.querySelector("button");
    expect(priorityCheckbox?.getAttribute("data-state")).toBe("checked");
    clickElement(priorityCheckbox);
    expect(priorityCheckbox?.getAttribute("data-state")).toBe("unchecked");
    expect(view.container.textContent).toContain("Priority");
  } finally {
    view.cleanup();
  }
});

test("designer toggles bulk action checkboxes", () => {
  const view = mount(<DesignerHost />);
  try {
    const publishCheckbox = Array.from(view.container.querySelectorAll<HTMLElement>("label"))
      .find((label) => label.textContent?.includes("Publish"))
      ?.querySelector("button");
    expect(publishCheckbox?.getAttribute("data-state")).toBe("checked");
    clickElement(publishCheckbox);
    expect(publishCheckbox?.getAttribute("data-state")).toBe("unchecked");

    const draftCheckbox = Array.from(view.container.querySelectorAll<HTMLElement>("label"))
      .find((label) => label.textContent?.includes("Move to Draft"))
      ?.querySelector("button");
    expect(draftCheckbox?.getAttribute("data-state")).toBe("checked");
    clickElement(draftCheckbox);
    expect(draftCheckbox?.getAttribute("data-state")).toBe("unchecked");

    const deleteCheckbox = Array.from(view.container.querySelectorAll<HTMLElement>("label"))
      .find((label) => label.textContent?.includes("Delete"))
      ?.querySelector("button");
    expect(deleteCheckbox?.getAttribute("data-state")).toBe("checked");
    clickElement(deleteCheckbox);
    expect(deleteCheckbox?.getAttribute("data-state")).toBe("unchecked");
  } finally {
    view.cleanup();
  }
});

test("designer appends a brand-new filter for a select field not yet configured", () => {
  const view = mount(<DesignerHost />);
  try {
    const regionLabel = Array.from(view.container.querySelectorAll<HTMLElement>("label")).find(
      (label) => label.textContent?.includes("Region")
    );
    expect(regionLabel).not.toBeNull();
    const regionCheckbox = regionLabel?.querySelector("button");
    expect(regionCheckbox?.getAttribute("data-state")).toBe("unchecked");
    clickElement(regionCheckbox);
    expect(regionCheckbox?.getAttribute("data-state")).toBe("checked");
  } finally {
    view.cleanup();
  }
});

test("designer changes the default sort field through the first select", () => {
  const view = mount(<DesignerHost />);
  try {
    const triggers = Array.from(view.container.querySelectorAll<HTMLElement>("[role='combobox']"));
    pointerClick(triggers[0]);
    const cityOption = Array.from(
      document.body.querySelectorAll<HTMLElement>("[role='option']")
    ).find((option) => option.textContent?.trim() === "City");
    expect(cityOption).not.toBeNull();
    pointerClick(cityOption);
    expect(triggers[0]!.textContent?.trim()).toBe("City");
  } finally {
    view.cleanup();
  }
});

test("column inspector shows the empty placeholder for a null column", () => {
  const view = mount(
    <ColumnInspectorHost column={null} onChange={() => undefined} onRemove={() => undefined} />
  );
  try {
    expect(view.container.textContent).toContain(
      "Select a column on the canvas to edit its label, formatter, and visibility."
    );
  } finally {
    view.cleanup();
  }
});

test("column inspector edits label, formatter, and visibility and removes the column", () => {
  const onChange = vi.fn();
  const onRemove = vi.fn();
  const column: CustomScreenListColumn = {
    id: "city",
    source: "field",
    field: "city",
    label: "City",
    formatter: "text",
    visible: true,
  };
  const view = mount(
    <ColumnInspectorHost column={column} onChange={onChange} onRemove={onRemove} />
  );
  try {
    expect(view.container.textContent).toContain("Content field · city");

    const input = view.container.querySelector<HTMLInputElement>("input");
    expect(input?.value).toBe("City");
    React.act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(input as HTMLInputElement),
        "value"
      )?.set;
      setter?.call(input, "City renamed");
      input?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith({ label: "City renamed" });

    const trigger = view.container.querySelector<HTMLElement>("[role='combobox']");
    pointerClick(trigger);
    const dateOption = Array.from(
      document.body.querySelectorAll<HTMLElement>("[role='option']")
    ).find((option) => option.textContent?.trim() === "date");
    pointerClick(dateOption);
    expect(onChange).toHaveBeenCalledWith({ formatter: "date" });

    const visibility = Array.from(view.container.querySelectorAll<HTMLElement>("label"))
      .find((label) => label.textContent?.includes("Visible on records list"))
      ?.querySelector("button");
    expect(visibility?.getAttribute("data-state")).toBe("checked");
    clickElement(visibility);
    expect(onChange).toHaveBeenCalledWith({ visible: false });

    clickElement(findButton(view.container, ""));
    expect(onRemove).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});

test("column inspector labels system columns and hides when visible is false", () => {
  const view = mount(
    <ColumnInspectorHost
      column={{
        id: "title",
        source: "system",
        field: "title",
        label: "Record",
        formatter: "text",
        visible: false,
      }}
      onChange={() => undefined}
      onRemove={() => undefined}
    />
  );
  try {
    expect(view.container.textContent).toContain("System field · title");
    const visibility = Array.from(view.container.querySelectorAll<HTMLElement>("label"))
      .find((label) => label.textContent?.includes("Visible on records list"))
      ?.querySelector("button");
    expect(visibility?.getAttribute("data-state")).toBe("unchecked");
  } finally {
    view.cleanup();
  }
});

test("element library shows the empty state when all columns are present", () => {
  const view = mount(<ListViewElementLibrary options={[]} onAddColumn={() => undefined} />);
  try {
    expect(view.container.textContent).toContain(
      "All available columns are already present in this view."
    );
  } finally {
    view.cleanup();
  }
});

test("element library lists options and adds the clicked column", () => {
  const onAddColumn = vi.fn();
  const options = [
    { source: "system" as const, field: "status", label: "Status", formatter: "text" as const },
    {
      source: "field" as const,
      field: "priority",
      label: "Priority",
      formatter: "select" as const,
    },
  ];
  const view = mount(<ListViewElementLibrary options={options} onAddColumn={onAddColumn} />);
  try {
    expect(view.container.textContent).toContain("Status");
    expect(view.container.textContent).toContain("System field · status");
    expect(view.container.textContent).toContain("Priority");
    expect(view.container.textContent).toContain("Content field · priority");

    const addButtons = view.container.querySelectorAll<HTMLButtonElement>("button");
    expect(addButtons.length).toBe(2);
    clickElement(addButtons[1]);
    expect(onAddColumn).toHaveBeenCalledWith(options[1]);
  } finally {
    view.cleanup();
  }
});
