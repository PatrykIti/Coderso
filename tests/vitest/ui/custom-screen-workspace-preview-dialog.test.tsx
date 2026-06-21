// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import { CustomScreenWorkspacePreviewDialog } from "../../../core/admin/ui/custom-screens/CustomScreenWorkspacePreviewDialog";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
});

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
    },
  },
  createdAt: "2026-05-02T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
};

test("CustomScreenWorkspacePreviewDialog renders list preview table", () => {
  const view = mount(
    <CustomScreenWorkspacePreviewDialog
      open
      onOpenChange={() => undefined}
      mode="list-view"
      contentType={contentType}
      listView={{
        columns: [
          {
            id: "title",
            source: "system",
            field: "title",
            label: "Record",
            formatter: "text",
            visible: true,
          },
        ],
        filters: [],
        defaultSort: { field: "updatedAt", direction: "desc" },
        bulkActions: { delete: true, publish: true, unpublish: true },
      }}
      document={{ schemaVersion: 1, sections: [] }}
      bindings={[]}
      previewRecordState={{
        source: "fallback",
        entryId: null,
        fallbackReason: "no-records",
        note: "No records exist for this content type yet. Preview is using schema fallback values.",
        data: {},
      }}
    />
  );

  try {
    expect(document.body.textContent).toContain("List View Preview");
    expect(document.body.textContent).toContain("House Aurora");
    expect(document.body.textContent).toContain("House Nova");
    expect(document.body.querySelector('[data-preview-shell="roomy"]')).not.toBeNull();
    expect(document.body.querySelector('[data-preview-list-shell="wide"]')).not.toBeNull();
  } finally {
    view.cleanup();
  }
});

test("CustomScreenWorkspacePreviewDialog renders editor preview from screen bindings", () => {
  const view = mount(
    <CustomScreenWorkspacePreviewDialog
      open
      onOpenChange={() => undefined}
      mode="editor-view"
      contentType={contentType}
      listView={{
        columns: [],
        filters: [],
        defaultSort: { field: "updatedAt", direction: "desc" },
        bulkActions: { delete: true, publish: true, unpublish: true },
      }}
      document={{
        schemaVersion: 1,
        sections: [
          {
            id: "header-1",
            type: "record-header",
            data: {
              title: "Untitled record",
              subtitle: "Preview subtitle",
            },
          },
        ],
      }}
      bindings={[
        {
          id: "binding-title",
          blockId: "header-1",
          propPath: "title",
          source: "entry",
          field: "title",
          mode: "read",
        },
        {
          id: "binding-subtitle",
          blockId: "header-1",
          propPath: "subtitle",
          source: "entry",
          field: "projectTitle",
          mode: "read",
        },
      ]}
      previewRecordState={{
        source: "entry",
        entryId: "entry-1",
        note: "Previewing the first record from Projects.",
        data: {
          title: "Project title",
          projectTitle: "Villa Aurora",
        },
      }}
    />
  );

  try {
    expect(document.body.textContent).toContain("Editor View Preview");
    expect(document.body.textContent).toContain("Project title");
    expect(document.body.textContent).toContain("Villa Aurora");
    expect(document.body.textContent).not.toContain("Untitled record");
    expect(document.body.querySelector('[data-preview-device="desktop"]')).not.toBeNull();
    expect(document.body.textContent).toContain("Previewing the first record from Projects.");
  } finally {
    view.cleanup();
  }
});
