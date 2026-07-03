// @vitest-environment happy-dom

// TASK-500-02: insertion targeting + interactivity (shape LOCKED by TASK-500-05
// §2). A palette insert lands in the SELECTED section (not sections[0]);
// arming a before/after gap targets the right index; a slot drop zone at depth
// targets the right {parentId, slotId}; native DnD reorders within a list and
// moves across sections + into slots (same block id — a MOVE); the cycle-guard
// drop is a no-op; selection + selectedSectionId FOLLOW the inserted/moved block.

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

// section-1: [heading-1, text-1]; section-2: [field-1, group-1(field-group
// content: [columns-1(columns, left: [], right: [])])] — columns-1 nests at
// depth 2 so slot targeting exercises an arbitrary-depth container.
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
              {
                id: "text-1",
                type: "text",
                data: { label: "Text", content: "Body", tone: "default" },
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
              {
                id: "group-1",
                type: "field-group",
                data: { title: "Group", description: "" },
                slots: {
                  content: [
                    {
                      id: "columns-1",
                      type: "columns",
                      data: { label: "Columns", columns: 2 },
                      slots: { left: [], right: [] },
                    },
                  ],
                },
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

vi.mock("@/services/customScreensClient", () => ({
  createCustomScreen: vi.fn(),
  updateCustomScreen: vi.fn(async (_id: string, payload: Record<string, unknown>) => ({
    ...currentScreenRecord,
    ...payload,
  })),
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

const findChip = (container: ParentNode, text: string) =>
  Array.from(
    container.querySelectorAll<HTMLButtonElement>("[data-screen-block-library] button")
  ).find((button) => button.textContent?.trim() === text) ?? null;

const selectSection = (container: ParentNode, sectionId: string) => {
  click(container.querySelector(`[data-screen-section-id="${sectionId}"]`));
};

const sectionBlockIds = (container: ParentNode, sectionId: string) =>
  Array.from(
    container.querySelectorAll(
      `[data-screen-section-id="${sectionId}"] > div[data-screen-section-dropzone] > [data-screen-block-id]`
    )
  ).map((block) => block.getAttribute("data-screen-block-id"));

// Native-DnD helpers: a shared dataTransfer stub is attached to plain bubbling
// events (React reads `nativeEvent.dataTransfer`), mirroring real drag payloads.
const makeDataTransfer = () => {
  const store: Record<string, string> = {};
  return {
    setData: (key: string, value: string) => {
      store[key] = value;
    },
    getData: (key: string) => store[key] ?? "",
    effectAllowed: "",
    dropEffect: "",
  };
};

const fireDnd = (
  element: Element | null,
  type: string,
  dataTransfer: unknown,
  init?: Record<string, unknown>
) => {
  React.act(() => {
    if (!element) return;
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
    if (init) {
      for (const [key, value] of Object.entries(init)) {
        Object.defineProperty(event, key, { value });
      }
    }
    element.dispatchEvent(event);
  });
};

beforeEach(() => {
  currentScreenRecord = createScreenRecord();
  window.history.replaceState({}, "", "/admin/advanced/custom-screens/screen-1");
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test("a palette insert lands in the SELECTED (non-first) section and selection follows", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1");

  try {
    await flush();
    selectSection(view.container, "section-2");
    await flush();

    // TASK-505-03 (Item A): a canvas section-select now switches the rail to the
    // section Inspector — reopen the Insert palette before the chip insert. The
    // steering (block lands in the SELECTED section) is unchanged.
    click(view.container.querySelector('button[aria-label="Insert"]'));
    await flush();

    click(findChip(view.container, "Text"));
    await flush();

    expect(sectionBlockIds(view.container, "section-1")).toEqual(["heading-1", "text-1"]);
    const metaIds = sectionBlockIds(view.container, "section-2");
    expect(metaIds).toHaveLength(3);
    const newId = metaIds[2]!;
    expect(newId).not.toBeNull();

    // Selection + selectedSectionId FOLLOW the inserted block.
    const newBlock = view.container.querySelector(`[data-screen-block-id="${newId}"]`);
    expect(newBlock?.getAttribute("data-selected")).toBe("true");
    expect(
      view.container
        .querySelector('[data-screen-section-id="section-2"]')
        ?.getAttribute("data-selected")
    ).toBe("true");
  } finally {
    view.cleanup();
  }
});

test("arming a before/after gap inserts at the right index in the right list (one-shot)", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1");

  try {
    await flush();

    // Arm the gap BEFORE heading-1 (section-1, pre-insert index 0).
    const gap = view.container.querySelector(
      '[data-screen-insert-gap][data-insert-section="section-1"][data-insert-index="0"]'
    );
    expect(gap).not.toBeNull();
    click(gap);
    await flush();
    expect(
      view.container
        .querySelector(
          '[data-screen-insert-gap][data-insert-section="section-1"][data-insert-index="0"]'
        )
        ?.getAttribute("data-armed")
    ).toBe("true");

    click(findChip(view.container, "Heading"));
    await flush();

    const ids = sectionBlockIds(view.container, "section-1");
    expect(ids).toHaveLength(3);
    expect(ids[1]).toBe("heading-1"); // the new block spliced in BEFORE heading-1
    expect(ids[2]).toBe("text-1");
    expect(
      view.container
        .querySelector(`[data-screen-block-id="${ids[0]}"]`)
        ?.getAttribute("data-selected")
    ).toBe("true");

    // The point is ONE-SHOT: the next insert falls back to the selected
    // section's end (section-1 follows the inserted block).
    click(findChip(view.container, "Text"));
    await flush();
    const afterSecond = sectionBlockIds(view.container, "section-1");
    expect(afterSecond).toHaveLength(4);
    expect(afterSecond[1]).toBe("heading-1"); // NOT spliced at index 0 again
  } finally {
    view.cleanup();
  }
});

test("a slot drop zone at depth targets the right {parentId, slotId}", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1");

  try {
    await flush();

    // columns-1 sits inside group-1.content — its empty `left` slot renders an
    // armable labeled drop zone in builder mode.
    const dropZone = view.container.querySelector(
      '[data-screen-slot-dropzone="left"][data-insert-parent="columns-1"]'
    );
    expect(dropZone).not.toBeNull();
    click(dropZone);
    await flush();
    expect(
      view.container
        .querySelector('[data-screen-slot-dropzone="left"][data-insert-parent="columns-1"]')
        ?.getAttribute("data-armed")
    ).toBe("true");

    click(findChip(view.container, "Text"));
    await flush();

    const inserted = view.container.querySelector(
      '[data-screen-block-id="columns-1"] [data-screen-runtime-slot="left"] [data-screen-block-type="text"]'
    );
    expect(inserted).not.toBeNull();
    expect(inserted?.getAttribute("data-selected")).toBe("true");
    expect(
      view.container
        .querySelector('[data-screen-section-id="section-2"]')
        ?.getAttribute("data-selected")
    ).toBe("true");
  } finally {
    view.cleanup();
  }
});

test("native DnD reorders within a list against the PRE-removal index (downward move lands 1:1)", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1");

  try {
    await flush();
    expect(sectionBlockIds(view.container, "section-1")).toEqual(["heading-1", "text-1"]);

    const dataTransfer = makeDataTransfer();
    fireDnd(
      view.container.querySelector('[data-screen-drag-handle="heading-1"]'),
      "dragstart",
      dataTransfer
    );
    // Downward move: the gap AFTER text-1 is pre-removal index 2 — the op owns
    // the removal-first decrement, the canvas does NOT pre-subtract.
    fireDnd(
      view.container.querySelector(
        '[data-screen-insert-gap][data-insert-section="section-1"][data-insert-index="2"]'
      ),
      "drop",
      dataTransfer
    );
    await flush();

    expect(sectionBlockIds(view.container, "section-1")).toEqual(["text-1", "heading-1"]);
    expect(
      view.container
        .querySelector('[data-screen-block-id="heading-1"]')
        ?.getAttribute("data-selected")
    ).toBe("true");
  } finally {
    view.cleanup();
  }
});

test("native DnD moves a block ACROSS sections and INTO a nested slot with the SAME id", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1");

  try {
    await flush();

    // Cross-section: heading-1 (section-1) → the gap before field-1 (section-2).
    const crossTransfer = makeDataTransfer();
    fireDnd(
      view.container.querySelector('[data-screen-drag-handle="heading-1"]'),
      "dragstart",
      crossTransfer
    );
    fireDnd(
      view.container.querySelector(
        '[data-screen-insert-gap][data-insert-section="section-2"][data-insert-index="0"]'
      ),
      "drop",
      crossTransfer
    );
    await flush();

    expect(sectionBlockIds(view.container, "section-1")).toEqual(["text-1"]);
    expect(sectionBlockIds(view.container, "section-2")).toEqual([
      "heading-1",
      "field-1",
      "group-1",
    ]);
    // Selection + section follow the moved block (same id — a move, not a clone).
    expect(
      view.container
        .querySelector('[data-screen-block-id="heading-1"]')
        ?.getAttribute("data-selected")
    ).toBe("true");
    expect(
      view.container
        .querySelector('[data-screen-section-id="section-2"]')
        ?.getAttribute("data-selected")
    ).toBe("true");

    // Into a nested slot at depth: text-1 → columns-1.left drop zone.
    const slotTransfer = makeDataTransfer();
    fireDnd(
      view.container.querySelector('[data-screen-drag-handle="text-1"]'),
      "dragstart",
      slotTransfer
    );
    fireDnd(
      view.container.querySelector(
        '[data-screen-slot-dropzone="left"][data-insert-parent="columns-1"]'
      ),
      "drop",
      slotTransfer
    );
    await flush();

    expect(sectionBlockIds(view.container, "section-1")).toEqual([]);
    const moved = view.container.querySelector(
      '[data-screen-block-id="columns-1"] [data-screen-runtime-slot="left"] [data-screen-block-id="text-1"]'
    );
    expect(moved).not.toBeNull();
    expect(moved?.getAttribute("data-selected")).toBe("true");
  } finally {
    view.cleanup();
  }
});

test("during a native drag the gaps force-reveal and the hovered zone highlights (no CSS :hover dependence)", async () => {
  // TASK-500 post-audit: browsers do NOT apply `:hover` while a native HTML5
  // drag is in flight, so the drop-position feedback must be state-driven —
  // dragover claims the highlight, dragleave releases it, dragend hides all.
  const view = mount("/admin/advanced/custom-screens/screen-1");

  const gap = (index: number) =>
    view.container.querySelector(
      `[data-screen-insert-gap][data-insert-section="section-1"][data-insert-index="${index}"]`
    );

  try {
    await flush();
    // Idle: gaps are hidden behind :hover.
    expect(gap(0)?.className).toContain("opacity-0");

    const dataTransfer = makeDataTransfer();
    fireDnd(
      view.container.querySelector('[data-screen-drag-handle="heading-1"]'),
      "dragstart",
      dataTransfer
    );

    // In flight: EVERY gap force-reveals (opacity-0 branch is off)...
    expect(gap(0)?.className).not.toContain("opacity-0");
    expect(gap(2)?.className).not.toContain("opacity-0");

    // ...dragover on a gap claims the full highlight...
    fireDnd(gap(2), "dragover", dataTransfer);
    expect(gap(2)?.getAttribute("data-drag-hover")).toBe("true");
    expect(gap(0)?.getAttribute("data-drag-hover")).toBeNull();

    // ...dragover on a CARD BODY resolves to the adjacent gap by midpoint
    // (top half of text-1 → the gap BEFORE it, index 1) and releases the old zone...
    fireDnd(
      view.container.querySelector('[data-screen-block-id="text-1"]'),
      "dragover",
      dataTransfer,
      { clientY: -1 }
    );
    expect(gap(1)?.getAttribute("data-drag-hover")).toBe("true");
    expect(gap(2)?.getAttribute("data-drag-hover")).toBeNull();

    // ...dragleave releases the highlight it owns...
    fireDnd(gap(1), "dragover", dataTransfer);
    expect(gap(1)?.getAttribute("data-drag-hover")).toBe("true");
    fireDnd(gap(1), "dragleave", dataTransfer);
    expect(gap(1)?.getAttribute("data-drag-hover")).toBeNull();

    // ...and dragend hides the gaps again.
    fireDnd(
      view.container.querySelector('[data-screen-drag-handle="heading-1"]'),
      "dragend",
      dataTransfer
    );
    expect(gap(0)?.className).toContain("opacity-0");
  } finally {
    view.cleanup();
  }
});

test("a drop ON a block card resolves before/after by vertical midpoint instead of appending to the section end", async () => {
  // TASK-500 post-audit: the card body is the most natural drop target — it
  // must map to the before/after index of THAT card, not silently bubble to
  // the section-end dropzone.
  const view = mount("/admin/advanced/custom-screens/screen-1");

  try {
    await flush();
    expect(sectionBlockIds(view.container, "section-1")).toEqual(["heading-1", "text-1"]);

    // Top half of heading-1 → BEFORE it (a section-end fallthrough would have
    // left the order unchanged, so this discriminates the fix).
    const first = makeDataTransfer();
    fireDnd(view.container.querySelector('[data-screen-drag-handle="text-1"]'), "dragstart", first);
    fireDnd(view.container.querySelector('[data-screen-block-id="heading-1"]'), "drop", first, {
      clientY: -1,
    });
    await flush();
    expect(sectionBlockIds(view.container, "section-1")).toEqual(["text-1", "heading-1"]);

    // Bottom half of heading-1 → AFTER it.
    const second = makeDataTransfer();
    fireDnd(
      view.container.querySelector('[data-screen-drag-handle="text-1"]'),
      "dragstart",
      second
    );
    fireDnd(view.container.querySelector('[data-screen-block-id="heading-1"]'), "drop", second, {
      clientY: 1,
    });
    await flush();
    expect(sectionBlockIds(view.container, "section-1")).toEqual(["heading-1", "text-1"]);
  } finally {
    view.cleanup();
  }
});

test("the cycle-guard drop (container onto its own descendant slot) is a no-op; dragging suppresses inner zones", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1");

  try {
    await flush();

    // Direct guard: a drop carrying group-1 onto a slot INSIDE group-1's own
    // subtree (columns-1.left) must not change the tree.
    const dataTransfer = makeDataTransfer();
    dataTransfer.setData("text/plain", "group-1");
    fireDnd(
      view.container.querySelector(
        '[data-screen-slot-dropzone="left"][data-insert-parent="columns-1"]'
      ),
      "drop",
      dataTransfer
    );
    await flush();

    expect(sectionBlockIds(view.container, "section-2")).toEqual(["field-1", "group-1"]);
    expect(
      view.container.querySelector(
        '[data-screen-block-id="group-1"] [data-screen-block-id="columns-1"]'
      )
    ).not.toBeNull();

    // Visual reinforcement: while group-1 is being dragged its OWN inner drop
    // zones are suppressed (the op-level guard stays the real gate).
    const dragTransfer = makeDataTransfer();
    fireDnd(
      view.container.querySelector('[data-screen-drag-handle="group-1"]'),
      "dragstart",
      dragTransfer
    );
    expect(
      view.container.querySelector(
        '[data-screen-slot-dropzone="left"][data-insert-parent="columns-1"]'
      )
    ).toBeNull();
    fireDnd(
      view.container.querySelector('[data-screen-drag-handle="group-1"]'),
      "dragend",
      dragTransfer
    );
    expect(
      view.container.querySelector(
        '[data-screen-slot-dropzone="left"][data-insert-parent="columns-1"]'
      )
    ).not.toBeNull();
  } finally {
    view.cleanup();
  }
});

test("TASK-503-02 D: a container drags by ITS badge; a nested child drags by its own badge (non-shadowing)", async () => {
  // The drag source moved onto the corner type Badge, so a container is no
  // longer shadowed by nested draggable children on its card surface: group-1
  // reorders when grabbed by its OWN badge, and grabbing the nested columns-1
  // by ITS badge moves only the child while group-1 stays put.
  const view = mount("/admin/advanced/custom-screens/screen-1");

  try {
    await flush();
    expect(sectionBlockIds(view.container, "section-2")).toEqual(["field-1", "group-1"]);

    // Drag the group-1 CONTAINER by its corner badge → drop on field-1's top
    // half → group-1 lands BEFORE field-1 (the container's own badge is the sole
    // drag source; the nested columns-1 on its surface cannot hijack it).
    const containerTransfer = makeDataTransfer();
    fireDnd(
      view.container.querySelector('[data-screen-drag-handle="group-1"]'),
      "dragstart",
      containerTransfer
    );
    fireDnd(
      view.container.querySelector('[data-screen-block-id="field-1"]'),
      "drop",
      containerTransfer,
      {
        clientY: -1,
      }
    );
    await flush();
    expect(sectionBlockIds(view.container, "section-2")).toEqual(["group-1", "field-1"]);
    // columns-1 rode along inside its still-intact container.
    expect(
      view.container.querySelector(
        '[data-screen-block-id="group-1"] [data-screen-block-id="columns-1"]'
      )
    ).not.toBeNull();

    // Now grab the NESTED columns-1 by ITS OWN badge → drop on field-1's top
    // half → only columns-1 moves out to the section top level; group-1 stays.
    const childTransfer = makeDataTransfer();
    fireDnd(
      view.container.querySelector('[data-screen-drag-handle="columns-1"]'),
      "dragstart",
      childTransfer
    );
    fireDnd(
      view.container.querySelector('[data-screen-block-id="field-1"]'),
      "drop",
      childTransfer,
      {
        clientY: -1,
      }
    );
    await flush();
    expect(sectionBlockIds(view.container, "section-2")).toEqual([
      "group-1",
      "columns-1",
      "field-1",
    ]);
    // group-1 survived; it just no longer nests columns-1.
    expect(view.container.querySelector('[data-screen-block-id="group-1"]')).not.toBeNull();
    expect(
      view.container.querySelector(
        '[data-screen-block-id="group-1"] [data-screen-block-id="columns-1"]'
      )
    ).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("TASK-503-02 D: a dragstart on the card BODY (old drag surface) starts no move", async () => {
  // Regression pin: the card div is drop-only now. Firing dragstart on it must
  // set no payload and force-reveal no gaps, and a following drop is a no-op.
  const view = mount("/admin/advanced/custom-screens/screen-1");

  try {
    await flush();
    expect(sectionBlockIds(view.container, "section-1")).toEqual(["heading-1", "text-1"]);

    const dataTransfer = makeDataTransfer();
    fireDnd(
      view.container.querySelector('[data-screen-block-id="heading-1"]'),
      "dragstart",
      dataTransfer
    );
    // No drag source on the card → empty payload, gaps stay hidden.
    expect(dataTransfer.getData("text/plain")).toBe("");
    expect(
      view.container.querySelector(
        '[data-screen-insert-gap][data-insert-section="section-1"][data-insert-index="0"]'
      )?.className
    ).toContain("opacity-0");

    // A drop after the phantom dragstart carries no block id → tree unchanged.
    fireDnd(
      view.container.querySelector(
        '[data-screen-insert-gap][data-insert-section="section-1"][data-insert-index="2"]'
      ),
      "drop",
      dataTransfer
    );
    await flush();
    expect(sectionBlockIds(view.container, "section-1")).toEqual(["heading-1", "text-1"]);
  } finally {
    view.cleanup();
  }
});
