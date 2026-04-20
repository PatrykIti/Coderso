import { expect, test } from "bun:test";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createLocalAdapter } from "../../../core/services/media/storage/local";
import type { UploadFile } from "../../../core/services/media/storage/adapter";

function buildUploadFile(
  name: string,
  type: string,
  content: Buffer
): UploadFile {
  return {
    name,
    type,
    size: content.length,
    arrayBuffer: async () =>
      content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength) as ArrayBuffer,
  };
}

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

test("local adapter stores file and returns url", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "nextless-media-"));
  const previousDir = process.env.MEDIA_DIR;
  const previousBaseUrl = process.env.MEDIA_BASE_URL;

  try {
    process.env.MEDIA_DIR = tempDir;
    process.env.MEDIA_BASE_URL = "https://cdn.example.com/media";

    const adapter = createLocalAdapter();
    const content = Buffer.from("hello");
    const file = buildUploadFile("hello.txt", "text/plain", content);

    const stored = await adapter.put(file);

    const storedPath = path.join(tempDir, stored.key);
    const storedStats = await stat(storedPath);
    expect(storedStats.isFile()).toBe(true);
    expect(stored.url).toBe(`https://cdn.example.com/media/${stored.key}`);

    const stream = await adapter.get(stored.key);
    const read = await streamToBuffer(stream);
    expect(read.toString()).toBe("hello");

    await adapter.delete(stored.key);
    await expect(stat(storedPath)).rejects.toThrow();
  } finally {
    if (previousDir === undefined) {
      delete process.env.MEDIA_DIR;
    } else {
      process.env.MEDIA_DIR = previousDir;
    }
    if (previousBaseUrl === undefined) {
      delete process.env.MEDIA_BASE_URL;
    } else {
      process.env.MEDIA_BASE_URL = previousBaseUrl;
    }
    await rm(tempDir, { recursive: true, force: true });
  }
});
