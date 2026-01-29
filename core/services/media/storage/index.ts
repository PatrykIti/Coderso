import type { MediaStorageAdapter } from "./adapter";
import { createAzureAdapter } from "./azure";
import { createLocalAdapter } from "./local";
import { createS3Adapter } from "./s3";
import { getStorageSettingsInternal } from "../../settings/storageSettings";

let cachedAdapter: { key: string; adapter: MediaStorageAdapter } | null = null;

const buildCacheKey = (input: Record<string, unknown>) =>
  JSON.stringify(input);

export async function getMediaStorageAdapter() {
  const config = await getStorageSettingsInternal();

  const cacheKey = buildCacheKey({
    driver: config.driver,
    localDir: config.localDir,
    publicBaseUrl: config.publicBaseUrl,
    s3: {
      bucket: config.s3.bucket,
      region: config.s3.region,
      endpoint: config.s3.endpoint,
      accessKey: config.s3.accessKey,
      secretKey: config.s3.secretKey,
    },
    azure: {
      container: config.azure.container,
      account: config.azure.account,
      key: config.azure.key,
      connectionString: config.azure.connectionString,
    },
  });

  if (cachedAdapter && cachedAdapter.key === cacheKey) {
    return cachedAdapter.adapter;
  }

  let adapter: MediaStorageAdapter;
  switch (config.driver) {
    case "s3":
      adapter = createS3Adapter({
        bucket: config.s3.bucket ?? undefined,
        region: config.s3.region ?? undefined,
        accessKeyId: config.s3.accessKey ?? undefined,
        secretAccessKey: config.s3.secretKey ?? undefined,
        endpoint: config.s3.endpoint ?? undefined,
        baseUrl: config.publicBaseUrl,
      });
      break;
    case "azure":
      adapter = createAzureAdapter({
        container: config.azure.container ?? undefined,
        account: config.azure.account ?? undefined,
        key: config.azure.key ?? undefined,
        connectionString: config.azure.connectionString ?? undefined,
        baseUrl: config.publicBaseUrl,
      });
      break;
    case "local":
      adapter = createLocalAdapter({
        dir: config.localDir ?? undefined,
        baseUrl: config.publicBaseUrl,
      });
      break;
    default:
      throw new Error(`media_storage_unknown:${config.driver}`);
  }

  cachedAdapter = { key: cacheKey, adapter };
  return adapter;
}

export function resetMediaStorageAdapterCache() {
  cachedAdapter = null;
}
