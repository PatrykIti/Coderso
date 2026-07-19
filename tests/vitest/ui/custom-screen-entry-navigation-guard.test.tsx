// @vitest-environment happy-dom

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
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { replaceScreenEntryOverrides } from "@/services/customScreensClient";
import type { MediaRecord } from "@/services/mediaClient";
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

const { mount, flush, click, editTextbox, findButton, choosePresentationMedia, confirmDiscard } =
  createCustomScreenEntryNavigationHarness({
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

test("clean navigation proceeds without a dialog, while a content draft supports cancel and confirm", async () => {
  const { readFile } = await import("node:fs/promises");
  const routeSessionSource = await readFile(
    "core/admin/ui/custom-screens/CustomScreenEntryRouteSession.tsx",
    "utf8"
  );
  expect(routeSessionSource).toContain(
    'import { buildCustomScreenWorkspacePath } from "./routeParams";'
  );
  expect(routeSessionSource).toContain("buildCustomScreenWorkspacePath({ screenId })");
  expect(routeSessionSource).not.toContain("encodeURIComponent(screenId)");

  const clean = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    click(clean.container.querySelector('[data-testid="navigate-entry-2"]'));
    await flush();
    expect(clean.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "/entries/2"
    );
    expect(clean.container.textContent).not.toContain("Discard unsaved entry changes?");
  } finally {
    clean.cleanup();
  }

  const dirty = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    editTextbox(dirty.container, "Headline", "Local headline");
    await flush();
    expect(dirty.container.textContent).toContain("Unsaved changes");

    const beforeUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(beforeUnload);
    expect(beforeUnload.defaultPrevented).toBe(true);

    click(dirty.container.querySelector('[data-testid="navigate-entry-2"]'));
    await flush();
    expect(document.body.textContent).toContain("Discard unsaved entry changes?");
    click(findButton(document.body, "Keep editing"));
    await flush();
    expect(dirty.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "/entries/1"
    );

    click(dirty.container.querySelector('[data-testid="navigate-entry-2"]'));
    await flush();
    click(findButton(document.body, "Discard and continue"));
    await flush();
    expect(dirty.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "/entries/2"
    );
  } finally {
    dirty.cleanup();
  }
});

test("presentation-only changes activate the same navigation and beforeunload guard", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    click(view.container.querySelector('[data-screen-block-id="image-1"]'));
    await flush();
    click(view.container.querySelector('[data-testid="choose-presentation-media"]'));
    await flush();
    expect(view.container.textContent).toContain("Unsaved presentation");

    click(view.container.querySelector('[data-testid="navigate-entry-2"]'));
    await flush();
    expect(document.body.textContent).toContain("Discard unsaved entry changes?");
    click(findButton(document.body, "Keep editing"));
    await flush();
    click(findButton(view.container, "Clear selected presentation"));
    await flush();
    expect(view.container.textContent).not.toContain("Unsaved presentation");
    click(view.container.querySelector('[data-testid="navigate-entry-2"]'));
    await flush();
    expect(view.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "/entries/2"
    );
  } finally {
    view.cleanup();
  }
});

test("a failed content save remains dirty and cannot bypass navigation blockers", async () => {
  vi.mocked(updateEntry).mockRejectedValueOnce(new Error("save failed"));
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    editTextbox(view.container, "Headline", "Unsaved after failure");
    click(findButton(view.container, "Save"));
    await flush();
    expect(view.container.textContent).toContain("Failed to save record.");
    expect(view.container.textContent).toContain("Unsaved changes");

    click(view.container.querySelector('[data-testid="navigate-entry-2"]'));
    await flush();
    expect(document.body.textContent).toContain("Discard unsaved entry changes?");
  } finally {
    view.cleanup();
  }
});

test("a failed presentation save keeps its draft, global error, and navigation guard", async () => {
  vi.mocked(replaceScreenEntryOverrides).mockRejectedValueOnce(new Error("save failed"));
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    await choosePresentationMedia(view.container);
    click(findButton(view.container, "Save presentation"));
    await flush();
    expect(view.container.textContent).toContain("Failed to save presentation overrides.");
    expect(
      view.container.querySelector('[data-custom-screen-presentation-error="save"]')
    ).not.toBeNull();
    expect(view.container.textContent).toContain("Unsaved presentation");
    expect(findButton(view.container, "Retry presentation load")).toBeNull();

    click(view.container.querySelector('[data-testid="navigate-entry-2"]'));
    await flush();
    expect(document.body.textContent).toContain("Discard unsaved entry changes?");
  } finally {
    view.cleanup();
  }
});

test("a superseded presentation save reconciles an equal baseline and suppresses its self-cache warning", async () => {
  const save = deferred<Array<{ blockId: string; propPath: "mediaAssetId"; value: string }>>();
  vi.mocked(replaceScreenEntryOverrides).mockImplementationOnce(async () => {
    cacheListeners.forEach((listener) =>
      listener({
        key: cacheKeys.customScreenEntryOverrides("screen-1", "1"),
        action: "update",
      })
    );
    return save.promise;
  });
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    click(view.container.querySelector('[data-screen-block-id="image-1"]'));
    click(view.container.querySelector('[data-testid="choose-presentation-media"]'));
    await flush();
    click(findButton(view.container, "Save presentation"));
    await flush();
    expect(replaceScreenEntryOverrides).toHaveBeenCalledWith("screen-1", "1", [
      { blockId: "image-1", propPath: "mediaAssetId", value: MEDIA_ID },
    ]);
    click(view.container.querySelector('[data-testid="clear-presentation-media"]'));
    await flush();

    save.resolve([]);
    await flush();
    expect(view.container.textContent).not.toContain("Unsaved presentation");
    expect(view.container.textContent).not.toContain("newer local changes remain unsaved");
    expect(view.container.textContent).not.toContain("Presentation updated elsewhere");

    click(view.container.querySelector('[data-testid="navigate-entry-2"]'));
    await flush();
    expect(view.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "/entries/2"
    );
  } finally {
    view.cleanup();
  }
});

test("a stale create response keeps the newer draft, then retries with PATCH and bypasses only after success", async () => {
  const firstCreate = deferred<EntryDetail>();
  vi.mocked(createEntry).mockReturnValueOnce(firstCreate.promise);
  vi.mocked(updateEntry).mockResolvedValueOnce(makeEntry("created-1", "Final local title"));
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/new");
  try {
    await flush();
    editTextbox(view.container, "Title", "First title");
    editTextbox(view.container, "Slug", "first-slug");
    click(findButton(view.container, "Save"));
    await flush();
    expect(createEntry).toHaveBeenCalledTimes(1);

    editTextbox(view.container, "Title", "Final local title");
    firstCreate.resolve(makeEntry("created-1", "First title"));
    await flush();
    expect(view.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "/entries/new"
    );
    expect(view.container.textContent).toContain(
      "Saved server version; newer local changes remain unsaved."
    );

    click(findButton(view.container, "Save"));
    await flush();
    expect(createEntry).toHaveBeenCalledTimes(1);
    expect(updateEntry).toHaveBeenCalledWith(
      "projects",
      "created-1",
      expect.objectContaining({ title: "Final local title" })
    );
    expect(view.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "/entries/created-1"
    );
  } finally {
    view.cleanup();
  }
});

test("route gating hides entry A while screen B hydration is deferred", async () => {
  deferredScreenTwo = deferred<ReturnType<typeof makeScreen>>();
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    expect(view.container.textContent).toContain("Entry 1 headline");
    click(view.container.querySelector('[data-testid="navigate-screen-2"]'));
    await flush();
    expect(view.container.textContent).toContain("Loading custom screen record...");
    expect(view.container.textContent).not.toContain("Entry 1 headline");
    expect(findButton(view.container, "Save")).toBeNull();

    deferredScreenTwo.resolve(screens.get("screen-2")!);
    await flush();
    expect(view.container.textContent).toContain("Entry 1 headline");
  } finally {
    view.cleanup();
  }
});

test("presentation controls stay withheld until a failed load is retried successfully", async () => {
  const initialLoad = deferred<PresentationOverride[]>();
  const retryLoad = deferred<PresentationOverride[]>();
  let attempt = 0;
  readCachedOverrides = () => null;
  loadOverrides = () => (attempt++ === 0 ? initialLoad.promise : retryLoad.promise);
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    click(view.container.querySelector('[data-screen-block-id="image-1"]'));
    await flush();
    expect(
      view.container.querySelector("[data-custom-screen-entry-presentation-panel]")
    ).toBeNull();
    expect(view.container.querySelector('[data-testid="choose-presentation-media"]')).toBeNull();

    initialLoad.reject(new Error("override load failed"));
    await flush();
    expect(
      view.container.querySelector('[data-custom-screen-presentation-error="load"]')?.textContent
    ).toContain("Failed to load presentation overrides.");
    expect(findButton(view.container, "Retry presentation load")).not.toBeNull();

    click(view.container.querySelector('[data-screen-editor-canvas-scroller="true"]'));
    await flush();
    expect(view.container.textContent).toContain("Failed to load presentation overrides.");
    expect(
      view.container.querySelector("[data-custom-screen-entry-presentation-panel]")
    ).toBeNull();

    click(findButton(view.container, "Retry presentation load"));
    await flush();
    expect(
      view.container.querySelector("[data-custom-screen-entry-presentation-panel]")
    ).toBeNull();
    retryLoad.resolve([]);
    await flush();
    expect(view.container.querySelector("[data-custom-screen-presentation-error]")).toBeNull();
    click(view.container.querySelector('[data-screen-block-id="image-1"]'));
    await flush();
    expect(
      view.container.querySelector("[data-custom-screen-entry-presentation-panel]")
    ).not.toBeNull();
  } finally {
    view.cleanup();
  }
});

test("content and presentation drafts share one both-dirty guard and discard invalidates the snapshot", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    editTextbox(view.container, "Headline", "Both-dirty A snapshot");
    await choosePresentationMedia(view.container);
    expect(view.container.textContent).toContain("Unsaved changes");
    expect(view.container.textContent).toContain("Unsaved presentation");

    const beforeUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(beforeUnload);
    expect(beforeUnload.defaultPrevented).toBe(true);

    click(view.container.querySelector('[data-testid="navigate-entry-2"]'));
    await flush();
    click(findButton(document.body, "Keep editing"));
    await flush();
    expect(view.container.textContent).toContain("Both-dirty A snapshot");

    click(view.container.querySelector('[data-testid="navigate-entry-2"]'));
    await confirmDiscard();
    expect(view.container.querySelector('[data-testid="router-path"]')?.textContent).toContain(
      "/entries/2"
    );
    click(view.container.querySelector('[data-testid="navigate-entry-1"]'));
    await flush();
    expect(view.container.textContent).not.toContain("Both-dirty A snapshot");
    expect(view.container.textContent).not.toContain("Unsaved presentation");
  } finally {
    view.cleanup();
  }
});
