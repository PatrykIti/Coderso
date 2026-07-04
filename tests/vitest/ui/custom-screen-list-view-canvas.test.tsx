// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import { CustomScreenEditorPage } from "../../../core/admin/ui/custom-screens/CustomScreenEditorPage";
import { ListViewCanvas } from "../../../core/admin/ui/custom-screens/ListViewCanvas";
import type { CustomScreenListViewDefinition } from "../../../core/services/customScreens/customScreenSchemas";
import { renderAdminUi } from "../../utils/adminRouterRender";

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
      statusLabel: {
        type: "string" as const,
        title: "Status label",
        xFieldType: "text",
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
      visible: false,
    },
    {
      id: "projectTitle",
      source: "field",
      field: "projectTitle",
      label: "Project title",
      formatter: "text",
      visible: true,
    },
    {
      id: "statusLabel",
      source: "field",
      field: "statusLabel",
      label: "Status label",
      formatter: "text",
      visible: true,
    },
  ],
  filters: [],
  defaultSort: { field: "updatedAt", direction: "desc" },
  bulkActions: { delete: true, publish: true, unpublish: true },
};

function Harness() {
  const [listView, setListView] = useState(initialListView);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>("title");

  return (
    <ListViewCanvas
      contentType={contentType}
      listView={listView}
      selectedColumnId={selectedColumnId}
      onSelectColumn={setSelectedColumnId}
      onMoveColumn={(columnId, direction) => {
        const visibleColumns = listView.columns.filter((column) => column.visible !== false);
        const visibleIds = visibleColumns.map((column) => column.id);
        const currentVisibleIndex = visibleIds.indexOf(columnId);
        if (currentVisibleIndex === -1) return;
        const swapVisibleId =
          direction === "left"
            ? visibleIds[currentVisibleIndex - 1]
            : visibleIds[currentVisibleIndex + 1];
        if (!swapVisibleId) return;
        const currentIndex = listView.columns.findIndex((column) => column.id === columnId);
        const swapIndex = listView.columns.findIndex((column) => column.id === swapVisibleId);
        if (currentIndex === -1 || swapIndex === -1) return;
        const nextColumns = [...listView.columns];
        [nextColumns[currentIndex], nextColumns[swapIndex]] = [
          nextColumns[swapIndex]!,
          nextColumns[currentIndex]!,
        ];
        setListView({ ...listView, columns: nextColumns });
      }}
      showHiddenColumnsTray
    />
  );
}

const mount = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(<Harness />);
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

const headerOrder = (container: ParentNode) =>
  Array.from(container.querySelectorAll("[data-column-select]")).map((node) => {
    const firstLabel = node.querySelector("span");
    return firstLabel?.textContent?.trim() ?? node.textContent?.trim();
  });

afterEach(() => {
  document.body.innerHTML = "";
});

test("list view canvas reorders visible columns in the header and keeps hidden columns reachable", () => {
  const view = mount();

  try {
    expect(headerOrder(view.container)).toEqual(["Record", "Project title", "Status label"]);

    const leftButtons = Array.from(
      view.container.querySelectorAll('button[aria-label^="Move"]')
    ) as HTMLButtonElement[];
    expect(
      leftButtons.find((button) => button.getAttribute("aria-label") === "Move Record left")
        ?.disabled
    ).toBe(true);
    expect(
      leftButtons.find((button) => button.getAttribute("aria-label") === "Move Status label right")
        ?.disabled
    ).toBe(true);

    const statusMoveLeft = leftButtons.find(
      (button) => button.getAttribute("aria-label") === "Move Status label left"
    );
    React.act(() => {
      statusMoveLeft?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(headerOrder(view.container)).toEqual(["Record", "Status label", "Project title"]);
    expect(view.container.querySelector('[data-hidden-columns-tray="true"]')).not.toBeNull();
    expect(view.container.textContent).toContain("Hidden columns");
    expect(view.container.textContent).toContain("City");
    expect(view.container.querySelector('[data-hidden-column-id="city"]')).not.toBeNull();
    expect(view.container.querySelectorAll('button[aria-label^="Move"]').length).toBe(6);

    const statusSelect = view.container.querySelector('[data-column-select="statusLabel"]');
    React.act(() => {
      statusSelect?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(
      view.container.querySelector(
        '[data-selected-column="true"] [data-column-select="statusLabel"]'
      )
    ).not.toBeNull();
  } finally {
    view.cleanup();
  }
});

test("custom screen editor renders the entry-view builder and no List-view editor surface", () => {
  const html = renderAdminUi(<CustomScreenEditorPage />, {
    path: "/admin/advanced/custom-screens/new",
  });

  // TASK-498-01: the List-view EDITOR surface is removed — the editor is the
  // always-on entry-view builder. It still renders through the shared
  // `CanvasEditor` shell (dotted scroller + relocated ScreenPanelToggleRail +
  // Hide/Show panel toggle).
  expect(html).toContain('data-screen-editor-canvas-scroller="true"');
  expect(html).toContain('data-screen-toolbar-rail="true"');
  expect(html).toContain("Hide panel");
  expect(html).toContain('data-screen-authoring-canvas="true"');
  expect(html).not.toContain('data-editor-shell-left-panel="true"');
  expect(html).not.toContain('data-editor-shell-right-panel="true"');
  expect(html).not.toContain("Components");
  // List-view editor markers are absent (no column inspector, no column selection).
  expect(html).not.toContain("Selected Column");
  expect(html).not.toContain("data-selected-column");
});
