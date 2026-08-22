import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const make = (name: string) => vi.fn();
  return {
    listContentTypesCached: make("listContentTypesCached"),
    listEntriesCached: make("listEntriesCached"),
    getEntryCached: make("getEntryCached"),
    getCustomScreenRawCached: make("getCustomScreenRawCached"),
    listCustomScreensCached: make("listCustomScreensCached"),
  };
});

vi.mock("@/services/contentTypesClient", () => ({
  listContentTypesCached: mocks.listContentTypesCached,
}));
vi.mock("@/services/entriesClient", () => ({
  listEntriesCached: mocks.listEntriesCached,
  getEntryCached: mocks.getEntryCached,
}));
vi.mock("@/services/customScreensClient", () => ({
  getCustomScreenRawCached: mocks.getCustomScreenRawCached,
  listCustomScreensCached: mocks.listCustomScreensCached,
}));

import {
  prefetchCustomScreenListData,
  prefetchCustomScreenWorkspaceData,
} from "../../../core/admin/utils/adminPrefetchCustomScreens";

const contentType = (overrides: Partial<{ id: string; slug: string }> = {}) => ({
  id: overrides.id ?? "ct-1",
  slug: overrides.slug ?? "posts",
});

const screen = (overrides: Partial<{ id: string; contentTypeId: string }> = {}) => ({
  id: overrides.id ?? "scr-1",
  contentTypeId: overrides.contentTypeId ?? "ct-1",
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.listContentTypesCached.mockResolvedValue([contentType()]);
  mocks.listCustomScreensCached.mockResolvedValue([screen()]);
  mocks.listEntriesCached.mockResolvedValue([]);
  mocks.getEntryCached.mockResolvedValue({ id: "e-9" });
  mocks.getCustomScreenRawCached.mockResolvedValue(screen());
});

test("prefetchCustomScreenWorkspaceData returns false for a non-workspace path", async () => {
  await expect(
    prefetchCustomScreenWorkspaceData("/advanced/custom-screens/scr-1", { force: false })
  ).resolves.toBe(false);
  expect(mocks.listCustomScreensCached).not.toHaveBeenCalled();
});

test("prefetchCustomScreenWorkspaceData tolerates a failing screen lookup", async () => {
  mocks.getCustomScreenRawCached.mockRejectedValueOnce(new Error("boom"));
  await expect(
    prefetchCustomScreenWorkspaceData("/advanced/custom-screens/scr-1/entries", { force: false })
  ).resolves.toBe(true);
  expect(mocks.listCustomScreensCached).toHaveBeenCalledWith({ force: false });
  expect(mocks.listContentTypesCached).not.toHaveBeenCalled();
});

test("prefetchCustomScreenWorkspaceData returns early when the content type is unknown", async () => {
  mocks.getCustomScreenRawCached.mockResolvedValueOnce(screen({ contentTypeId: "missing-ct" }));
  await expect(
    prefetchCustomScreenWorkspaceData("/advanced/custom-screens/scr-1/entries", { force: false })
  ).resolves.toBe(true);
  expect(mocks.listEntriesCached).not.toHaveBeenCalled();
});

test("prefetchCustomScreenWorkspaceData warms entries and the matching entry", async () => {
  await expect(
    prefetchCustomScreenWorkspaceData("/advanced/custom-screens/scr-1/entries/e-9", { force: true })
  ).resolves.toBe(true);
  expect(mocks.listCustomScreensCached).toHaveBeenCalledWith({ force: true });
  expect(mocks.listContentTypesCached).toHaveBeenCalledWith({ force: true });
  expect(mocks.listEntriesCached).toHaveBeenCalledWith("posts", { force: true });
  expect(mocks.getEntryCached).toHaveBeenCalledWith("posts", "e-9");
});

test("prefetchCustomScreenWorkspaceData skips the entry read for the new-entry screen", async () => {
  await expect(
    prefetchCustomScreenWorkspaceData("/advanced/custom-screens/scr-1/entries/new", {
      force: false,
    })
  ).resolves.toBe(true);
  expect(mocks.listEntriesCached).toHaveBeenCalledWith("posts", { force: false });
  expect(mocks.getEntryCached).not.toHaveBeenCalled();
});

test("prefetchCustomScreenWorkspaceData tolerates a failing entry read", async () => {
  mocks.getEntryCached.mockRejectedValueOnce(new Error("boom"));
  await expect(
    prefetchCustomScreenWorkspaceData("/advanced/custom-screens/scr-1/entries/e-9", {
      force: false,
    })
  ).resolves.toBe(true);
  expect(mocks.getEntryCached).toHaveBeenCalledWith("posts", "e-9");
});

test("prefetchCustomScreenListData warms the screens list and content types", async () => {
  await expect(prefetchCustomScreenListData({ force: false })).resolves.toBeDefined();
  expect(mocks.listCustomScreensCached).toHaveBeenCalledWith({ force: false });
  expect(mocks.listContentTypesCached).toHaveBeenCalledWith({ force: false });
});
