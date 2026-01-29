import { createReadStream } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { MediaStorageAdapter, UploadFile } from "./adapter";

export type LocalStorageOptions = {
  dir?: string | null;
  baseUrl?: string | null;
};

function getLocalMediaDir(options?: LocalStorageOptions) {
  return options?.dir ?? process.env.MEDIA_DIR ?? "/data/media";
}

function getBaseUrl(options?: LocalStorageOptions) {
  return options?.baseUrl ?? process.env.MEDIA_BASE_URL ?? "/media";
}

function getExtension(fileName: string) {
  const ext = path.extname(fileName || "");
  return ext || "";
}

function buildKey(fileName: string) {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = getExtension(fileName);
  return `${yyyy}/${mm}/${randomUUID()}${ext}`;
}

async function ensureDir(target: string) {
  await mkdir(target, { recursive: true });
}

export function createLocalAdapter(options?: LocalStorageOptions): MediaStorageAdapter {
  return {
    async put(file: UploadFile) {
      const key = buildKey(file.name);
      const dir = path.dirname(key);
      const baseDir = getLocalMediaDir(options);
      await ensureDir(path.join(baseDir, dir));

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(path.join(baseDir, key), buffer);

      return { key, url: `${getBaseUrl(options)}/${key}` };
    },
    async get(key: string) {
      const baseDir = getLocalMediaDir(options);
      return createReadStream(path.join(baseDir, key));
    },
    async delete(key: string) {
      const baseDir = getLocalMediaDir(options);
      const target = path.join(baseDir, key);
      await rm(target, { force: true });
    },
    getPublicUrl(key: string) {
      return `${getBaseUrl(options)}/${key}`;
    },
  };
}
