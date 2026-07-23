// @vitest-environment happy-dom

import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  createCustomScreenEntryNavigationHarness,
  createNavigationFixtureState,
  deferred,
  installNavigationSuiteEnvironment,
  makeEntry,
  makeScreen,
  MEDIA_ID,
  type CachedEntryReader,
  type CachedOverrideReader,
  type EntryLoader,
  type OverrideLoader,
  type PresentationOverride,
  type RelatedEntriesLoader,
} from "./support/customScreenEntryNavigationHarness";

import { createEntry, updateEntry, type EntryDetail } from "@/services/entriesClient";
import { listContentTypesCached } from "@/services/contentTypesClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { replaceScreenEntryOverrides } from "@/services/customScreensClient";
import { listMediaCached, type MediaRecord } from "@/services/mediaClient";
import {
  clearActiveAssistantSurfaceContext,
  setActiveAssistantSurfaceContext,
} from "@/ui/assistant/activeSurfaceContext";
import { CustomScreenEntryEditor } from "../../../core/admin/ui/custom-screens/CustomScreenEntryEditor";

const { screens, entries } = createNavigationFixtureState();

let deferredScreenTwo: ReturnType<typeof deferred<ReturnType<typeof makeScreen>>> | null = null;
let cacheListeners: Array<(event: { key: string; action?: string }) => void> = [];
let readCachedEntry: CachedEntryReader = (_slug, id) => entries.get(id) ?? null;
let loadEntry: EntryLoader = async (_slug, id) => entries.get(id) ?? null;
let readCachedOverrides: CachedOverrideReader = () => [];
let loadOverrides: OverrideLoader = async () => [];
let loadMedia: (options?: { force?: boolean }) => Promise<MediaRecord[]> = async () => [];
let loadRelatedEntries: RelatedEntriesLoader = async () => [];
let cleanupNavigationSuite: () => void = () => undefined;

const {
  mount,
  flush,
  click,
  editTextbox,
  findButton,
  emitCacheEvent,
  choosePresentationMedia,
  confirmDiscard,
} = createCustomScreenEntryNavigationHarness({
  EntryEditor: CustomScreenEntryEditor,
  assertPresent: (element) => expect(element).not.toBeNull(),
  getCacheListeners: () => cacheListeners,
});

beforeEach(() => {
  cleanupNavigationSuite();
  cleanupNavigationSuite = () => undefined;
  deferredScreenTwo = null;
  cacheListeners = [];
  readCachedEntry = (_slug, id) => entries.get(id) ?? null;
  loadEntry = async (_slug, id) => entries.get(id) ?? null;
  readCachedOverrides = () => [];
  loadOverrides = async () => [];
  loadMedia = async () => [];
  loadRelatedEntries = async () => [];
  cleanupNavigationSuite = installNavigationSuiteEnvironment({
    getScreen: (id) => screens.get(id) ?? null,
    getDeferredScreenTwo: () => deferredScreenTwo?.promise ?? null,
    readCachedEntry: (slug, id) => readCachedEntry(slug, id),
    loadEntry: (slug, id, options) => loadEntry(slug, id, options),
    readCachedOverrides: (screenId, entryId) => readCachedOverrides(screenId, entryId),
    loadOverrides: (screenId, entryId, options) => loadOverrides(screenId, entryId, options),
    loadMedia: (options) => loadMedia(options),
    loadRelatedEntries: (slug, options) => loadRelatedEntries(slug, options),
    getCacheListeners: () => cacheListeners,
    setCacheListeners: (listeners) => {
      cacheListeners = listeners;
    },
  });
  vi.mocked(createEntry).mockReset();
  vi.mocked(updateEntry).mockReset();
  vi.mocked(replaceScreenEntryOverrides).mockReset();
  vi.mocked(replaceScreenEntryOverrides).mockImplementation(
    async (_screen, _entry, overrides) => overrides
  );
  vi.mocked(updateEntry).mockImplementation(async (_slug, id) => entries.get(id) ?? makeEntry(id));
});

afterEach(() => {
  cleanupNavigationSuite();
  cleanupNavigationSuite = () => undefined;
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test.each(["content", "presentation"] as const)(
  "a pending %s save from visit A cannot reactivate after A to B to A",
  async (channel) => {
    const contentSave = deferred<EntryDetail>();
    const presentationSave = deferred<PresentationOverride[]>();
    if (channel === "content") {
      vi.mocked(updateEntry).mockReturnValueOnce(contentSave.promise);
    } else {
      vi.mocked(replaceScreenEntryOverrides).mockReturnValueOnce(presentationSave.promise);
    }
    const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
    try {
      await flush();
      if (channel === "content") {
        editTextbox(view.container, "Headline", "A1 pending content");
        click(findButton(view.container, "Save"));
      } else {
        await choosePresentationMedia(view.container);
        click(findButton(view.container, "Save presentation"));
      }
      await flush();
      expect(view.container.textContent).toContain("Saving...");

      click(view.container.querySelector('[data-testid="navigate-entry-2"]'));
      await confirmDiscard();
      click(view.container.querySelector('[data-testid="navigate-entry-1"]'));
      await flush();
      expect(view.container.textContent).not.toContain("Saving...");
      expect(view.container.textContent).not.toContain("A1 pending content");

      if (channel === "content") {
        contentSave.resolve({
          ...makeEntry("1"),
          data: { ...makeEntry("1").data, headline: "stale saved content" },
        });
      } else {
        presentationSave.resolve([
          { blockId: "image-1", propPath: "mediaAssetId", value: MEDIA_ID },
        ]);
      }
      await flush();
      expect(view.container.textContent).not.toContain("Saving...");
      expect(view.container.textContent).not.toContain("newer local changes remain unsaved");
      expect(view.container.textContent).not.toContain("stale saved content");
    } finally {
      view.cleanup();
    }
  }
);

test.each(["entry-first", "override-first"] as const)(
  "overlapping entry and presentation hydration commits safely in %s order",
  async (order) => {
    const entryLoad = deferred<EntryDetail | null>();
    const overrideLoad = deferred<PresentationOverride[]>();
    readCachedEntry = () => null;
    readCachedOverrides = () => null;
    loadEntry = () => entryLoad.promise;
    loadOverrides = () => overrideLoad.promise;
    const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
    try {
      await flush();
      expect(listContentTypesCached).toHaveBeenCalledTimes(1);
      expect(listContentTypesCached).toHaveBeenLastCalledWith({ force: true });
      expect(view.container.textContent).toContain("Loading custom screen record...");

      if (order === "entry-first") {
        entryLoad.resolve(makeEntry("1"));
        await flush();
        expect(view.container.textContent).toContain("Entry 1 headline");
        click(view.container.querySelector('[data-screen-block-id="image-1"]'));
        await flush();
        expect(
          view.container.querySelector("[data-custom-screen-entry-presentation-panel]")
        ).toBeNull();
        overrideLoad.resolve([]);
      } else {
        overrideLoad.resolve([]);
        await flush();
        expect(view.container.textContent).toContain("Loading custom screen record...");
        entryLoad.resolve(makeEntry("1"));
      }
      await flush();
      click(view.container.querySelector('[data-screen-block-id="image-1"]'));
      await flush();
      expect(view.container.textContent).toContain("Entry 1 headline");
      expect(
        view.container.querySelector("[data-custom-screen-entry-presentation-panel]")
      ).not.toBeNull();
    } finally {
      view.cleanup();
    }
  }
);

test.each(["dirty-before", "dirty-during"] as const)(
  "%s a rejected entry hydration preserves the local draft and ends loading",
  async (mode) => {
    const refreshLoad = deferred<EntryDetail | null>();
    let calls = 0;
    loadEntry = async (_slug, id) => {
      calls += 1;
      return calls === 1 ? (entries.get(id) ?? null) : refreshLoad.promise;
    };
    const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
    try {
      await flush();
      const applyLocalEdit = () => editTextbox(view.container, "Headline", `${mode} local`);
      if (mode === "dirty-before") {
        applyLocalEdit();
        emitCacheEvent(cacheKeys.entryDetail("projects", "1"));
      } else {
        const textbox = view.container.querySelector('[role="textbox"][aria-label="Headline"]');
        expect(textbox).not.toBeNull();
        React.act(() => {
          cacheListeners.forEach((listener) =>
            listener({ key: cacheKeys.entryDetail("projects", "1"), action: "update" })
          );
          (textbox as HTMLElement).textContent = `${mode} local`;
          textbox?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
        });
      }
      refreshLoad.reject(new Error("refresh failed"));
      await flush();
      expect(view.container.textContent).toContain(`${mode} local`);
      expect(view.container.textContent).toContain(
        "Could not check for record updates. Local changes are unchanged."
      );
      expect(view.container.textContent).not.toContain("Loading custom screen record...");
      expect(findButton(view.container, "Save")).not.toBeNull();
    } finally {
      view.cleanup();
    }
  }
);

test("discarded visit hydration failure and stale finally cannot annotate the next visit", async () => {
  const staleRefresh = deferred<EntryDetail | null>();
  let calls = 0;
  loadEntry = async (_slug, id) => {
    calls += 1;
    return calls === 2 ? staleRefresh.promise : (entries.get(id) ?? null);
  };
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    editTextbox(view.container, "Headline", "Discarded hydration snapshot");
    emitCacheEvent(cacheKeys.entryDetail("projects", "1"));
    click(view.container.querySelector('[data-testid="navigate-entry-2"]'));
    await confirmDiscard();
    staleRefresh.reject(new Error("stale failure"));
    await flush();
    expect(view.container.textContent).not.toContain("Discarded hydration snapshot");
    expect(view.container.textContent).not.toContain("Failed to load record.");
    expect(view.container.textContent).not.toContain("Loading custom screen record...");
  } finally {
    view.cleanup();
  }
});

test.each(["content", "presentation"] as const)(
  "an edit during a %s save preserves the newer local draft and bounded notice",
  async (channel) => {
    const contentSave = deferred<EntryDetail>();
    const presentationSave = deferred<PresentationOverride[]>();
    if (channel === "content") {
      vi.mocked(updateEntry).mockReturnValueOnce(contentSave.promise);
    } else {
      vi.mocked(replaceScreenEntryOverrides).mockReturnValueOnce(presentationSave.promise);
    }
    const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
    try {
      await flush();
      if (channel === "content") {
        editTextbox(view.container, "Headline", "First content draft");
        click(findButton(view.container, "Save"));
        editTextbox(view.container, "Headline", "Newer content draft");
        contentSave.resolve({
          ...makeEntry("1"),
          data: { ...makeEntry("1").data, headline: "First content draft" },
        });
      } else {
        await choosePresentationMedia(view.container);
        click(findButton(view.container, "Save presentation"));
        click(view.container.querySelector('[data-testid="clear-presentation-media"]'));
        presentationSave.resolve([
          { blockId: "image-1", propPath: "mediaAssetId", value: MEDIA_ID },
        ]);
      }
      await flush();
      expect(view.container.textContent).toContain("newer local changes remain unsaved");
      expect(view.container.textContent).toContain(
        channel === "content" ? "Unsaved changes" : "Unsaved presentation"
      );
      if (channel === "content") {
        expect(view.container.textContent).toContain("Newer content draft");
      }
    } finally {
      view.cleanup();
    }
  }
);

test("an exact create waits for persistence before bypassing the guard", async () => {
  const create = deferred<EntryDetail>();
  vi.mocked(createEntry).mockReturnValueOnce(create.promise);
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/new");
  try {
    await flush();
    editTextbox(view.container, "Title", "Exact create");
    editTextbox(view.container, "Slug", "exact-create");
    click(findButton(view.container, "Save"));
    await flush();
    expect(view.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "/entries/new"
    );
    create.resolve(makeEntry("created-exact", "Exact create"));
    await flush();
    expect(view.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "/entries/created-exact"
    );
  } finally {
    view.cleanup();
  }
});

test("a failed stale-create PATCH retry stays dirty and does not navigate", async () => {
  const firstCreate = deferred<EntryDetail>();
  vi.mocked(createEntry).mockReturnValueOnce(firstCreate.promise);
  vi.mocked(updateEntry).mockRejectedValueOnce(new Error("retry failed"));
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/new");
  try {
    await flush();
    editTextbox(view.container, "Title", "First create draft");
    editTextbox(view.container, "Slug", "first-create-draft");
    click(findButton(view.container, "Save"));
    editTextbox(view.container, "Title", "Retry create draft");
    firstCreate.resolve(makeEntry("created-retry", "First create draft"));
    await flush();
    click(findButton(view.container, "Save"));
    await flush();
    expect(updateEntry).toHaveBeenCalledWith(
      "projects",
      "created-retry",
      expect.objectContaining({ title: "Retry create draft" })
    );
    expect(view.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "/entries/new"
    );
    expect(view.container.textContent).toContain("Failed to save record.");
    expect(view.container.textContent).toContain("Unsaved changes");
  } finally {
    view.cleanup();
  }
});

test("a late create A response cannot seed create B, which performs its own POST", async () => {
  const createA = deferred<EntryDetail>();
  vi.mocked(createEntry)
    .mockReturnValueOnce(createA.promise)
    .mockResolvedValueOnce(makeEntry("created-b", "Create B"));
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/new");
  try {
    await flush();
    editTextbox(view.container, "Title", "Create A");
    editTextbox(view.container, "Slug", "create-a");
    click(findButton(view.container, "Save"));
    click(view.container.querySelector('[data-testid="navigate-create-screen-2"]'));
    await confirmDiscard();
    expect(view.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "screen-2/entries/new"
    );

    createA.resolve(makeEntry("created-a", "Create A"));
    await flush();
    editTextbox(view.container, "Title", "Create B");
    editTextbox(view.container, "Slug", "create-b");
    click(findButton(view.container, "Save"));
    await flush();
    expect(createEntry).toHaveBeenCalledTimes(2);
    expect(updateEntry).not.toHaveBeenCalled();
    expect(view.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "screen-2/entries/created-b"
    );
  } finally {
    view.cleanup();
  }
});

test("forced media, relation, and assistant work is scoped to each keyed A to B to A visit", async () => {
  const staleForcedMedia = deferred<MediaRecord[]>();
  const staleRelated = deferred<EntryDetail[]>();
  let mediaCalls = 0;
  let relatedCalls = 0;
  const record = (url: string): MediaRecord => ({
    id: MEDIA_ID,
    key: url.slice(1),
    url,
    type: "image",
    mimeType: "image/jpeg",
    size: 10,
    createdAt: "2026-07-13T00:00:00.000Z",
  });
  readCachedOverrides = () => [{ blockId: "image-1", propPath: "mediaAssetId", value: MEDIA_ID }];
  loadOverrides = async () => [{ blockId: "image-1", propPath: "mediaAssetId", value: MEDIA_ID }];
  loadMedia = async () => {
    mediaCalls += 1;
    if (mediaCalls === 1) return [record("/media/a1.jpg")];
    if (mediaCalls === 2) return staleForcedMedia.promise;
    if (mediaCalls === 3) return [record("/media/b.jpg")];
    return [record("/media/a2.jpg")];
  };
  loadRelatedEntries = async () => {
    relatedCalls += 1;
    if (relatedCalls === 1) return staleRelated.promise;
    if (relatedCalls === 2) return [makeEntry("related-1", "Related B")];
    return [makeEntry("related-1", "Related A2")];
  };

  const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    expect(view.container.querySelector('img[alt="Cover"]')?.getAttribute("src")).toBe(
      "/media/a1.jpg"
    );
    emitCacheEvent(cacheKeys.mediaList);
    await flush();
    expect(vi.mocked(listMediaCached).mock.calls.at(-1)?.[0]).toEqual({ force: true });

    const clearsBeforeRouteChange = vi.mocked(clearActiveAssistantSurfaceContext).mock.calls.length;
    click(view.container.querySelector('[data-testid="navigate-screen-2"]'));
    await flush();
    expect(vi.mocked(clearActiveAssistantSurfaceContext).mock.calls.length).toBeGreaterThan(
      clearsBeforeRouteChange
    );
    expect(view.container.innerHTML).not.toContain("/media/a1.jpg");
    expect(view.container.textContent).not.toContain("Related A");
    expect(view.container.querySelector('img[alt="Cover"]')?.getAttribute("src")).toBe(
      "/media/b.jpg"
    );
    expect(view.container.textContent).toContain("Related B");
    expect(setActiveAssistantSurfaceContext).toHaveBeenLastCalledWith(
      expect.objectContaining({ screen: expect.objectContaining({ id: "screen-2" }) })
    );
    expect(vi.mocked(listMediaCached).mock.calls.at(-1)?.[0]).toEqual({ force: false });

    click(view.container.querySelector('[data-testid="navigate-entry-1"]'));
    await flush();
    expect(view.container.querySelector('img[alt="Cover"]')?.getAttribute("src")).toBe(
      "/media/a2.jpg"
    );
    expect(view.container.textContent).toContain("Related A2");
    expect(setActiveAssistantSurfaceContext).toHaveBeenLastCalledWith(
      expect.objectContaining({ screen: expect.objectContaining({ id: "screen-1" }) })
    );

    staleForcedMedia.resolve([record("/media/stale-a1.jpg")]);
    staleRelated.resolve([makeEntry("related-1", "Related stale A1")]);
    await flush();
    expect(view.container.querySelector('img[alt="Cover"]')?.getAttribute("src")).toBe(
      "/media/a2.jpg"
    );
    expect(view.container.textContent).not.toContain("Related stale A1");
  } finally {
    view.cleanup();
  }
});
