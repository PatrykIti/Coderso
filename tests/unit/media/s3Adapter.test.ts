import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { afterAll, expect, test } from "bun:test";
import { Readable } from "node:stream";

import { createS3Adapter } from "../../../core/services/media/storage/s3";
import { safeMediaDisposition } from "../../../core/services/media/mediaFileTrust";
import type { CanonicalMediaIdentity } from "../../../core/services/media/mediaFileTrust";
import type { UploadFile } from "../../../core/services/media/storage/adapter";

const previousEnv = {
  MEDIA_BASE_URL: process.env.MEDIA_BASE_URL,
  S3_BUCKET: process.env.S3_BUCKET,
  S3_REGION: process.env.S3_REGION,
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
  S3_SECRET_KEY: process.env.S3_SECRET_KEY,
  S3_ENDPOINT: process.env.S3_ENDPOINT,
  S3_PREFIX: process.env.S3_PREFIX,
};

afterAll(() => {
  if (previousEnv.MEDIA_BASE_URL === undefined) delete process.env.MEDIA_BASE_URL;
  else process.env.MEDIA_BASE_URL = previousEnv.MEDIA_BASE_URL;

  if (previousEnv.S3_BUCKET === undefined) delete process.env.S3_BUCKET;
  else process.env.S3_BUCKET = previousEnv.S3_BUCKET;

  if (previousEnv.S3_REGION === undefined) delete process.env.S3_REGION;
  else process.env.S3_REGION = previousEnv.S3_REGION;

  if (previousEnv.S3_ACCESS_KEY === undefined) delete process.env.S3_ACCESS_KEY;
  else process.env.S3_ACCESS_KEY = previousEnv.S3_ACCESS_KEY;

  if (previousEnv.S3_SECRET_KEY === undefined) delete process.env.S3_SECRET_KEY;
  else process.env.S3_SECRET_KEY = previousEnv.S3_SECRET_KEY;

  if (previousEnv.S3_ENDPOINT === undefined) delete process.env.S3_ENDPOINT;
  else process.env.S3_ENDPOINT = previousEnv.S3_ENDPOINT;

  if (previousEnv.S3_PREFIX === undefined) delete process.env.S3_PREFIX;
  else process.env.S3_PREFIX = previousEnv.S3_PREFIX;
});

function buildUploadFile(name: string, type: string, content: Buffer): UploadFile {
  return {
    name,
    type,
    size: content.byteLength,
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

function createMockS3Client() {
  const commands: unknown[] = [];
  const client = {
    async send(command: unknown) {
      commands.push(command);
      if (command instanceof GetObjectCommand) {
        return { Body: Readable.from([Buffer.from("stored body")]) };
      }
      return {};
    },
  } as unknown as S3Client;
  return { client, commands };
}

const storageOptions = (client: S3Client) => ({
  bucket: "media-bucket",
  region: "us-east-1",
  accessKeyId: "test-key",
  secretAccessKey: "test-secret",
  endpoint: "https://objects.example.com",
  client,
});

test("S3 adapter builds public URL from endpoint", () => {
  process.env.S3_BUCKET = "media-bucket";
  process.env.S3_REGION = "us-east-1";
  process.env.S3_ACCESS_KEY = "test-key";
  process.env.S3_SECRET_KEY = "test-secret";
  process.env.S3_ENDPOINT = "https://objects.example.com";
  delete process.env.MEDIA_BASE_URL;

  const adapter = createS3Adapter();
  expect(adapter.getPublicUrl("2026/01/file.txt")).toBe(
    "https://objects.example.com/media-bucket/2026/01/file.txt"
  );
});

test("S3 media upload preserves a valid prefix and sends exact canonical metadata", async () => {
  const priorPrefix = process.env.S3_PREFIX;
  process.env.S3_PREFIX = "tenant/media";

  try {
    const { client, commands } = createMockS3Client();
    const adapter = createS3Adapter(storageOptions(client));
    const content = Buffer.from("canonical PDF bytes");
    const poisonedBytes = {
      name: "../../quarterly.pdf.exe.html",
      type: "text/html",
      size: content.byteLength,
      arrayBuffer: async () =>
        content.buffer.slice(
          content.byteOffset,
          content.byteOffset + content.byteLength
        ) as ArrayBuffer,
    };
    const downloadName = `../quarterly.pdf.exe\r\nX-Injected: yes-${"é".repeat(240)}`;
    const identity = {
      mimeType: "application/pdf",
      extension: ".pdf",
      delivery: "attachment",
    } as const;

    const stored = await adapter.putMedia({ bytes: poisonedBytes, identity, downloadName });

    const mediaPut = commands[0];
    expect(mediaPut).toBeInstanceOf(PutObjectCommand);
    if (!(mediaPut instanceof PutObjectCommand)) throw new Error("expected_s3_put");
    expect(mediaPut.input.Key).toBe(stored.key);
    expect(mediaPut.input.Key).toMatch(/^tenant\/media\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.pdf$/i);
    expect(mediaPut.input.Key).not.toContain("quarterly");
    expect(mediaPut.input.ContentType).toBe("application/pdf");
    expect(mediaPut.input.ContentDisposition).toBe(
      safeMediaDisposition("attachment", downloadName, ".pdf")
    );
    expect(mediaPut.input.ContentDisposition).not.toMatch(/[\r\n]/u);
    expect(mediaPut.input.ContentDisposition!.length).toBeLessThanOrEqual(768);
    expect(Buffer.from(mediaPut.input.Body as Uint8Array)).toEqual(content);

    const genericContent = Buffer.from('{"backup":true}');
    const generic = await adapter.put(
      buildUploadFile("coderso-backup.archive.json", "application/json", genericContent)
    );
    const genericPut = commands[1];
    expect(genericPut).toBeInstanceOf(PutObjectCommand);
    if (!(genericPut instanceof PutObjectCommand)) throw new Error("expected_generic_s3_put");
    expect(generic.key).toMatch(/^tenant\/media\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.json$/i);
    expect(genericPut.input.ContentType).toBe("application/json");
    expect(genericPut.input.ContentDisposition).toBeUndefined();
    expect(Buffer.from(genericPut.input.Body as Uint8Array)).toEqual(genericContent);

    expect(await streamToBuffer(await adapter.get(stored.key))).toEqual(Buffer.from("stored body"));
    await adapter.delete(stored.key);
    expect(commands[2]).toBeInstanceOf(GetObjectCommand);
    expect(commands[3]).toBeInstanceOf(DeleteObjectCommand);
  } finally {
    if (priorPrefix === undefined) delete process.env.S3_PREFIX;
    else process.env.S3_PREFIX = priorPrefix;
  }
});

test("S3 media upload rejects invalid identity and configured prefixes before byte or SDK calls", async () => {
  const priorPrefix = process.env.S3_PREFIX;

  try {
    const { client, commands } = createMockS3Client();
    const adapter = createS3Adapter(storageOptions(client));
    let byteReads = 0;
    const bytes = {
      size: 1,
      arrayBuffer: async () => {
        byteReads += 1;
        return Uint8Array.of(1).buffer;
      },
    };
    const mismatchedIdentity = {
      mimeType: "image/png",
      extension: ".pdf",
      delivery: "attachment",
    } as unknown as CanonicalMediaIdentity;
    const inheritedProfileKey = {
      mimeType: "toString",
      extension: ".png",
      delivery: "inline",
    } as unknown as CanonicalMediaIdentity;

    delete process.env.S3_PREFIX;
    for (const identity of [mismatchedIdentity, inheritedProfileKey]) {
      await expect(
        adapter.putMedia({ bytes, identity, downloadName: "ignored.png" })
      ).rejects.toThrow("media_identity_invalid");
    }

    const validIdentity = {
      mimeType: "image/png",
      extension: ".png",
      delivery: "inline",
    } as const;
    const invalidPrefixes = [
      "../escape",
      "percent%2fescape",
      "back\\slash",
      "safe//empty",
      ".",
      "control\u0000segment",
      "x".repeat(256),
    ];
    for (const prefix of invalidPrefixes) {
      process.env.S3_PREFIX = prefix;
      await expect(
        adapter.putMedia({ bytes, identity: validIdentity, downloadName: "ignored.png" })
      ).rejects.toThrow("media_identity_invalid");
    }

    expect(byteReads).toBe(0);
    expect(commands).toEqual([]);
  } finally {
    if (priorPrefix === undefined) delete process.env.S3_PREFIX;
    else process.env.S3_PREFIX = priorPrefix;
  }
});
