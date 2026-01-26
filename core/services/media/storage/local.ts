import { createReadStream } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { MediaStorageAdapter, UploadFile } from "./adapter";

function getLocalMediaDir() {
  return process.env.MEDIA_DIR ?? "/data/media";
}

function getBaseUrl() {
  return process.env.MEDIA_BASE_URL ?? "/media";
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

export function createLocalAdapter(): MediaStorageAdapter {
  return {
    async put(file: UploadFile) {
      const key = buildKey(file.name);
      const dir = path.dirname(key);
      const baseDir = getLocalMediaDir();
      await ensureDir(path.join(baseDir, dir));

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(path.join(baseDir, key), buffer);

      return { key, url: `${getBaseUrl()}/${key}` };
    },
    async get(key: string) {
      const baseDir = getLocalMediaDir();
      return createReadStream(path.join(baseDir, key));
    },
    async delete(key: string) {
      const baseDir = getLocalMediaDir();
      const target = path.join(baseDir, key);
      await rm(target, { force: true });
    },
    getPublicUrl(key: string) {
      return `${getBaseUrl()}/${key}`;
    },
  };
}
