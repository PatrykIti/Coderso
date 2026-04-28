import { afterAll, expect, test } from "bun:test";

import { createAzureAdapter } from "../../../core/services/media/storage/azure";

const previousEnv = {
  MEDIA_BASE_URL: process.env.MEDIA_BASE_URL,
  AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING,
  AZURE_ACCOUNT: process.env.AZURE_ACCOUNT,
  AZURE_KEY: process.env.AZURE_KEY,
  AZURE_CONTAINER: process.env.AZURE_CONTAINER,
};

afterAll(() => {
  if (previousEnv.MEDIA_BASE_URL === undefined) delete process.env.MEDIA_BASE_URL;
  else process.env.MEDIA_BASE_URL = previousEnv.MEDIA_BASE_URL;

  if (previousEnv.AZURE_STORAGE_CONNECTION_STRING === undefined)
    delete process.env.AZURE_STORAGE_CONNECTION_STRING;
  else process.env.AZURE_STORAGE_CONNECTION_STRING = previousEnv.AZURE_STORAGE_CONNECTION_STRING;

  if (previousEnv.AZURE_ACCOUNT === undefined) delete process.env.AZURE_ACCOUNT;
  else process.env.AZURE_ACCOUNT = previousEnv.AZURE_ACCOUNT;

  if (previousEnv.AZURE_KEY === undefined) delete process.env.AZURE_KEY;
  else process.env.AZURE_KEY = previousEnv.AZURE_KEY;

  if (previousEnv.AZURE_CONTAINER === undefined) delete process.env.AZURE_CONTAINER;
  else process.env.AZURE_CONTAINER = previousEnv.AZURE_CONTAINER;
});

test("Azure adapter supports connection string", () => {
  process.env.AZURE_STORAGE_CONNECTION_STRING =
    "DefaultEndpointsProtocol=https;AccountName=coderso;AccountKey=key;EndpointSuffix=core.windows.net";
  process.env.AZURE_CONTAINER = "media";
  delete process.env.AZURE_ACCOUNT;
  delete process.env.AZURE_KEY;
  delete process.env.MEDIA_BASE_URL;

  const adapter = createAzureAdapter();
  expect(adapter.getPublicUrl("2026/01/file.txt")).toBe(
    "https://coderso.blob.core.windows.net/media/2026/01/file.txt"
  );
});
