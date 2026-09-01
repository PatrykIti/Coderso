// @vitest-environment happy-dom

import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  createCustomScreenEntryNavigationHarness,
  createNavigationFixtureState,
  installNavigationSuiteEnvironment,
  makeEntry,
  MEDIA_ID,
  type CachedEntryReader,
  type CachedOverrideReader,
  type EntryLoader,
  type OverrideLoader,
  type RelatedEntriesLoader,
} from "./support/customScreenEntryNavigationHarness";

import { ApiClientError } from "../../../core/admin/services/apiClient";
import { createEntry, updateEntry } from "@/services/entriesClient";
import { replaceScreenEntryOverrides } from "@/services/customScreensClient";
import type { MediaRecord } from "@/services/mediaClient";
import { CustomScreenEntryEditor } from "../../../core/admin/ui/custom-screens/CustomScreenEntryEditor";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { screens, entries } = createNavigationFixtureState();

let cacheListeners: Array<(event: { key: string; action?: string }) => void> = [];
let readCachedEntry: CachedEntryReader = (_slug, id) => entries.get(id) ?? null;
let loadEntry: EntryLoader = async (_slug, id) => entries.get(id) ?? null;
let readCachedOverrides: CachedOverrideReader = () => [];
let loadOverrides: OverrideLoader = async () => [];
let loadMedia: (options?: { force?: boolean }) => Promise<MediaRecord[]> = async () => [];
let loadRelatedEntries: RelatedEntriesLoader = async () => [];
let cleanupNavigationSuite: () => void = () => undefined;

const { mount, flush, click, editTextbox, findButton, emitCacheEvent } =
  createCustomScreenEntryNavigationHarness({
    EntryEditor: CustomScreenEntryEditor,
    assertPresent: (element) => expect(element).not.toBeNull(),
    getCacheListeners: () => cacheListeners,
  });

const installDefaultEnvironment = () => {
  cleanupNavigationSuite();
  cleanupNavigationSuite = () => undefined;
  cacheListeners = [];
  readCachedEntry = (_slug, id) => entries.get(id) ?? null;
  loadEntry = async (_slug, id) => entries.get(id) ?? null;
  readCachedOverrides = () => [];
  loadOverrides = async () => [];
  loadMedia = async () => [];
  loadRelatedEntries = async () => [];
  cleanupNavigationSuite = installNavigationSuiteEnvironment({
    getScreen: (id) => screens.get(id) ?? null,
    getDeferredScreenTwo: () => null,
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
};

const chooseOption = async (trigger: Element | null, label: string) => {
  click(trigger);
  await flush();
  const option = Array.from(document.body.querySelectorAll<HTMLElement>("[role='option']")).find(
    (node) => node.textContent?.trim() === label
  );
  expect(option).toBeDefined();
  if (!option) throw new Error(`Expected option "${label}" to be rendered`);
  click(option);
  await flush();
  return option;
};

beforeEach(() => {
  installDefaultEnvironment();
});

afterEach(() => {
  cleanupNavigationSuite();
  cleanupNavigationSuite = () => undefined;
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test("presentation text controls commit overrides and Inherit clears them", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    click(view.container.querySelector('[data-screen-block-id="headline-field"]'));
    await flush();
    expect(view.container.querySelector('[aria-label="Text size"]')).not.toBeNull();
    expect(view.container.querySelector('[aria-label="Emphasis"]')).not.toBeNull();
    expect(view.container.querySelector('[aria-label="Tone"]')).not.toBeNull();

    await chooseOption(view.container.querySelector('[aria-label="Text size"]'), "LG");
    expect(view.container.textContent).toContain("Unsaved presentation");
    expect(vi.mocked(replaceScreenEntryOverrides)).not.toHaveBeenCalled();

    await chooseOption(view.container.querySelector('[aria-label="Emphasis"]'), "Bold");
    await chooseOption(view.container.querySelector('[aria-label="Tone"]'), "Muted");
    expect(view.container.textContent).toContain("Unsaved presentation");

    await chooseOption(view.container.querySelector('[aria-label="Text size"]'), "Inherit");
    expect(view.container.querySelector('[aria-label="Text size"]')?.textContent).toContain(
      "Inherit"
    );
    expect(view.container.textContent).toContain("Unsaved presentation");
  } finally {
    view.cleanup();
  }
});

test("re-selecting the current presentation value leaves the draft unchanged", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    click(view.container.querySelector('[data-screen-block-id="headline-field"]'));
    await flush();
    await chooseOption(view.container.querySelector('[aria-label="Text size"]'), "XL");
    expect(view.container.textContent).toContain("Unsaved presentation");

    await chooseOption(view.container.querySelector('[aria-label="Text size"]'), "XL");
    expect(view.container.textContent).toContain("Unsaved presentation");

    click(findButton(view.container, "Save presentation"));
    await flush();
    expect(vi.mocked(replaceScreenEntryOverrides)).toHaveBeenCalledWith("screen-1", "1", [
      { blockId: "headline-field", propPath: "textSize", value: "xl" },
    ]);
  } finally {
    view.cleanup();
  }
});

test("a save with an empty title surfaces client field validation errors", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    editTextbox(view.container, "Title", "");
    click(findButton(view.container, "Save"));
    await flush();
    expect(view.container.textContent).toContain("Fix the highlighted fields before saving.");
    expect(view.container.textContent).toContain("Title is required.");
    expect(vi.mocked(updateEntry)).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("a save rejected with API validation details maps the field errors", async () => {
  vi.mocked(updateEntry).mockRejectedValueOnce(
    new ApiClientError("entry_validation_failed", "Validation failed", 422, {
      validation: [
        { keyword: "required", instancePath: "/headline", params: { missingProperty: "headline" } },
      ],
    })
  );
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    editTextbox(view.container, "Headline", "Needs headline");
    click(findButton(view.container, "Save"));
    await flush();
    expect(view.container.textContent).toContain("Fix the highlighted fields before saving.");
    expect(view.container.textContent).toContain("Headline is required.");
  } finally {
    view.cleanup();
  }
});

test("a save rejected without field details surfaces the API message", async () => {
  vi.mocked(updateEntry).mockRejectedValueOnce(
    new ApiClientError("server_error", "Server rejected the record", 500)
  );
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    editTextbox(view.container, "Headline", "Server side reject");
    click(findButton(view.container, "Save"));
    await flush();
    expect(view.container.textContent).toContain("Server rejected the record");
  } finally {
    view.cleanup();
  }
});

test("a remote entry change offers a refresh that reloads the record", async () => {
  let calls = 0;
  loadEntry = async (_slug, id) => {
    calls += 1;
    return entries.get(id) ?? null;
  };
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    editTextbox(view.container, "Headline", "Local headline");
    emitCacheEvent(cacheKeys.entryDetail("projects", "1"));
    await flush();
    expect(view.container.textContent).toContain(
      "New changes are available. Refresh to load the latest version."
    );
    expect(findButton(view.container, "Refresh")).not.toBeNull();
    const refreshCallsBefore = calls;
    click(findButton(view.container, "Refresh"));
    await flush();
    expect(calls).toBeGreaterThan(refreshCallsBefore);
    expect(view.container.textContent).toContain("Local headline");
  } finally {
    view.cleanup();
  }
});

test("presentation media override commits a chosen asset and clears to inherit", async () => {
  const view = mount("/admin/advanced/custom-screens/screen-1/entries/1");
  try {
    await flush();
    click(view.container.querySelector('[data-screen-block-id="image-1"]'));
    await flush();
    expect(
      view.container.querySelector('[data-presentation-control="mediaAssetId"]')
    ).not.toBeNull();

    const clear = view.container.querySelector<HTMLButtonElement>(
      '[data-testid="clear-presentation-media"]'
    );
    expect(clear).not.toBeNull();
    // Clearing with no media override is a no-op: the draft stays byte-identical.
    click(clear);
    await flush();
    expect(view.container.textContent).not.toContain("Unsaved presentation");

    const choose = view.container.querySelector<HTMLButtonElement>(
      '[data-testid="choose-presentation-media"]'
    );
    expect(choose).not.toBeNull();
    click(choose);
    await flush();
    expect(view.container.textContent).toContain("Unsaved presentation");

    click(findButton(view.container, "Save presentation"));
    await flush();
    expect(vi.mocked(replaceScreenEntryOverrides)).toHaveBeenCalledWith("screen-1", "1", [
      { blockId: "image-1", propPath: "mediaAssetId", value: MEDIA_ID },
    ]);
  } finally {
    view.cleanup();
  }
});
