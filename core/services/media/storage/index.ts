import type { MediaStorageAdapter } from "./adapter";
import { createAzureAdapter } from "./azure";
import { createLocalAdapter } from "./local";
import { createS3Adapter } from "./s3";

const adapterCache = new Map<string, MediaStorageAdapter>();

export function getMediaStorageAdapter() {
  const storage = (process.env.MEDIA_STORAGE ?? "local").toLowerCase();

  if (adapterCache.has(storage)) {
    return adapterCache.get(storage)!;
  }

  let adapter: MediaStorageAdapter;
  switch (storage) {
    case "s3":
      adapter = createS3Adapter();
      break;
    case "azure":
      adapter = createAzureAdapter();
      break;
    case "local":
    default:
      adapter = createLocalAdapter();
      break;
  }

  adapterCache.set(storage, adapter);
  return adapter;
}
