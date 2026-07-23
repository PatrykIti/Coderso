// @vitest-environment happy-dom

// TASK-500-01: sections first-class + palette unification (shape LOCKED by
// TASK-500-05 §2). "Add section" CREATES a section (not the command palette);
// section select STEERS insertion; select/rename/reorder/delete chrome; the
// visible chip grid stays at the prototype's EXACTLY 9 chips while the command
// palette exposes the FULL canonical kind set + "Add section" with NO FIELDS group.

import React from "react";

import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { CustomScreenRecord } from "../../../core/admin/services/customScreensClient";
import { CustomScreenEditorPage } from "../../../core/admin/ui/custom-screens/CustomScreenEditorPage";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

const contentType = {
  id: "type-1",
  name: "Projects",
  slug: "projects",
  status: "published" as const,
  schema: {
    type: "object" as const,
    additionalProperties: false as const,
    properties: {
      title: {
        type: "string" as const,
        title: "Title",
        xFieldType: "text",
      },
    },
  },
  createdAt: "2026-05-02T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
};

const createScreenRecord = (): CustomScreenRecord => ({
  id: "screen-1",
  name: "Project Screen",
  contentTypeId: "type-1",
  status: "active" as const,
  collectionRole: null,
  compositionKey: null,
  showInSidebar: true,
  sidebarLabel: "Projects",
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
                id: "heading-1",
                type: "heading",
                data: { label: "Heading", text: "Hello", level: 2, align: "left" },
              },
            ],
          },
          {
            id: "section-2",
            type: "section",
            label: "Meta",
            data: { title: "Meta" },
            blocks: [
              {
                id: "field-1",
                type: "field",
                data: { label: "Title", helper: "", display: "stacked", field: "title" },
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
          field: "title",
          mode: "readwrite" as const,
        },
      ],
    },
  },
  blocks: [],
  bindings: [],
  createdAt: "2026-05-02T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
});

let currentScreenRecord = createScreenRecord();

const updateCustomScreen = vi.fn(
  async (_id: string, payload: Record<string, unknown>) =>
    ({ ...currentScreenRecord, ...payload }) as CustomScreenRecord
);

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

const findButtonByText = (container: ParentNode, scope: string, text: string) =>
  Array.from(container.querySelectorAll<HTMLButtonElement>(`${scope} button`)).find(
    (button) => button.textContent?.trim() === text
  ) ?? null;

const sectionIds = (container: ParentNode) =>
  Array.from(container.querySelectorAll("[data-screen-section-id]")).map((section) =>
    section.getAttribute("data-screen-section-id")
  );

const selectSection = (container: ParentNode, sectionId: string) => {
  click(container.querySelector(`[data-screen-section-id="${sectionId}"]`));
};

beforeEach(() => {
  currentScreenRecord = createScreenRecord();
  window.history.replaceState({}, "", "/admin/advanced/custom-screens/screen-1");
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test("'Add section' creates a real, selected top-level section and does NOT open the command palette", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1");

  try {
    await flush();
    expect(sectionIds(view.container)).toEqual(["section-1", "section-2"]);

    click(view.container.querySelector("[data-screen-add-section]"));
    await flush();

    // Regression guard for the old setCommandOpen(true) behaviour: a section is
    // CREATED and the command palette does NOT open.
    const ids = sectionIds(view.container);
    expect(ids).toHaveLength(3);
    // The palette dialog portals to document.body — assert it did NOT open.
    expect(document.querySelector("[data-authoring-command-palette]")).toBeNull();

    // The new section is inserted AFTER the selected one (section-1 on load) and
    // becomes the selected target.
    const newId = ids[1];
    expect(newId).not.toBe("section-1");
    expect(newId).not.toBe("section-2");
    expect(
      view.container
        .querySelector(`[data-screen-section-id="${newId}"]`)
        ?.getAttribute("data-selected")
    ).toBe("true");
  } finally {
    view.cleanup();
  }
});

test("a new block lands in the SELECTED section, not sections[0] (steering path)", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1");

  try {
    await flush();

    // Fresh path: select the 2nd section (no container selected — the section
    // click clears the block selection), then add a chip block. This exercises
    // appendScreenBlockToSection consulting selectedSectionId and would fail on
    // the old sections[0]-only default regardless of any block-clear.
    selectSection(view.container, "section-2");
    await flush();

    // TASK-505-03 (Item A): a canvas section-select now switches the rail to the
    // section Inspector, so reopen the Insert palette before the chip insert.
    // Steering itself is unchanged — the block still lands in the SELECTED
    // section (selectedSectionId persists across the panel switch).
    click(view.container.querySelector('button[aria-label="Insert"]'));
    await flush();

    click(findButtonByText(view.container, "[data-screen-block-library]", "Heading"));
    await flush();

    const sectionOne = view.container.querySelector('[data-screen-section-id="section-1"]');
    const sectionTwo = view.container.querySelector('[data-screen-section-id="section-2"]');
    expect(sectionOne?.querySelectorAll("[data-screen-block-id]")).toHaveLength(1);
    expect(sectionTwo?.querySelectorAll("[data-screen-block-id]")).toHaveLength(2);
    expect(sectionTwo?.querySelectorAll('[data-screen-block-type="heading"]')).toHaveLength(1);
  } finally {
    view.cleanup();
  }
});

test("selecting a section clears the block selection (invariant)", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1");

  try {
    await flush();

    // On load the first block (heading-1) is selected — the rail head targets it.
    const railHead = () => view.container.querySelector("[data-screen-rail-head]");
    expect(railHead()?.textContent).toContain("heading");

    selectSection(view.container, "section-2");
    await flush();

    // The rail head falls back to the doc-level target — no block is selected.
    // NOTE: this invariant ALSO holds with the bare setSelectedSectionId setter,
    // because the canvas selectTarget section branch already calls
    // onSelectBlock(null) before onSelectSection — this guards the block-clear
    // invariant, it does NOT distinguish the two setter implementations.
    expect(railHead()?.textContent).toContain("Entry view");
    expect(
      view.container
        .querySelector('[data-screen-block-id="heading-1"]')
        ?.getAttribute("data-selected")
    ).toBe("false");
  } finally {
    view.cleanup();
  }
});

test("selected-section chrome renames (label + title), reorders with boundary no-op, and deletes with binding pruning", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1");

  try {
    await flush();

    // Unselected sections render the plain uppercase title (look parity).
    expect(view.container.querySelector("[data-screen-section-rename]")).toBeNull();

    selectSection(view.container, "section-1");
    await flush();

    const rename = view.container.querySelector<HTMLInputElement>("[data-screen-section-rename]");
    expect(rename).not.toBeNull();
    expect(rename?.value).toBe("Details");
    expect(view.container.querySelector("[data-screen-section-move-up]")).not.toBeNull();
    expect(view.container.querySelector("[data-screen-section-move-down]")).not.toBeNull();
    expect(view.container.querySelector("[data-screen-section-delete]")).not.toBeNull();

    // Rename commits on Enter and updates the rendered title.
    React.act(() => {
      rename!.value = "Overview";
      rename!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
      );
    });
    await flush();
    expect(
      view.container.querySelector<HTMLInputElement>("[data-screen-section-rename]")?.value
    ).toBe("Overview");

    // Move up on the FIRST section is a boundary no-op.
    click(view.container.querySelector("[data-screen-section-move-up]"));
    await flush();
    expect(sectionIds(view.container)).toEqual(["section-1", "section-2"]);

    // Move down swaps the two sections.
    click(view.container.querySelector("[data-screen-section-move-down]"));
    await flush();
    expect(sectionIds(view.container)).toEqual(["section-2", "section-1"]);

    // Delete section-2 (it owns field-1 + its binding) → the section is gone and
    // the host pruned the binding (asserted via the save payload).
    selectSection(view.container, "section-2");
    await flush();
    click(view.container.querySelector("[data-screen-section-delete]"));
    await flush();
    expect(sectionIds(view.container)).toEqual(["section-1"]);

    const saveButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Save"
    );
    click(saveButton ?? null);
    await flush();
    expect(updateCustomScreen).toHaveBeenCalledTimes(1);
    const payload = updateCustomScreen.mock.calls[0]?.[1] as {
      definition: { editorView: { bindings: unknown[] } };
    };
    expect(payload.definition.editorView.bindings).toEqual([]);

    // LAST-SECTION rule: deleting the only remaining section is a NO-OP.
    selectSection(view.container, "section-1");
    await flush();
    click(view.container.querySelector("[data-screen-section-delete]"));
    await flush();
    expect(sectionIds(view.container)).toEqual(["section-1"]);
  } finally {
    view.cleanup();
  }
});

test("rename input survives real-input keys: Space is preserved and Enter commits without re-selecting", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1");

  try {
    await flush();
    selectSection(view.container, "section-1");
    await flush();

    const rename = view.container.querySelector<HTMLInputElement>("[data-screen-section-rename]")!;
    rename.value = "";

    // Per-character keyDown (NOT a single synthetic change): mimic the browser —
    // a character is only inserted when the keydown was NOT defaultPrevented. The
    // parent <section> onKeyDown preventDefault()s " " (and re-selects on Enter),
    // so without the input-level stopPropagation the space would be SWALLOWED.
    const type = (text: string) => {
      for (const char of text) {
        let prevented = true;
        React.act(() => {
          const event = new KeyboardEvent("keydown", {
            key: char,
            bubbles: true,
            cancelable: true,
          });
          rename.dispatchEvent(event);
          prevented = event.defaultPrevented;
        });
        if (!prevented) rename.value += char;
      }
    };

    type("My Section");
    // The space keydown was not swallowed by the section handler's preventDefault.
    expect(rename.value).toBe("My Section");

    // Enter COMMITS the rename (onRenameSection fires with the typed value) —
    // not merely a synthetic blur.
    React.act(() => {
      rename.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
      );
    });
    await flush();

    expect(
      view.container.querySelector<HTMLInputElement>("[data-screen-section-rename]")?.value
    ).toBe("My Section");
    // The section stays the active target (Enter did not clear/steal selection).
    expect(
      view.container
        .querySelector('[data-screen-section-id="section-1"]')
        ?.getAttribute("data-selected")
    ).toBe("true");
  } finally {
    view.cleanup();
  }
});

test("empty-document canvas: 'Add section' on a brand-new screen renders a visible, selectable section frame with chrome", async () => {
  // TASK-500 post-audit: a NEW screen normalizes to ZERO sections; the old
  // hasBlocks early return replaced even freshly created empty sections with
  // the generic empty message, so 'Add section' produced no visible change.
  window.history.replaceState({}, "", "/admin/advanced/custom-screens/new");
  const view = mount("/admin/advanced/custom-screens/new");

  try {
    await flush();
    expect(sectionIds(view.container)).toEqual([]);

    click(view.container.querySelector("[data-screen-add-section]"));
    await flush();

    // The empty section is VISIBLE on the canvas, selected, and carries the
    // full rename/move/delete chrome + its section-end drop zone.
    const ids = sectionIds(view.container);
    expect(ids).toHaveLength(1);
    const section = () => view.container.querySelector(`[data-screen-section-id="${ids[0]}"]`);
    expect(section()?.getAttribute("data-selected")).toBe("true");
    expect(section()?.querySelector("[data-screen-section-rename]")).not.toBeNull();
    expect(section()?.querySelector("[data-screen-section-move-up]")).not.toBeNull();
    expect(section()?.querySelector("[data-screen-section-move-down]")).not.toBeNull();
    expect(section()?.querySelector("[data-screen-section-delete]")).not.toBeNull();
    expect(
      view.container.querySelector(`[data-screen-section-dropzone="${ids[0]}"]`)
    ).not.toBeNull();

    // 'Add section' again inserts a SECOND visible frame (repeat clicks are not
    // swallowed) ...
    click(view.container.querySelector("[data-screen-add-section]"));
    await flush();
    expect(sectionIds(view.container)).toHaveLength(2);

    // ... the frames stay selectable on the canvas ...
    selectSection(view.container, ids[0]!);
    await flush();
    expect(section()?.getAttribute("data-selected")).toBe("true");

    // TASK-505-03 (Item A): the canvas section-select switched the rail to the
    // section Inspector — reopen the Insert palette before the chip insert.
    click(view.container.querySelector('button[aria-label="Insert"]'));
    await flush();

    // ... and a chip insert steers INTO the selected empty section.
    click(findButtonByText(view.container, "[data-screen-block-library]", "Heading"));
    await flush();
    expect(section()?.querySelectorAll('[data-screen-block-type="heading"]')).toHaveLength(1);
  } finally {
    view.cleanup();
  }
});

test("rename focus+blur without edits and a boundary move keep the save state CLEAN; a real rename still dirties", async () => {
  // TASK-500 post-audit: the rename input commits on EVERY blur — without a
  // host-side no-op an untouched focus+blur set hasUnsavedChanges, showing the
  // unsaved chip and suppressing remote refresh ('Updated in another tab').
  const view = mount("/admin/advanced/custom-screens/screen-1");

  const unsavedChip = () =>
    Array.from(view.container.querySelectorAll("span")).find(
      (element) => element.textContent?.trim() === "Unsaved changes"
    ) ?? null;

  try {
    await flush();
    selectSection(view.container, "section-1");
    await flush();
    expect(unsavedChip()).toBeNull();

    // Blur-commit with the UNCHANGED value — must NOT mark the document dirty.
    const rename = view.container.querySelector<HTMLInputElement>("[data-screen-section-rename]")!;
    expect(rename.value).toBe("Details");
    React.act(() => {
      rename.dispatchEvent(new Event("focusout", { bubbles: true }));
    });
    await flush();
    expect(unsavedChip()).toBeNull();

    // Boundary move (first section up) is a document no-op — also stays clean.
    click(view.container.querySelector("[data-screen-section-move-up]"));
    await flush();
    expect(sectionIds(view.container)).toEqual(["section-1", "section-2"]);
    expect(unsavedChip()).toBeNull();

    // Guard against over-suppression: a REAL rename still marks dirty.
    React.act(() => {
      rename.value = "Overview";
      rename.dispatchEvent(new Event("focusout", { bubbles: true }));
    });
    await flush();
    expect(
      view.container.querySelector<HTMLInputElement>("[data-screen-section-rename]")?.value
    ).toBe("Overview");
    expect(unsavedChip()).not.toBeNull();
  } finally {
    view.cleanup();
  }
});

test("the visible chip grid stays at EXACTLY the prototype's 9 chips (not grown to 13)", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1");

  try {
    await flush();

    const chips = Array.from(
      view.container.querySelectorAll<HTMLButtonElement>("[data-screen-block-library] .grid button")
    ).map((button) => button.textContent?.trim());
    expect(chips).toEqual([
      "Heading",
      "Text",
      "Field",
      "Stat",
      "Divider",
      "Image",
      "Related list",
      "Tabs",
      "Button",
    ]);
  } finally {
    view.cleanup();
  }
});

test("the command palette exposes the FULL canonical kind set + 'Add section' with NO FIELDS group; field-group/columns stay creatable", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1");

  try {
    await flush();

    // Deselect the initially selected block so the rail head shows the command
    // Search affordance, then open the palette.
    selectSection(view.container, "section-1");
    await flush();
    click(view.container.querySelector('button[aria-label="Open command palette"]'));
    await flush();

    // The palette dialog portals to document.body.
    const palette = document.querySelector("[data-authoring-command-palette]");
    expect(palette).not.toBeNull();
    const text = palette?.textContent ?? "";
    // Full canonical set = the 9 chips PLUS the container/composite kinds.
    for (const label of [
      "Heading",
      "Text",
      "Field",
      "Stat",
      "Divider",
      "Image",
      "Related list",
      "Tabs",
      "Button",
      "Record header",
      "Field group",
      "Two columns",
      "Help text",
      "Add section",
    ]) {
      expect(text).toContain(label);
    }
    // NO FIELDS group / per-field commands (field = Field chip + inspector bind).
    expect(text).not.toContain("Fields");
    expect(text).not.toContain("title · text");

    // field-group stays creatable via the palette (500-02's nesting target).
    const fieldGroupCommand =
      Array.from(
        document.querySelectorAll<HTMLButtonElement>("[data-authoring-command-palette] button")
      ).find((button) => button.textContent?.startsWith("Field group")) ?? null;
    click(fieldGroupCommand);
    await flush();
    expect(
      view.container.querySelectorAll(
        '[data-screen-authoring-canvas] [data-screen-block-type="field-group"]'
      )
    ).toHaveLength(1);
  } finally {
    view.cleanup();
  }
});
