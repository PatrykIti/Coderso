import { expect, test } from "bun:test";
import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createLocalAdapter } from "../../../core/services/media/storage/local";
import type {
  CanonicalStoredUpload,
  UploadFile,
} from "../../../core/services/media/storage/adapter";
import type { CanonicalMediaIdentity } from "../../../core/services/media/mediaFileTrust";

function buildUploadFile(name: string, type: string, content: Buffer): UploadFile {
  return {
    name,
    type,
    size: content.length,
    arrayBuffer: async () =>
      content.buffer.slice(
        content.byteOffset,
        content.byteOffset + content.byteLength
      ) as ArrayBuffer,
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
  const tempDir = await mkdtemp(path.join(tmpdir(), "coderso-media-"));
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

test("local media upload derives its confined key only from canonical identity", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "coderso-media-canonical-"));

  try {
    const adapter = createLocalAdapter({
      dir: tempDir,
      baseUrl: "https://cdn.example.com/media",
    });
    const content = Buffer.from("canonical PDF bytes");
    let byteReads = 0;
    const poisonedBytes = {
      name: "../../report.pdf.exe.php",
      type: "text/html",
      size: content.byteLength,
      arrayBuffer: async () => {
        byteReads += 1;
        return content.buffer.slice(
          content.byteOffset,
          content.byteOffset + content.byteLength
        ) as ArrayBuffer;
      },
    };
    const upload: CanonicalStoredUpload = {
      bytes: poisonedBytes,
      identity: {
        mimeType: "application/pdf",
        extension: ".pdf",
        delivery: "attachment",
      },
      downloadName: "../../report.pdf.exe.php",
    };

    const stored = await adapter.putMedia(upload);

    expect(byteReads).toBe(1);
    expect(stored.key).toMatch(/^\d{4}\/\d{2}\/[0-9a-f-]{36}\.pdf$/i);
    expect(stored.key).not.toContain("report");
    expect(stored.key).not.toContain(".exe");
    expect(stored.url).toBe(`https://cdn.example.com/media/${stored.key}`);
    expect(
      path.resolve(tempDir, stored.key).startsWith(`${path.resolve(tempDir)}${path.sep}`)
    ).toBe(true);

    const stream = await adapter.get(stored.key);
    expect(await streamToBuffer(stream)).toEqual(content);
    await adapter.delete(stored.key);
    await expect(stat(path.join(tempDir, stored.key))).rejects.toThrow();
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("local media upload rejects inherited or mismatched identities before byte or filesystem I/O", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "coderso-media-invalid-"));

  try {
    const adapter = createLocalAdapter({ dir: tempDir, baseUrl: "/media" });
    let byteReads = 0;
    const bytes = {
      size: 1,
      arrayBuffer: async () => {
        byteReads += 1;
        return Uint8Array.of(1).buffer;
      },
    };
    const inheritedIdentity = Object.assign(
      Object.create({ mimeType: "image/png" }) as Record<string, unknown>,
      { extension: ".png", delivery: "inline" }
    ) as unknown as CanonicalMediaIdentity;
    const mismatchedIdentity = {
      mimeType: "image/png",
      extension: ".pdf",
      delivery: "attachment",
    } as unknown as CanonicalMediaIdentity;

    for (const identity of [inheritedIdentity, mismatchedIdentity]) {
      await expect(
        adapter.putMedia({ bytes, identity, downloadName: "ignored.png" })
      ).rejects.toThrow("media_identity_invalid");
    }

    expect(byteReads).toBe(0);
    expect(await readdir(tempDir)).toEqual([]);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
