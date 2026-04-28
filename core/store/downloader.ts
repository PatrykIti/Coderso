import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { unzipSync } from "fflate";

const DEFAULT_MAX_SIZE_MB = 50;

function resolveMaxSizeBytes() {
  const parsed = Number.parseInt(process.env.PLUGIN_MAX_SIZE_MB ?? "", 10);
  const maxMb = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_SIZE_MB;
  return maxMb * 1024 * 1024;
}

function resolveTimeout() {
  const parsed = Number.parseInt(process.env.PLUGIN_DOWNLOAD_TIMEOUT_MS ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 30000;
  return parsed;
}

function normalizeZipPath(entryPath: string) {
  const normalized = entryPath.replace(/\\/g, "/");
  if (!normalized || normalized.startsWith("/") || normalized.includes("..")) {
    throw new Error("plugin_zip_path_invalid");
  }
  return normalized.replace(/^\/+/, "");
}

export async function downloadBytes(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), resolveTimeout());
  const maxBytes = resolveMaxSizeBytes();

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`store_download_${response.status}`);
    }

    const lengthHeader = response.headers.get("content-length");
    if (lengthHeader) {
      const length = Number.parseInt(lengthHeader, 10);
      if (Number.isFinite(length) && length > maxBytes) {
        throw new Error("plugin_download_too_large");
      }
    }

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    if (bytes.byteLength > maxBytes) {
      throw new Error("plugin_download_too_large");
    }

    return bytes;
  } finally {
    clearTimeout(timeout);
  }
}

export function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function unzipToDirectory(zipBytes: Uint8Array, targetDir: string) {
  const entries = unzipSync(zipBytes) as Record<string, Uint8Array>;

  for (const [entryPath, data] of Object.entries(entries)) {
    if (entryPath.endsWith("/")) continue;
    const safePath = normalizeZipPath(entryPath);
    const fullPath = path.join(targetDir, safePath);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, data);
  }
}
