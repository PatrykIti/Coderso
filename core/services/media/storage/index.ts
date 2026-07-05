import type { MediaStorageAdapter } from "./adapter";
import { createAzureAdapter } from "./azure";
import { createLocalAdapter } from "./local";
import { createS3Adapter } from "./s3";
import { getStorageSettingsInternal } from "../../settings/storageSettings";
import { getSetting } from "../../settings/settingsService";

let cachedAdapter: { key: string; adapter: MediaStorageAdapter } | null = null;

// Test-only seam: when set, `getMediaStorageAdapter()` returns this adapter
// instead of resolving a real driver. Keeps the backup remote-storage suite
// hermetic (no S3/Azure network). Never set in production code paths.
let testAdapterOverride: MediaStorageAdapter | null = null;

const buildCacheKey = (input: Record<string, unknown>) => JSON.stringify(input);

const normalizeBaseUrl = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
};

const ensureProtocol = (value: string) =>
  /^https?:\/\//i.test(value) ? value : `https://${value}`;

const joinUrl = (base: string, path: string) => {
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedPath = path.replace(/^\/+/, "");
  return new URL(normalizedPath, normalizedBase).toString().replace(/\/$/, "");
};

const resolveS3BaseUrl = (
  bucket: string | null,
  region: string | null,
  endpoint: string | null
) => {
  if (!bucket) return null;
  if (endpoint) {
    return joinUrl(ensureProtocol(endpoint.trim()), bucket);
  }
  if (region && region !== "us-east-1") {
    return `https://${bucket}.s3.${region}.amazonaws.com`;
  }
  return `https://${bucket}.s3.amazonaws.com`;
};

const resolveAzureBaseUrl = (account: string | null, container: string | null) => {
  if (!account) return null;
  if (container) {
    return `https://${account}.blob.core.windows.net/${container}`;
  }
  return `https://${account}.blob.core.windows.net`;
};

const resolveLocalBaseUrl = (sitePublicBaseUrl: string | null) => {
  if (!sitePublicBaseUrl) return null;
  return joinUrl(sitePublicBaseUrl, "media");
};

// Fail-closed guard for the test-only injection seam: NODE_ENV==='production'
// must never honor (or even hold) an injected adapter. Belt-and-braces with the
// setter guard below, so a production build can never route media through a
// test override even if some path mutated the global.
const isProductionRuntime = () => process.env.NODE_ENV === "production";

export async function getMediaStorageAdapter() {
  if (testAdapterOverride && !isProductionRuntime()) return testAdapterOverride;
  const config = await getStorageSettingsInternal();
  const sitePublicBaseUrl = await getSetting("site.publicBaseUrl");
  const normalizedSiteBaseUrl =
    typeof sitePublicBaseUrl === "string" ? normalizeBaseUrl(sitePublicBaseUrl) : null;

  const derivedBaseUrl =
    config.driver === "local"
      ? resolveLocalBaseUrl(normalizedSiteBaseUrl)
      : config.driver === "s3"
        ? resolveS3BaseUrl(config.s3.bucket, config.s3.region, config.s3.endpoint)
        : resolveAzureBaseUrl(config.azure.account, config.azure.container);

  const effectiveBaseUrl = normalizeBaseUrl(config.publicBaseUrl ?? derivedBaseUrl);

  const cacheKey = buildCacheKey({
    driver: config.driver,
    localDir: config.localDir,
    publicBaseUrl: effectiveBaseUrl,
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
        baseUrl: effectiveBaseUrl,
      });
      break;
    case "azure":
      adapter = createAzureAdapter({
        container: config.azure.container ?? undefined,
        account: config.azure.account ?? undefined,
        key: config.azure.key ?? undefined,
        connectionString: config.azure.connectionString ?? undefined,
        baseUrl: effectiveBaseUrl,
      });
      break;
    case "local":
      adapter = createLocalAdapter({
        dir: config.localDir ?? undefined,
        baseUrl: effectiveBaseUrl,
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

// Test-only: inject (or clear with `null`) a fake `MediaStorageAdapter` so the
// backup remote-storage tests exercise the s3/azure upload + delete paths
// without any real cloud call. Always restore to `null` in test cleanup.
export function __setMediaStorageAdapterForTests(adapter: MediaStorageAdapter | null) {
  // Never allow a production build to install a test override on the shared media
  // hot path (this resolver serves ALL site-wide uploads, not just backups).
  if (isProductionRuntime() && adapter !== null) {
    throw new Error("media_storage_test_override_forbidden_in_production");
  }
  testAdapterOverride = adapter;
}
