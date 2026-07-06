import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mockApiRequest = vi.fn();

vi.mock("../../../core/admin/services/apiClient", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}));

import {
  clearMediaFoldersCache,
  createMediaFolder,
  deleteMediaFolder,
  listMediaFolders,
  reorderMediaFolders,
  updateMediaFolder,
  type MediaFolder,
  type MediaFolderOrder,
} from "../../../core/admin/services/mediaFoldersClient";

const folder: MediaFolder = {
  id: "folder-1",
  name: "Brand",
  slug: "brand",
  parentId: null,
  orderIndex: 0,
  createdAt: "2026-04-23T00:00:00.000Z",
};

beforeEach(() => {
  mockApiRequest.mockReset();
  clearMediaFoldersCache();
});

afterEach(() => {
  clearMediaFoldersCache();
});

test("listMediaFolders GETs /media/folders (no CSRF)", async () => {
  mockApiRequest.mockResolvedValue([folder]);
  const result = await listMediaFolders();
  expect(result).toEqual([folder]);
  const [path, init] = mockApiRequest.mock.calls[0];
  expect(path).toBe("/media/folders");
  expect((init as { method: string }).method).toBe("GET");
});

test("createMediaFolder POSTs with CSRF", async () => {
  mockApiRequest.mockResolvedValue(folder);
  await createMediaFolder({ name: "Brand" });
  const [path, init, opts] = mockApiRequest.mock.calls[0];
  expect(path).toBe("/media/folders");
  expect((init as { method: string }).method).toBe("POST");
  expect(JSON.parse((init as { body: string }).body)).toEqual({ name: "Brand" });
  expect(opts).toEqual({ withCsrf: true });
});

test("updateMediaFolder PATCHes the folder id with CSRF", async () => {
  mockApiRequest.mockResolvedValue(folder);
  await updateMediaFolder("folder-1", { name: "Renamed" });
  const [path, init, opts] = mockApiRequest.mock.calls[0];
  expect(path).toBe("/media/folders/folder-1");
  expect((init as { method: string }).method).toBe("PATCH");
  expect(JSON.parse((init as { body: string }).body)).toEqual({ name: "Renamed" });
  expect(opts).toEqual({ withCsrf: true });
});

test("reorderMediaFolders serializes to the { orders } wrapper (never a bare array)", async () => {
  mockApiRequest.mockResolvedValue({ ok: true });
  const orders: MediaFolderOrder[] = [
    { id: "a", orderIndex: 0 },
    { id: "b", orderIndex: 1, parentId: "a" },
  ];
  await reorderMediaFolders(orders);
  const [path, init, opts] = mockApiRequest.mock.calls[0];
  expect(path).toBe("/media/folders/reorder");
  expect((init as { method: string }).method).toBe("POST");
  const parsed = JSON.parse((init as { body: string }).body);
  expect(parsed).toEqual({ orders });
  expect(Array.isArray(parsed)).toBe(false);
  expect(opts).toEqual({ withCsrf: true });
});

test("deleteMediaFolder DELETEs the folder id with CSRF", async () => {
  mockApiRequest.mockResolvedValue({ ok: true });
  await deleteMediaFolder("folder-1");
  const [path, init, opts] = mockApiRequest.mock.calls[0];
  expect(path).toBe("/media/folders/folder-1");
  expect((init as { method: string }).method).toBe("DELETE");
  expect(opts).toEqual({ withCsrf: true });
});

test("createMediaFolder encodes the folder id path segment on update/delete", async () => {
  mockApiRequest.mockResolvedValue(folder);
  await updateMediaFolder("a/b", { name: "x" });
  expect(mockApiRequest.mock.calls[0][0]).toBe("/media/folders/a%2Fb");
});
