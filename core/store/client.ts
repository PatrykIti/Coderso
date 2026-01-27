import { setTimeout as sleep } from "node:timers/promises";

export type StoreMetadata = {
  name: string;
  version: string;
  apiVersion: string;
  coreVersion: string;
  checksum: { sha256: string };
  files: { download: string };
  security?: { scanStatus?: string; scanAt?: string };
  release?: { type?: "normal" | "security"; channel?: string };
  signature?: { keyId?: string };
};

export type StorePluginSummary = {
  name: string;
  latestVersion: string;
  description?: string;
  tags?: string[];
};

export type RevocationEntry = {
  name: string;
  version: string;
  reason?: string;
  revokedAt?: string;
};

export type RevocationList = {
  updatedAt?: string;
  revoked: RevocationEntry[];
};

const METADATA_TTL_MS = 5 * 60 * 1000;
const REVOCATION_TTL_MS = 60 * 60 * 1000;

const metadataCache = new Map<string, { expiresAt: number; value: StoreMetadata }>();
const signatureCache = new Map<string, { expiresAt: number; value: string }>();
let revocationCache: { expiresAt: number; value: RevocationList } | null = null;

function resolveStoreBaseUrl() {
  const baseUrl = process.env.STORE_BASE_URL;
  if (!baseUrl) {
    throw new Error("store_base_url_missing");
  }
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function buildUrl(path: string) {
  return `${resolveStoreBaseUrl()}${path}`;
}

function resolveTimeout() {
  const parsed = Number.parseInt(process.env.PLUGIN_DOWNLOAD_TIMEOUT_MS ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 15000;
  return parsed;
}

async function fetchWithRetry(input: string, options?: { timeoutMs?: number; retries?: number }) {
  const retries = options?.retries ?? 2;
  const timeoutMs = options?.timeoutMs ?? resolveTimeout();
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(input, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`store_http_${response.status}`);
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(300 * (attempt + 1));
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new Error("store_fetch_failed");
}

async function fetchJson<T>(url: string) {
  const response = await fetchWithRetry(url);
  return (await response.json()) as T;
}

async function fetchText(url: string) {
  const response = await fetchWithRetry(url);
  return await response.text();
}

async function fetchBytes(url: string) {
  const response = await fetchWithRetry(url, {
    timeoutMs: resolveTimeout(),
  });
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

export function clearStoreCache() {
  metadataCache.clear();
  signatureCache.clear();
  revocationCache = null;
}

export async function fetchPluginList() {
  return fetchJson<StorePluginSummary[]>(buildUrl("/plugins"));
}

export async function fetchPluginDetails(name: string) {
  return fetchJson<StorePluginSummary>(buildUrl(`/plugins/${name}`));
}

export async function fetchMetadata(name: string, version: string, options?: { force?: boolean }) {
  const key = `${name}@${version}`;
  const cached = metadataCache.get(key);
  if (!options?.force && cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const data = await fetchJson<StoreMetadata>(
    buildUrl(`/plugins/${name}/versions/${version}/metadata`)
  );
  metadataCache.set(key, { value: data, expiresAt: Date.now() + METADATA_TTL_MS });
  return data;
}

export async function fetchMetadataSignature(
  name: string,
  version: string,
  options?: { force?: boolean }
) {
  const key = `${name}@${version}`;
  const cached = signatureCache.get(key);
  if (!options?.force && cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const sig = await fetchText(buildUrl(`/plugins/${name}/versions/${version}/metadata.sig`));
  signatureCache.set(key, { value: sig.trim(), expiresAt: Date.now() + METADATA_TTL_MS });
  return sig.trim();
}

export async function downloadPluginPackage(meta: StoreMetadata) {
  return fetchBytes(meta.files.download);
}

export async function fetchRevocations(options?: { force?: boolean }) {
  if (!options?.force && revocationCache && revocationCache.expiresAt > Date.now()) {
    return revocationCache.value;
  }

  const list = await fetchJson<RevocationList>(buildUrl("/revocations.json"));
  revocationCache = { value: list, expiresAt: Date.now() + REVOCATION_TTL_MS };
  return list;
}
