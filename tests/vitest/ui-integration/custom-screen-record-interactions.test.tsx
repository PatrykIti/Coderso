// @vitest-environment happy-dom

import React from "react";

import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import {
  getScreenEntryOverridesCached,
  replaceScreenEntryOverrides,
  type CustomScreenEntryPresentationOverride,
} from "@/services/customScreensClient";
import { updateEntry } from "@/services/entriesClient";
import { setActiveAssistantSurfaceContext } from "../../../core/admin/ui/assistant/activeSurfaceContext";
import { CustomScreenEntryEditor } from "../../../core/admin/ui/custom-screens/CustomScreenEntryEditor";
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
      headline: {
        type: "string" as const,
        title: "Headline",
        xFieldType: "text",
      },
      heroImage: {
        type: "string" as const,
        title: "Hero image",
        xFieldType: "media",
        xFieldConfig: {
          media: {
            accept: ["image/*"],
          },
        },
      },
    },
  },
  createdAt: "2026-05-02T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
};

const createScreenRecord = () => ({
  id: "screen-1",
  name: "Project Screen",
  contentTypeId: "type-1",
  status: "active" as const,
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
            data: { title: "Details" },
            blocks: [
              {
                id: "group-1",
                type: "field-group",
                variant: "card",
                data: {
                  title: "Details",
                  description: "Main project fields",
                },
                slots: {
                  content: [
                    {
                      id: "field-1",
                      type: "field",
                      variant: "stacked",
                      data: {
                        label: "Headline",
                        value: "Fallback headline",
                      },
                    },
                    {
                      id: "field-image",
                      type: "field",
                      variant: "stacked",
                      data: {
                        label: "Hero image",
                        field: "heroImage",
                      },
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
          id: "binding-1",
          blockId: "field-1",
          propPath: "value",
          source: "entry" as const,
          field: "headline",
          mode: "readwrite" as const,
        },
        {
          id: "binding-image",
          blockId: "field-image",
          propPath: "value",
          source: "entry" as const,
          field: "heroImage",
          mode: "readwrite" as const,
        },
      ],
    },
  },
  blocks: [
    {
      id: "group-1",
      type: "screen-field-group",
      variant: "card",
      data: {
        title: "Details",
        description: "Main project fields",
      },
      slots: {
        content: [
          {
            id: "field-1",
            type: "screen-field-value",
            variant: "stacked",
            data: {
              label: "Headline",
              value: "Fallback headline",
            },
          },
          {
            id: "field-image",
            type: "screen-field-value",
            variant: "stacked",
            data: {
              label: "Hero image",
              field: "heroImage",
            },
          },
        ],
      },
    },
  ],
  bindings: [
    {
      id: "binding-1",
      widgetId: "field-1",
      propPath: "value",
      field: "headline",
      mode: "readwrite" as const,
    },
    {
      id: "binding-image",
      widgetId: "field-image",
      propPath: "value",
      field: "heroImage",
      mode: "readwrite" as const,
    },
  ],
  createdAt: "2026-05-02T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
});

let currentScreenRecord = createScreenRecord();

const entryDetail = {
  id: "entry-1",
  typeId: "type-1",
  title: "Project Aurora",
  slug: "project-aurora",
  status: "draft" as const,
  visibility: "public" as const,
  hasPassword: false,
  data: {
    headline: "Project Aurora",
    heroImage: "55555555-5555-4555-8555-555555555555",
  },
  createdAt: "2026-05-02T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
};

let cacheListener: ((event: { key: string }) => void) | null = null;
let currentOverrides: CustomScreenEntryPresentationOverride[] = [];

vi.mock("@/services/customScreensClient", () => ({
  getCachedCustomScreens: vi.fn(() => [currentScreenRecord]),
  listCustomScreensCached: vi.fn(async () => [currentScreenRecord]),
  getCachedCustomScreen: vi.fn(() => currentScreenRecord),
  getCustomScreenCached: vi.fn(async () => currentScreenRecord),
  getCachedScreenEntryOverrides: vi.fn(() => currentOverrides),
  getScreenEntryOverridesCached: vi.fn(async () => currentOverrides),
  replaceScreenEntryOverrides: vi.fn(
    async (
      _screenId: string,
      _entryId: string,
      overrides: CustomScreenEntryPresentationOverride[]
    ) => {
      currentOverrides = [...overrides];
      return currentOverrides;
    }
  ),
  invalidateScreenEntryOverrides: vi.fn(),
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: vi.fn(() => [contentType]),
  listContentTypesCached: vi.fn(async () => [contentType]),
}));

vi.mock("@/services/entriesClient", () => ({
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  getCachedEntryDetail: vi.fn(() => entryDetail),
  getEntryCached: vi.fn(async () => entryDetail),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: vi.fn((handler: (event: { key: string }) => void) => {
    cacheListener = handler;
    return () => {
      cacheListener = null;
    };
  }),
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
        <CustomScreenEntryEditor />
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
    for (let index = 0; index < 6; index += 1) {
      await Promise.resolve();
    }
  });
};

const findButton = (container: HTMLElement, label: string) =>
  Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(label)
  );

beforeEach(() => {
  cacheListener = null;
  currentScreenRecord = createScreenRecord();
  currentOverrides = [];
  vi.mocked(updateEntry).mockResolvedValue(entryDetail);
  window.history.replaceState({}, "", "/admin/advanced/custom-screens/screen-1/entries/entry-1");
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test("record editor keeps child selection scoped and preserves it across refresh", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/entry-1");

  try {
    await flush();

    const parent = view.container.querySelector('[data-screen-block-id="group-1"]');
    const child = view.container.querySelector('[data-screen-block-id="field-1"]');
    expect(parent?.getAttribute("data-selected")).toBe("true");
    expect(child?.getAttribute("data-selected")).toBe("false");

    React.act(() => {
      child?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(parent?.getAttribute("data-selected")).toBe("false");
    expect(child?.getAttribute("data-selected")).toBe("true");
    expect(vi.mocked(setActiveAssistantSurfaceContext).mock.calls.at(-1)?.[0]).toMatchObject({
      selectedBlockId: "field-1",
    });
    expect(view.container.textContent).toContain("Headline");

    expect(child?.querySelector("button")).toBeNull();
    expect(document.body.querySelector("[data-custom-screen-record-value-panel]")).toBeNull();
    expect(child?.querySelector('[role="textbox"]')).not.toBeNull();

    await React.act(async () => {
      cacheListener?.({ key: cacheKeys.customScreenDetail("screen-1") });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      view.container
        .querySelector('[data-screen-block-id="field-1"]')
        ?.getAttribute("data-selected")
    ).toBe("true");
  } finally {
    view.cleanup();
  }
});

test("record editor commits writable field text inline through the existing entry update path", async () => {
  vi.mocked(updateEntry).mockResolvedValue({
    ...entryDetail,
    data: { headline: "Inline Aurora" },
  });
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/entry-1");

  try {
    await flush();

    const textbox = view.container.querySelector('[role="textbox"][aria-label="Headline"]');
    expect(textbox).not.toBeNull();

    React.act(() => {
      (textbox as HTMLElement).textContent = "Inline Aurora";
      textbox?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });
    await flush();

    const save = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Save")
    );
    await React.act(async () => {
      save?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(updateEntry).toHaveBeenCalledWith(
      "projects",
      "entry-1",
      expect.objectContaining({
        data: expect.objectContaining({ headline: "Inline Aurora" }),
      })
    );
  } finally {
    view.cleanup();
  }
});

test("presentation save clears only the selected block overrides without updating entry content", async () => {
  currentOverrides = [
    { blockId: "field-1", propPath: "textSize", value: "lg" },
    {
      blockId: "field-image",
      propPath: "mediaAssetId",
      value: "66666666-6666-4666-8666-666666666666",
    },
  ];
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/entry-1");

  try {
    await flush();

    const child = view.container.querySelector('[data-screen-block-id="field-1"]');
    const textbox = view.container.querySelector('[role="textbox"][aria-label="Headline"]');
    expect(textbox?.getAttribute("class")).toContain("text-lg");

    React.act(() => {
      child?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(
      view.container.querySelector("[data-custom-screen-entry-presentation-panel]")
    ).not.toBeNull();

    await React.act(async () => {
      findButton(view.container, "Clear selected presentation")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
      await Promise.resolve();
    });

    await React.act(async () => {
      findButton(view.container, "Save presentation")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(replaceScreenEntryOverrides).toHaveBeenCalledWith("screen-1", "entry-1", [
      {
        blockId: "field-image",
        propPath: "mediaAssetId",
        value: "66666666-6666-4666-8666-666666666666",
      },
    ]);
    expect(updateEntry).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("dirty presentation draft is not overwritten by override cache events", async () => {
  currentOverrides = [{ blockId: "field-1", propPath: "tone", value: "muted" }];
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/entry-1");

  try {
    await flush();

    const child = view.container.querySelector('[data-screen-block-id="field-1"]');
    React.act(() => {
      child?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    await React.act(async () => {
      findButton(view.container, "Clear selected presentation")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
      await Promise.resolve();
    });

    currentOverrides = [{ blockId: "field-1", propPath: "tone", value: "strong" }];
    await React.act(async () => {
      cacheListener?.({ key: cacheKeys.customScreenEntryOverrides("screen-1", "entry-1") });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("Presentation updated elsewhere");

    await React.act(async () => {
      findButton(view.container, "Save presentation")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(replaceScreenEntryOverrides).toHaveBeenCalledWith("screen-1", "entry-1", []);
  } finally {
    view.cleanup();
  }
});

test("reloading presentation preserves unsaved content edits", async () => {
  currentOverrides = [{ blockId: "field-1", propPath: "tone", value: "muted" }];
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/entry-1");

  try {
    await flush();

    const child = view.container.querySelector('[data-screen-block-id="field-1"]');
    React.act(() => {
      child?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    const textbox = view.container.querySelector('[role="textbox"][aria-label="Headline"]');
    React.act(() => {
      (textbox as HTMLElement).textContent = "Unsaved content draft";
      textbox?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });
    await flush();

    currentOverrides = [{ blockId: "field-1", propPath: "tone", value: "strong" }];
    await React.act(async () => {
      findButton(view.container, "Reload presentation")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      view.container.querySelector('[role="textbox"][aria-label="Headline"]')?.textContent
    ).toBe("Unsaved content draft");
    expect(getScreenEntryOverridesCached).toHaveBeenCalledWith("screen-1", "entry-1", {
      force: true,
    });
    expect(updateEntry).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("presentation controls stay disabled in create mode and media controls are media-only", async () => {
  const createView = mount("/admin/advanced/custom-screens/screen-1/entries/new");

  try {
    await flush();
    expect(
      createView.container.querySelector("[data-custom-screen-entry-presentation-panel]")
    ).toBeNull();
  } finally {
    createView.cleanup();
  }

  const editView = mount("/admin/advanced/custom-screens/screen-1/entries/entry-1");

  try {
    await flush();
    const textField = editView.container.querySelector('[data-screen-block-id="field-1"]');
    React.act(() => {
      textField?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(
      editView.container.querySelector('[data-presentation-control="mediaAssetId"]')
    ).toBeNull();

    const mediaField = editView.container.querySelector('[data-screen-block-id="field-image"]');
    React.act(() => {
      mediaField?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(
      editView.container.querySelector('[data-presentation-control="mediaAssetId"]')
    ).not.toBeNull();
    expect(editView.container.textContent).toContain("Browse media");
  } finally {
    editView.cleanup();
  }
});

test("assistant surface uses editorView blocks and bindings even when legacy root copies drift", async () => {
  currentScreenRecord = {
    ...createScreenRecord(),
    blocks: [],
    bindings: [],
  };

  const view = mount("/admin/advanced/custom-screens/screen-1/entries/entry-1");

  try {
    await flush();

    expect(vi.mocked(setActiveAssistantSurfaceContext).mock.calls.at(-1)?.[0]).toMatchObject({
      selectedBlockId: "group-1",
      bindings: expect.arrayContaining([
        {
          field: "headline",
          mode: "readwrite",
          propPath: "value",
          blockId: "field-1",
        },
      ]),
      blocks: expect.arrayContaining([
        expect.objectContaining({ id: "group-1", type: "field-group" }),
        expect.objectContaining({ id: "field-1", type: "field" }),
      ]),
    });
  } finally {
    view.cleanup();
  }
});
