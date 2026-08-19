// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { updateEntry } from "@/services/entriesClient";
import { listMediaCached } from "@/services/mediaClient";
import { replaceScreenEntryOverrides } from "@/services/customScreensClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { PRESENTATION_MEDIA_OVERFLOW_ERROR } from "../../../core/admin/ui/custom-screens/customScreenEntryPresentationMedia";
import { CustomScreenEntryEditor } from "../../../core/admin/ui/custom-screens/CustomScreenEntryEditor";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { useScreenEntryPresentationMedia } from "../../../core/admin/ui/custom-screens/hooks/useScreenEntryPresentationMedia";
import { renderAdminUi } from "../../utils/adminRouterRender";
import {
  ADDITIONAL_MEDIA_ID,
  BOUND_MEDIA_ID,
  OVERRIDE_MEDIA_ID,
  clientFixture,
  deferred,
  imageFixture,
  multipleMediaFixture,
  projectFixture,
} from "./custom-screen-entry-editor-restyle.fixtures";

let current = projectFixture;
let currentOverrides: Array<{ blockId: string; propPath: "mediaAssetId"; value: string }> = [];
let cacheListeners: Array<(event: { key: string; action?: string }) => void> = [];
const mediaRecords = [
  {
    id: BOUND_MEDIA_ID,
    key: "bound.jpg",
    url: "/media/bound.jpg",
    type: "image" as const,
    mimeType: "image/jpeg",
    size: 10,
    createdAt: "2026-07-13T00:00:00.000Z",
  },
  {
    id: OVERRIDE_MEDIA_ID,
    key: "override.jpg",
    url: "/media/override.jpg",
    type: "image" as const,
    mimeType: "image/jpeg",
    size: 10,
    createdAt: "2026-07-13T00:00:00.000Z",
  },
];

vi.mock("@/services/customScreensClient", () => ({
  getCachedCustomScreens: vi.fn(() => [current.screen]),
  listCustomScreensCached: vi.fn(async () => [current.screen]),
  getCachedCustomScreen: vi.fn(() => current.screen),
  getCustomScreenRawCached: vi.fn(async () => current.screen),
  getCachedScreenEntryOverrides: vi.fn(() => currentOverrides),
  getScreenEntryOverridesCached: vi.fn(async () => currentOverrides),
  replaceScreenEntryOverrides: vi.fn(async (_screenId, _entryId, overrides) => overrides),
  invalidateScreenEntryOverrides: vi.fn(),
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: vi.fn(() => [current.contentType]),
  listContentTypesCached: vi.fn(async () => [current.contentType]),
}));

vi.mock("@/services/entriesClient", () => ({
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  getCachedEntryDetail: vi.fn(() => current.entry),
  getEntryCached: vi.fn(async () => current.entry),
}));

vi.mock("@/services/mediaClient", () => ({
  getCachedMedia: vi.fn(() => null),
  listMediaCached: vi.fn(async () => mediaRecords),
}));

vi.mock("@/ui/media/MediaPicker", () => ({
  MediaPicker: ({
    accept,
    maxItems,
    multiple = false,
    value,
    onChange,
  }: {
    accept?: string[];
    maxItems?: number;
    multiple?: boolean;
    value: unknown;
    onChange: (value: unknown) => void;
  }) => (
    <div
      data-media-picker
      data-accept={(accept ?? []).join(",")}
      data-max-items={maxItems ?? ""}
      data-multiple={String(multiple)}
      data-value={typeof value === "string" ? value : JSON.stringify(value)}
    >
      <button
        type="button"
        data-media-picker-choose
        onClick={() =>
          onChange(
            multiple
              ? [...(Array.isArray(value) ? value : []), ADDITIONAL_MEDIA_ID]
              : BOUND_MEDIA_ID
          )
        }
      >
        Choose bound media
      </button>
    </div>
  ),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: vi.fn((listener: (event: { key: string; action?: string }) => void) => {
    cacheListeners.push(listener);
    return () => {
      cacheListeners = cacheListeners.filter((candidate) => candidate !== listener);
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

const mount = (path: string, options: { strict?: boolean } = {}) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const editor = (
    <AdminRouterProvider initialPath={path}>
      <CustomScreenEntryEditor />
    </AdminRouterProvider>
  );
  React.act(() => {
    root.render(options.strict ? <React.StrictMode>{editor}</React.StrictMode> : editor);
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
  [...container.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === label
  ) ?? null;

beforeEach(() => {
  current = projectFixture;
  currentOverrides = [];
  cacheListeners = [];
  vi.mocked(listMediaCached).mockReset();
  vi.mocked(listMediaCached).mockResolvedValue(mediaRecords);
  vi.mocked(replaceScreenEntryOverrides).mockClear();
  vi.mocked(updateEntry).mockResolvedValue(projectFixture.entry as never);
  window.localStorage.clear();
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test("renders the screen-defined layout inside a soft document card", () => {
  current = projectFixture;
  const html = renderAdminUi(<CustomScreenEntryEditor />, {
    path: "/admin/advanced/custom-screens/project-catalog/entries/1",
  });

  expect(html).toMatch(/rounded-2xl/);
  expect(html).toMatch(/shadow-card/);
  expect(html).toContain('data-custom-screen-entry-document="true"');
  // TASK-496-02: the entry editor now renders through the shared `CanvasEditor`
  // shell; the old sticky sub-header eyebrow "Screen-owned record editor" is
  // replaced by the in-content PageHeader (no eyebrow). Retargeted to the
  // PRESERVED PageHeader description text.
  expect(html).toContain("The canvas is the active editing surface for this record.");
  expect(html).toContain("Headline");
});

test("layout is data-driven by the per-screen definition (not a hardcoded screen id)", () => {
  current = projectFixture;
  const projectHtml = renderAdminUi(<CustomScreenEntryEditor />, {
    path: "/admin/advanced/custom-screens/project-catalog/entries/1",
  });
  expect(projectHtml).toContain("Headline");
  expect(projectHtml).not.toContain("Account owner");

  current = clientFixture;
  const clientHtml = renderAdminUi(<CustomScreenEntryEditor />, {
    path: "/admin/advanced/custom-screens/client-roster/entries/1",
  });
  expect(clientHtml).toContain("Account owner");
  expect(clientHtml).not.toContain("Headline");
});

test("an inline content edit surfaces the unsaved-changes affordance", async () => {
  current = projectFixture;
  const view = mount("/admin/advanced/custom-screens/project-catalog/entries/1");
  try {
    await flush();
    expect(view.container.textContent).not.toContain("Unsaved changes");
    expect(
      view.container.querySelector('[role="combobox"][aria-label="Text size"]')
    ).not.toBeNull();
    expect(view.container.querySelector('[role="combobox"][aria-label="Emphasis"]')).not.toBeNull();
    expect(view.container.querySelector('[role="combobox"][aria-label="Tone"]')).not.toBeNull();
    const textbox = view.container.querySelector('[role="textbox"][aria-label="Headline"]');
    expect(textbox).not.toBeNull();
    React.act(() => {
      (textbox as HTMLElement).textContent = "Aurora updated";
      textbox?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });
    await flush();
    expect(view.container.textContent).toContain("Unsaved changes");
  } finally {
    view.cleanup();
  }
});

// --- TASK-503-03: entry-view "Field metadata" toggle + surface flatten ---

test("the entry sub-toolbar exposes an unchecked Field metadata toggle and drops bg-dotted", async () => {
  current = projectFixture;
  const view = mount("/admin/advanced/custom-screens/project-catalog/entries/1");
  try {
    await flush();
    const toggle = view.container.querySelector("[data-screen-entry-metadata-toggle]");
    expect(toggle).not.toBeNull();
    const switchButton = toggle?.querySelector('[role="switch"]');
    expect(switchButton?.getAttribute("aria-checked")).toBe("false");

    const scroller = view.container.querySelector("[data-screen-editor-canvas-scroller]");
    expect(scroller).not.toBeNull();
    expect(scroller?.className).not.toContain("bg-dotted");
    // the other scroller affordances are byte-identical.
    expect(scroller?.className).toContain("overflow-auto");
    expect(scroller?.className).toContain("overscroll-contain");
  } finally {
    view.cleanup();
  }
});

test("toggling Field metadata changes aria state and visibly reveals the entry badges", async () => {
  current = projectFixture;
  const view = mount("/admin/advanced/custom-screens/project-catalog/entries/1");
  try {
    await flush();
    // Default OFF: the entry binding badge is hidden.
    expect(view.container.textContent).not.toContain("Editable");

    const switchButton = view.container.querySelector(
      "[data-screen-entry-metadata-toggle] [role='switch']"
    ) as HTMLElement | null;
    expect(switchButton).not.toBeNull();
    React.act(() => {
      switchButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    // The badge is visible through the threaded prop → the 503-02 gate. Preference
    // transport is owned by TASK-540-05-L02 and is intentionally not asserted here.
    expect(view.container.textContent).toContain("Editable");
    expect(switchButton?.getAttribute("aria-checked")).toBe("true");
  } finally {
    view.cleanup();
  }
});

test("direct-image presentation exposes media authoring and renders the winning override URL", async () => {
  current = imageFixture;
  currentOverrides = [{ blockId: "image-1", propPath: "mediaAssetId", value: OVERRIDE_MEDIA_ID }];
  const view = mount("/admin/advanced/custom-screens/image-catalog/entries/1");
  try {
    await flush();
    await flush();
    await vi.waitFor(() => {
      expect(view.container.querySelector('img[alt="Cover"]')?.getAttribute("src")).toBe(
        "/media/override.jpg"
      );
    });
    expect(
      view.container.querySelector(`[data-media-picker][data-value="${BOUND_MEDIA_ID}"]`)
    ).not.toBeNull();
    const imageBlock = view.container.querySelector('[data-screen-block-id="image-1"]');
    React.act(() => {
      imageBlock?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(
      view.container.querySelector('[data-presentation-control="mediaAssetId"]')
    ).not.toBeNull();
    expect(view.container.textContent).toContain("Media override");
    const mediaOverrideGroup = view.container.querySelector('[role="group"][aria-labelledby]');
    const mediaOverrideCaption = mediaOverrideGroup?.querySelector("span[id]");
    expect(mediaOverrideGroup?.getAttribute("aria-labelledby")).toBe(
      mediaOverrideCaption?.getAttribute("id")
    );
    expect(mediaOverrideCaption?.textContent).toBe("Media override");
    const presentationMediaControl = view.container.querySelector(
      '[data-presentation-control="mediaAssetId"]'
    );
    expect(
      presentationMediaControl?.querySelector("[data-media-picker]")?.getAttribute("data-accept")
    ).toBe("image/*");
    // prettier-ignore
    React.act(() => { presentationMediaControl?.querySelector("[data-media-picker-choose]")?.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    await flush();
    // prettier-ignore
    React.act(() => { findButton(view.container, "Save presentation")?.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    await flush();
    expect(replaceScreenEntryOverrides).toHaveBeenCalledWith("image-catalog", "1", [
      { blockId: "image-1", propPath: "mediaAssetId", value: BOUND_MEDIA_ID },
    ]);
  } finally {
    view.cleanup();
  }
});

test("multiple-media fields ignore scalar presentation overrides and preserve array edits", async () => {
  current = multipleMediaFixture;
  currentOverrides = [
    { blockId: "media-field", propPath: "mediaAssetId", value: ADDITIONAL_MEDIA_ID },
  ];
  vi.mocked(updateEntry).mockResolvedValue(multipleMediaFixture.entry);
  const view = mount("/admin/advanced/custom-screens/image-catalog/entries/1");
  try {
    await flush();

    const mediaFieldBlock = view.container.querySelector('[data-screen-block-id="media-field"]');
    const fieldPicker = mediaFieldBlock?.querySelector("[data-media-picker]");
    expect(fieldPicker?.getAttribute("data-value")).toBe(
      JSON.stringify([BOUND_MEDIA_ID, OVERRIDE_MEDIA_ID])
    );
    expect(fieldPicker?.getAttribute("data-value")).not.toBe(ADDITIONAL_MEDIA_ID);
    expect(fieldPicker?.getAttribute("data-multiple")).toBe("true");
    expect(fieldPicker?.getAttribute("data-max-items")).toBe("3");

    React.act(() => {
      mediaFieldBlock?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(view.container.querySelector('[data-presentation-control="mediaAssetId"]')).toBeNull();

    React.act(() => {
      fieldPicker
        ?.querySelector("[data-media-picker-choose]")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(mediaFieldBlock?.querySelector("[data-media-picker]")?.getAttribute("data-value")).toBe(
      JSON.stringify([BOUND_MEDIA_ID, OVERRIDE_MEDIA_ID, ADDITIONAL_MEDIA_ID])
    );

    React.act(() => {
      findButton(view.container, "Save")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(updateEntry).toHaveBeenCalledWith(
      "images",
      "1",
      expect.objectContaining({
        data: expect.objectContaining({
          cover: [BOUND_MEDIA_ID, OVERRIDE_MEDIA_ID, ADDITIONAL_MEDIA_ID],
        }),
      })
    );
  } finally {
    view.cleanup();
  }
});

test("StrictMode replays reuse one exact pending media attempt and one effective read", async () => {
  const media = deferred<typeof mediaRecords>();
  current = imageFixture;
  currentOverrides = [{ blockId: "image-1", propPath: "mediaAssetId", value: OVERRIDE_MEDIA_ID }];
  vi.mocked(listMediaCached).mockReturnValue(media.promise);
  const view = mount("/admin/advanced/custom-screens/image-catalog/entries/1", { strict: true });
  try {
    await flush();
    expect(listMediaCached).toHaveBeenCalledTimes(1);
    media.resolve(mediaRecords);
    await flush();
    expect(view.container.querySelector('img[alt="Cover"]')?.getAttribute("src")).toBe(
      "/media/override.jpg"
    );
    expect(listMediaCached).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});

test("a pending forced media attempt survives semantic rehydrate with one read and stable subscriptions", async () => {
  const forcedRead = deferred<typeof mediaRecords>();
  const coverIds = [BOUND_MEDIA_ID, OVERRIDE_MEDIA_ID, BOUND_MEDIA_ID];
  const secondaryIds = [OVERRIDE_MEDIA_ID, BOUND_MEDIA_ID, OVERRIDE_MEDIA_ID];
  const baseSection = imageFixture.screen.definition.editorView.document.sections[0]!;
  current = {
    ...imageFixture,
    screen: {
      ...imageFixture.screen,
      definition: {
        ...imageFixture.screen.definition,
        editorView: {
          ...imageFixture.screen.definition.editorView,
          document: {
            ...imageFixture.screen.definition.editorView.document,
            sections: [
              {
                ...baseSection,
                blocks: [
                  ...baseSection.blocks,
                  {
                    id: "image-2",
                    type: "image" as const,
                    data: { label: "Secondary" },
                  },
                ],
              },
            ],
          },
          bindings: [
            ...imageFixture.screen.definition.editorView.bindings,
            {
              id: "image-secondary-src",
              blockId: "image-2",
              propPath: "src",
              source: "entry" as const,
              field: "secondary",
              mode: "read" as const,
            },
          ],
        },
      },
    },
    entry: {
      ...imageFixture.entry,
      data: {
        ...imageFixture.entry.data,
        cover: coverIds,
        secondary: secondaryIds,
      },
    },
  };
  currentOverrides = [];
  vi.mocked(listMediaCached)
    .mockResolvedValueOnce(mediaRecords)
    .mockReturnValueOnce(forcedRead.promise);
  const view = mount("/admin/advanced/custom-screens/image-catalog/entries/1");
  try {
    await flush();
    expect(listMediaCached).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector('img[alt="Cover"]')?.getAttribute("src")).toBe(
      "/media/bound.jpg"
    );
    expect(view.container.querySelector('img[alt="Secondary"]')?.getAttribute("src")).toBe(
      "/media/override.jpg"
    );

    React.act(() => {
      cacheListeners.forEach((listener) =>
        listener({ key: cacheKeys.mediaList, action: "update" })
      );
    });
    await flush();
    expect(listMediaCached).toHaveBeenCalledTimes(2);
    expect(vi.mocked(listMediaCached).mock.calls[1]?.[0]).toEqual({ force: true });
    const subscriptionsDuringForcedRead = [...cacheListeners];

    React.act(() => {
      cacheListeners.forEach((listener) =>
        listener({ key: cacheKeys.entryDetail("images", "1"), action: "update" })
      );
    });
    await flush();
    expect(listMediaCached).toHaveBeenCalledTimes(2);
    expect(cacheListeners).toHaveLength(subscriptionsDuringForcedRead.length);
    cacheListeners.forEach((listener, index) => {
      expect(listener).toBe(subscriptionsDuringForcedRead[index]);
    });

    coverIds.splice(1, 2, BOUND_MEDIA_ID, OVERRIDE_MEDIA_ID);
    secondaryIds.splice(1, 2, OVERRIDE_MEDIA_ID, BOUND_MEDIA_ID);
    expect(coverIds).toEqual([BOUND_MEDIA_ID, BOUND_MEDIA_ID, OVERRIDE_MEDIA_ID]);
    expect(secondaryIds).toEqual([OVERRIDE_MEDIA_ID, OVERRIDE_MEDIA_ID, BOUND_MEDIA_ID]);

    forcedRead.resolve([
      { ...mediaRecords[0]!, url: "/media/forced-bound.jpg" },
      { ...mediaRecords[1]!, url: "/media/forced-override.jpg" },
    ]);
    await flush();
    expect(listMediaCached).toHaveBeenCalledTimes(2);
    expect(view.container.querySelector('img[alt="Cover"]')?.getAttribute("src")).toBe(
      "/media/forced-bound.jpg"
    );
    expect(view.container.querySelector('img[alt="Secondary"]')?.getAttribute("src")).toBe(
      "/media/forced-override.jpg"
    );
  } finally {
    view.cleanup();
  }
});

test("bound direct-image UUID resolves in the read-only entry Preview branch", async () => {
  current = {
    ...imageFixture,
    screen: {
      ...imageFixture.screen,
      definition: {
        ...imageFixture.screen.definition,
        editorView: {
          ...imageFixture.screen.definition.editorView,
          bindings: imageFixture.screen.definition.editorView.bindings.map((binding) => ({
            ...binding,
            mode: "read" as const,
          })),
        },
      },
      // TASK-467-02: with all bindings read-only the screen is dashboard mode,
      // not editor-ready; mirror what the capability derivation would produce.
      capabilities: {
        ...imageFixture.screen.capabilities,
        mode: "dashboard",
        hasWritableBindings: false,
        supportsDedicatedEditor: false,
        bindingCounts: {
          total: imageFixture.screen.capabilities?.bindingCounts?.total ?? 1,
          readable: imageFixture.screen.capabilities?.bindingCounts?.readable ?? 1,
          writable: 0,
        },
      },
    },
  };
  const view = mount("/admin/advanced/custom-screens/image-catalog/entries/1");
  try {
    await flush();
    await flush();
    expect(view.container.textContent).toContain("Workspace upgrade required");
    await vi.waitFor(() => {
      expect(view.container.querySelector('img[alt="Cover"]')?.getAttribute("src")).toBe(
        "/media/bound.jpg"
      );
    });
  } finally {
    view.cleanup();
  }
});

test("presentation media failure is visible and manual/cache retries force authoritative reads", async () => {
  const overflowIds = Array.from(
    { length: 200 },
    (_, index) => `00000000-0000-4000-8000-${(index + 1).toString(16).padStart(12, "0")}`
  );
  const overflowFixture = structuredClone(imageFixture);
  overflowFixture.screen.definition.editorView.document.sections[0]!.blocks.push(
    ...overflowIds.map((_, index) => ({
      id: `overflow-image-${index}`,
      type: "image" as const,
      data: { label: `Overflow image ${index}` },
    }))
  );
  current = overflowFixture;
  currentOverrides = overflowIds.map((value, index) => ({
    blockId: `overflow-image-${index}`,
    propPath: "mediaAssetId",
    value,
  }));
  const overflowView = mount("/admin/advanced/custom-screens/image-catalog/entries/1");
  try {
    await flush();
    expect(
      overflowView.container.querySelector("[data-custom-screen-entry-document]")
    ).not.toBeNull();
    const overflowAlert = overflowView.container.querySelector(
      '[data-custom-screen-media-error="overflow"]'
    );
    expect(overflowAlert?.textContent).toContain("Presentation image unavailable");
    expect(overflowAlert?.textContent).toContain(PRESENTATION_MEDIA_OVERFLOW_ERROR);
    expect(overflowView.container.textContent).not.toContain(
      "Presentation image could not be loaded."
    );
    expect(listMediaCached).not.toHaveBeenCalled();
    React.act(() => {
      cacheListeners.forEach((listener) =>
        listener({ key: cacheKeys.mediaList, action: "update" })
      );
    });
    await flush();
    expect(listMediaCached).not.toHaveBeenCalled();
    expect(overflowAlert?.querySelector("button")).toBeNull();
  } finally {
    overflowView.cleanup();
  }
  const blocks = imageFixture.screen.definition.editorView.document.sections[0]!.blocks;
  current = {
    ...imageFixture,
    screen: {
      ...imageFixture.screen,
      definition: {
        ...imageFixture.screen.definition,
        editorView: {
          ...imageFixture.screen.definition.editorView,
          document: {
            ...imageFixture.screen.definition.editorView.document,
            sections: [
              {
                ...imageFixture.screen.definition.editorView.document.sections[0]!,
                blocks: [blocks[1]!, blocks[0]!],
              },
            ],
          },
        },
      },
    },
  };
  currentOverrides = [{ blockId: "image-1", propPath: "mediaAssetId", value: OVERRIDE_MEDIA_ID }];
  const refreshedMediaRecords = structuredClone(mediaRecords);
  refreshedMediaRecords[1]!.url = "/media/override-refreshed.jpg";
  vi.mocked(listMediaCached)
    .mockResolvedValueOnce(mediaRecords)
    .mockRejectedValueOnce(new Error("media unavailable"))
    .mockResolvedValue(refreshedMediaRecords);
  const view = mount("/admin/advanced/custom-screens/image-catalog/entries/1");
  try {
    await flush();
    await flush();
    expect(view.container.querySelector('img[alt="Cover"]')?.getAttribute("src")).toBe(
      "/media/override.jpg"
    );
    expect(vi.mocked(listMediaCached).mock.calls[0]?.[0]).toEqual({ force: false });
    React.act(() => {
      cacheListeners.forEach((listener) =>
        listener({ key: cacheKeys.mediaList, action: "update" })
      );
    });
    await flush();
    expect(view.container.querySelector('img[alt="Cover"]')?.getAttribute("src")).toBe(
      "/media/override.jpg"
    );
    expect(view.container.querySelector('[data-custom-screen-media-error="load"]')).not.toBeNull();
    expect(view.container.textContent).toContain("Presentation image unavailable");
    expect(view.container.textContent).toContain("Presentation image could not be loaded.");
    expect(findButton(view.container, "Retry")).not.toBeNull();
    expect(vi.mocked(listMediaCached).mock.calls.at(-1)?.[0]).toEqual({ force: true });
    const callsBeforeRetry = vi.mocked(listMediaCached).mock.calls.length;
    React.act(() => {
      findButton(view.container, "Retry")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });
    await flush();
    expect(listMediaCached).toHaveBeenCalledTimes(callsBeforeRetry + 1);
    expect(view.container.querySelector('img[alt="Cover"]')?.getAttribute("src")).toBe(
      "/media/override-refreshed.jpg"
    );
    expect(vi.mocked(listMediaCached).mock.calls.at(-1)?.[0]).toEqual({ force: true });
    expect(view.container.querySelector('[data-custom-screen-media-error="load"]')).toBeNull();
    expect(findButton(view.container, "Retry")).toBeNull();
  } finally {
    view.cleanup();
  }
});
test("a new ID set keeps force when the old request settles during layout", async () => {
  let settleStaleForcedRead: () => void = () => undefined;
  const staleForcedRead = {
    then(onFulfilled: (records: typeof mediaRecords) => void) {
      settleStaleForcedRead = () => onFulfilled([mediaRecords[1]!]);
      return { catch: () => undefined };
    },
  } as unknown as Promise<typeof mediaRecords>;
  const currentRead = deferred<typeof mediaRecords>();
  const stableRoute = { routeKey: '["s","e",false]', current: true };
  const publishedInNewLayout: string[] = [];
  let retry: () => void = () => undefined;
  vi.mocked(listMediaCached)
    .mockResolvedValueOnce(mediaRecords)
    .mockReturnValueOnce(staleForcedRead)
    .mockReturnValueOnce(currentRead.promise);
  const root = createRoot(document.createElement("div"));
  try {
    function Probe({ mediaId }: { mediaId: string }) {
      const result = useScreenEntryPresentationMedia({
        routeKey: stableRoute.routeKey,
        routeVisit: stableRoute,
        document: imageFixture.screen.definition.editorView.document,
        bindings: imageFixture.screen.definition.editorView.bindings,
        values: { cover: mediaId },
        overrides: [],
        mountedRef: stableRoute,
      });
      retry = result.retry;
      if (mediaId === BOUND_MEDIA_ID)
        publishedInNewLayout.push(...Object.values(result.state.urlsById));
      React.useLayoutEffect(() => {
        if (mediaId === BOUND_MEDIA_ID) settleStaleForcedRead();
      }, [mediaId]);
      return null;
    }
    const render = (mediaId: string) => React.act(() => root.render(<Probe mediaId={mediaId} />));
    render(OVERRIDE_MEDIA_ID);
    await flush();
    React.act(() => retry());
    await flush();
    render(BOUND_MEDIA_ID);
    await flush();
    expect(vi.mocked(listMediaCached).mock.calls[1]?.[0]).toEqual({ force: true });
    expect(vi.mocked(listMediaCached).mock.calls[2]?.[0]).toEqual({ force: true });
    currentRead.resolve([{ ...mediaRecords[0]!, url: "/media/current-bound.jpg" }]);
    await flush();
    expect(publishedInNewLayout).toEqual(["/media/current-bound.jpg"]);
  } finally {
    React.act(() => root.unmount());
  }
});
test("an unmounted media attempt cannot commit or report a React update error", async () => {
  const pending = deferred<typeof mediaRecords>();
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  current = imageFixture;
  currentOverrides = [{ blockId: "image-1", propPath: "mediaAssetId", value: OVERRIDE_MEDIA_ID }];
  vi.mocked(listMediaCached).mockReturnValue(pending.promise);
  const view = mount("/admin/advanced/custom-screens/image-catalog/entries/1");
  try {
    await flush();
    expect(listMediaCached).toHaveBeenCalledTimes(1);
    view.cleanup();
    pending.resolve(mediaRecords);
    await flush();
    expect(consoleError).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
    consoleError.mockRestore();
  }
});
