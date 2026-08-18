// @vitest-environment happy-dom

// TASK-505-03: host wiring for the section inspector (Item A) + the binding
// recovery affordance (Item B). Renders the full CustomScreenEditorPage with
// mocked clients (same harness shape as screen-editor-sections.test.tsx) and
// asserts VISIBLE, end-to-end behaviour:
//   - the section inspector is reachable on a section-only selection and its
//     Columns/gap writes round-trip into the save payload's `section.style`;
//   - a field-orphan binding surfaces the amber "Orphaned field bindings" notice
//     naming the deleted field, the one-click prune clears it, and Save succeeds;
//   - a returned record carrying a `binding_field_removed` warning shows the
//     post-save pruned-field notice;
//   - a residual malformed-binding 400 shows the static message + detail field(s).
// Plus pure unit coverage of the exported `detectScreenBindingOrphans`.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { ApiClientError } from "../../../core/admin/services/apiClient";
import type { CustomScreenRecord } from "../../../core/admin/services/customScreensClient";
import {
  CustomScreenEditorPage,
  detectScreenBindingOrphans,
} from "../../../core/admin/ui/custom-screens/CustomScreenEditorPage";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import type {
  ScreenDocumentV1,
  ScreenFieldBinding,
} from "../../../core/services/customScreens/customScreenSchemas";

const contentType = {
  id: "type-1",
  name: "Listings",
  slug: "listings",
  status: "published" as const,
  schema: {
    type: "object" as const,
    additionalProperties: false as const,
    properties: {
      title: { type: "string" as const, title: "Title", xFieldType: "text" },
    },
  },
  createdAt: "2026-05-02T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
};

// Screen bound to `bathrooms` — a field that no longer exists on the content
// type (only `title` remains) → a FIELD-ORPHAN survives the client read (no
// content-type context is passed on read, so field-root validation is skipped).
const createScreenRecord = (): CustomScreenRecord => ({
  id: "screen-1",
  name: "Listing Screen",
  contentTypeId: "type-1",
  status: "active" as const,
  collectionRole: null,
  compositionKey: null,
  showInSidebar: true,
  sidebarLabel: "Listings",
  schemaVersion: 4,
  definition: {
    schemaVersion: 4,
    listView: {
      columns: [],
      filters: [],
      defaultSort: { field: "updatedAt", direction: "desc" as const },
      bulkActions: { delete: true, publish: true, unpublish: true },
    },
    editorView: {
      saveMode: "entry" as const,
      interactionMode: "inline" as const,
      document: {
        schemaVersion: 1 as const,
        sections: [
          {
            id: "section-1",
            type: "section",
            label: "Details",
            data: { title: "Details" },
            blocks: [
              {
                id: "field-1",
                type: "field",
                data: { label: "Bathrooms", display: "stacked", field: "bathrooms" },
              },
            ],
          },
        ],
      },
      bindings: [
        {
          id: "field-1-value",
          blockId: "field-1",
          propPath: "value",
          source: "entry",
          field: "bathrooms",
          mode: "readwrite" as const,
        },
      ],
    },
  },
  blocks: [],
  bindings: [],
  revision: 1,
  createdAt: "2026-05-02T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
});

let currentScreenRecord = createScreenRecord();

const updateCustomScreen = vi.fn(async (_id: string, payload: Record<string, unknown>) => {
  const { expectedRevision: _expectedRevision, ...rest } = payload;
  return {
    ...currentScreenRecord,
    ...rest,
    definition:
      (payload.definition as CustomScreenRecord["definition"] | undefined) ??
      currentScreenRecord.definition,
    sidebarLabel: (payload.sidebarLabel as string | null | undefined) ?? null,
    // TASK-569: the server increments the revision on every definition save.
    revision: (currentScreenRecord.revision ?? 0) + 1,
  } as CustomScreenRecord;
});

vi.mock("@/services/customScreensClient", () => ({
  createCustomScreen: vi.fn(),
  updateCustomScreen: (...args: [string, Record<string, unknown>]) => updateCustomScreen(...args),
  getCachedCustomScreens: vi.fn(() => [currentScreenRecord]),
  listCustomScreensCached: vi.fn(async () => [currentScreenRecord]),
  getCachedCustomScreen: vi.fn(() => currentScreenRecord),
  getCustomScreenCached: vi.fn(async () => currentScreenRecord),
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: vi.fn(() => [contentType]),
  listContentTypesCached: vi.fn(async () => [contentType]),
}));

vi.mock("@/utils/cacheBus", () => ({
  createCacheEventOperationToken: () => Symbol(),
  subscribeCacheEvents: vi.fn(() => () => undefined),
}));

vi.mock("@/ui/assistant/activeSurfaceContext", () => ({
  clearActiveAssistantSurfaceContext: vi.fn(),
  setActiveAssistantSurfaceContext: vi.fn(),
  useActiveAssistantSurfaceContext: vi.fn(() => null),
}));

vi.mock("@/services/solutionKitsClient", () => ({
  getCachedSolutionKits: vi.fn(() => []),
  listSolutionKitsCached: vi.fn(async () => []),
}));

vi.mock("@/services/solutionKitSelection", () => ({
  getActiveSolutionKitId: vi.fn(() => null),
  subscribeActiveSolutionKitId: vi.fn(() => () => undefined),
  buildAdvancedFeatureFlagsForSolutionKit: vi.fn(() => ({})),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (path: string) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath={path}>
        <CustomScreenEditorPage />
      </AdminRouterProvider>
    );
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
    for (let index = 0; index < 5; index += 1) {
      await Promise.resolve();
    }
  });
};

const click = (element: Element | null) => {
  React.act(() => {
    element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const setInputValue = (input: HTMLInputElement, next: string) => {
  React.act(() => {
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")?.set;
    setter?.call(input, next);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const selectSection = (container: ParentNode, sectionId: string) => {
  click(container.querySelector(`[data-screen-section-id="${sectionId}"]`));
};

const saveButton = (container: ParentNode) =>
  Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Save"
  ) ?? null;

beforeEach(() => {
  currentScreenRecord = createScreenRecord();
  updateCustomScreen.mockImplementation(
    async (_id, payload) => ({ ...currentScreenRecord, ...payload }) as CustomScreenRecord
  );
  window.history.replaceState({}, "", "/admin/advanced/custom-screens/screen-1");
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

// --- detectScreenBindingOrphans (pure) ------------------------------------

const doc = (blockIds: string[]): ScreenDocumentV1 => ({
  schemaVersion: 1,
  sections: [
    {
      id: "s1",
      type: "section",
      data: {},
      blocks: blockIds.map((id) => ({ id, type: "field", data: {} })),
    },
  ],
});

const binding = (id: string, blockId: string, field: string): ScreenFieldBinding => ({
  id,
  blockId,
  propPath: "value",
  source: "entry",
  field,
  mode: "read",
});

test("detectScreenBindingOrphans flags block- and field-orphans, preserving valid order", () => {
  const document = doc(["live-1", "live-2"]);
  const bindings = [
    binding("b1", "live-1", "title"), // valid
    binding("b2", "dead-block", "title"), // block-orphan
    binding("b3", "live-2", "bathrooms"), // field-orphan (not on the type)
    binding("b4", "live-1", "slug"), // valid (system root)
  ];
  const result = detectScreenBindingOrphans(document, bindings, [{ name: "title" }]);
  expect(result.blockOrphans.map((b) => b.id)).toEqual(["b2"]);
  expect(result.fieldOrphans.map((b) => b.id)).toEqual(["b3"]);
});

test("detectScreenBindingOrphans: a schemaless content type (fields=[]) yields ZERO field-orphans", () => {
  // Server allow-all parity: no schema properties → any field root is legal, so
  // the one-click prune must NOT destroy valid entry bindings.
  const document = doc(["live-1"]);
  const bindings = [binding("b1", "live-1", "anything")];
  const result = detectScreenBindingOrphans(document, bindings, []);
  expect(result.fieldOrphans).toEqual([]);
  expect(result.blockOrphans).toEqual([]);
});

// --- Item A: section inspector host wiring --------------------------------

test("selecting a section opens the section inspector and its gap write round-trips into section.style", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1");
  try {
    await flush();

    // Inspect is block-gated on load; selecting a section reaches the section
    // inspector (Item A widened the gate + forces `inspect`).
    selectSection(view.container, "section-1");
    await flush();
    expect(view.container.querySelector("[data-screen-section-layout-group]")).not.toBeNull();

    const gap = view.container.querySelector<HTMLInputElement>("[data-screen-section-gap]")!;
    setInputValue(gap, "24");
    await flush();

    click(saveButton(view.container));
    await flush();

    expect(updateCustomScreen).toHaveBeenCalledTimes(1);
    const payload = updateCustomScreen.mock.calls[0]?.[1] as {
      definition: { editorView: { document: ScreenDocumentV1 } };
    };
    expect(payload.definition.editorView.document.sections[0]?.style).toEqual({ columnGap: 24 });
  } finally {
    view.cleanup();
  }
});

// --- Item B: binding recovery ---------------------------------------------

test("a field-orphan shows the amber notice naming the deleted field; the one-click prune clears it and Save succeeds", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1");
  try {
    await flush();

    const notice = () => view.container.querySelector("[data-screen-orphan-notice]");
    expect(notice()).not.toBeNull();
    expect(notice()?.textContent).toContain("bathrooms");

    click(view.container.querySelector("[data-screen-remove-orphans]"));
    await flush();

    // The notice clears (orphan pruned client-side) ...
    expect(view.container.querySelector("[data-screen-orphan-notice]")).toBeNull();

    // ... and Save persists the pruned binding set (no opaque 400).
    click(saveButton(view.container));
    await flush();
    expect(updateCustomScreen).toHaveBeenCalledTimes(1);
    const payload = updateCustomScreen.mock.calls[0]?.[1] as {
      definition: { editorView: { bindings: unknown[] } };
    };
    expect(payload.definition.editorView.bindings).toEqual([]);
  } finally {
    view.cleanup();
  }
});

test("a returned record carrying a binding_field_removed warning shows the post-save pruned-field notice", async () => {
  updateCustomScreen.mockImplementationOnce(
    async (_id, payload) =>
      ({
        ...currentScreenRecord,
        ...payload,
        warnings: [{ code: "binding_field_removed", fields: ["sqft"] }],
      }) as CustomScreenRecord
  );
  const view = mount("/admin/advanced/custom-screens/screen-1");
  try {
    await flush();
    // Prune the pre-existing orphan first so Save is reachable via the button.
    click(view.container.querySelector("[data-screen-remove-orphans]"));
    await flush();

    click(saveButton(view.container));
    await flush();

    const saveNotice = view.container.querySelector("[data-screen-save-notice]");
    expect(saveNotice).not.toBeNull();
    expect(saveNotice?.textContent).toContain("sqft");
  } finally {
    view.cleanup();
  }
});

test("a record with no warnings shows NO post-save notice", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1");
  try {
    await flush();
    click(view.container.querySelector("[data-screen-remove-orphans]"));
    await flush();
    click(saveButton(view.container));
    await flush();
    expect(view.container.querySelector("[data-screen-save-notice]")).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("a residual malformed-binding 400 shows the static message plus the detail field name(s)", async () => {
  updateCustomScreen.mockRejectedValueOnce(
    new ApiClientError(
      "custom_screen_definition_invalid",
      "Custom screen definition is invalid",
      400,
      { fields: ["bathrooms"] }
    )
  );
  const view = mount("/admin/advanced/custom-screens/screen-1");
  try {
    await flush();
    click(view.container.querySelector("[data-screen-remove-orphans]"));
    await flush();
    click(saveButton(view.container));
    await flush();

    const errorText = view.container.textContent ?? "";
    expect(errorText).toContain("Custom screen definition is invalid");
    expect(errorText).toContain("bathrooms");
  } finally {
    view.cleanup();
  }
});
