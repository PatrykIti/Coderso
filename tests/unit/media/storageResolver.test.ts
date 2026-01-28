import { afterAll, expect, test } from "bun:test";

import { getMediaStorageAdapter } from "../../../core/services/media/storage";

const previousEnv = {
  MEDIA_STORAGE: process.env.MEDIA_STORAGE,
  MEDIA_BASE_URL: process.env.MEDIA_BASE_URL,
};

test("getMediaStorageAdapter defaults to local", () => {
  delete process.env.MEDIA_STORAGE;
  process.env.MEDIA_BASE_URL = "http://localhost/media";

  const adapter = getMediaStorageAdapter();
  expect(adapter.getPublicUrl("asset.txt")).toBe(
    "http://localhost/media/asset.txt"
  );
});

test("getMediaStorageAdapter rejects unknown storage", () => {
  process.env.MEDIA_STORAGE = "unknown";
  expect(() => getMediaStorageAdapter()).toThrow(
    "media_storage_unknown:unknown"
  );
});

afterAll(() => {
  if (previousEnv.MEDIA_STORAGE === undefined) {
    delete process.env.MEDIA_STORAGE;
  } else {
    process.env.MEDIA_STORAGE = previousEnv.MEDIA_STORAGE;
  }
  if (previousEnv.MEDIA_BASE_URL === undefined) {
    delete process.env.MEDIA_BASE_URL;
  } else {
    process.env.MEDIA_BASE_URL = previousEnv.MEDIA_BASE_URL;
  }
});
