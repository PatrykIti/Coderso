// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

// TASK-498-03: the dialog now precomputes its OWN relatedEntries via the existing
// entries-read. Mock only listEntriesCached; keep the rest of entriesClient real so the
// list-preview path (buildCustomScreenPreviewEntries) is unaffected.
const listEntriesCached = vi.fn(async (_typeSlug: string) => [
  {
    id: "task-1",
    title: "Draft the brief",
    slug: "draft-the-brief",
    status: "draft",
    updatedAt: "2026-06-01T00:00:00.000Z",
    data: { priority: "high" },
  },
  {
    id: "task-2",
    title: "Review the PR",
    slug: "review-the-pr",
    status: "scheduled",
    updatedAt: "2026-06-02T00:00:00.000Z",
    data: { priority: "medium" },
  },
]);

vi.mock("@/services/entriesClient", async () => {
  const actual = await vi.importActual<typeof import("@/services/entriesClient")>(
    "@/services/entriesClient"
  );
  return {
    ...actual,
    listEntriesCached: (typeSlug: string) => listEntriesCached(typeSlug),
  };
});

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

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

afterEach(() => {
  document.body.innerHTML = "";
  listEntriesCached.mockClear();
});

const relatedFields = [
  {
    id: "f-tasks",
    name: "relatedTasks",
    type: "relation" as const,
    label: "Related tasks",
    relation: { target: "tasks", multiple: true },
  },
];

const relatedListDocument = {
  schemaVersion: 1 as const,
  sections: [
    {
      id: "section-1",
      type: "section" as const,
      data: { title: "Details" },
      blocks: [
        {
          id: "related-1",
          type: "related-list" as const,
          // stored data.target is STALE/empty on purpose — the host must derive from the
          // bound relation field's relation.target instead.
          data: {
            label: "Tasks",
            target: "",
            variant: "checklist",
            displayField: "priority",
            limit: 5,
          },
        },
      ],
    },
  ],
};

const relatedListBindings = [
  {
    id: "binding-items",
    blockId: "related-1",
    propPath: "items",
    source: "entry" as const,
    field: "relatedTasks",
    mode: "read" as const,
  },
];

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
            id: "section-1",
            type: "section",
            data: { title: "Details" },
            blocks: [
              {
                id: "header-1",
                type: "record-header",
                data: {
                  title: "Untitled record",
                  subtitle: "Preview subtitle",
                },
              },
            ],
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
    // No related-list block in this document → the precompute is block-guarded (no fetch).
    expect(listEntriesCached).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("dialog precomputes its OWN relatedEntries from previewRecordState.data (not a no-op skeleton)", async () => {
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
      document={relatedListDocument}
      bindings={relatedListBindings}
      fields={relatedFields}
      previewRecordState={{
        source: "entry",
        entryId: "entry-1",
        note: "Previewing the first record from Projects.",
        data: {
          title: "Project title",
          // the FIRST entry's relation IDs live in previewRecordState.data.
          relatedTasks: ["task-1", "task-2"],
        },
      }}
    />
  );

  try {
    await flush();
    // target is DERIVED from the bound field's relation.target ("tasks"), NOT stored data.target ("").
    expect(listEntriesCached).toHaveBeenCalledWith("tasks");
    // resolved rows render (not a perpetual skeleton).
    expect(document.body.textContent).toContain("Draft the brief");
    expect(document.body.textContent).toContain("Review the PR");
    expect(document.body.textContent).not.toContain("Chip");
    expect(document.body.querySelector('[data-screen-related-entry="task-1"]')).not.toBeNull();
  } finally {
    view.cleanup();
  }
});

test("dialog no-records fallback relation value coerces + looks up to the empty state (no crash)", async () => {
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
      document={relatedListDocument}
      bindings={relatedListBindings}
      fields={relatedFields}
      previewRecordState={{
        source: "fallback",
        entryId: null,
        fallbackReason: "no-records",
        note: "No records exist for this content type yet. Preview is using schema fallback values.",
        // customScreenPreviewData.ts:38 — the schema fallback relation value.
        data: { title: "Project title", relatedTasks: ["Related item"] },
      }}
    />
  );

  try {
    await flush();
    // "Related item" coerces to [id], is looked up, misses → empty state (no throw).
    // The empty-state label reads the block's own data.target (renderer-local).
    expect(document.body.textContent).toContain("No related");
    expect(document.body.textContent).not.toContain("Draft the brief");
  } finally {
    view.cleanup();
  }
});
