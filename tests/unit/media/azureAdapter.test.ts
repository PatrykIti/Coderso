import { type BlobServiceClient } from "@azure/storage-blob";
import { afterAll, expect, test } from "bun:test";
import { Readable } from "node:stream";

import { createAzureAdapter } from "../../../core/services/media/storage/azure";
import { safeMediaDisposition } from "../../../core/services/media/mediaFileTrust";
import type { CanonicalMediaIdentity } from "../../../core/services/media/mediaFileTrust";
import type { UploadFile } from "../../../core/services/media/storage/adapter";

const previousEnv = {
  MEDIA_BASE_URL: process.env.MEDIA_BASE_URL,
  AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING,
  AZURE_ACCOUNT: process.env.AZURE_ACCOUNT,
  AZURE_KEY: process.env.AZURE_KEY,
  AZURE_CONTAINER: process.env.AZURE_CONTAINER,
};

afterAll(() => {
  if (previousEnv.MEDIA_BASE_URL === undefined) delete process.env.MEDIA_BASE_URL;
  else process.env.MEDIA_BASE_URL = previousEnv.MEDIA_BASE_URL;

  if (previousEnv.AZURE_STORAGE_CONNECTION_STRING === undefined)
    delete process.env.AZURE_STORAGE_CONNECTION_STRING;
  else process.env.AZURE_STORAGE_CONNECTION_STRING = previousEnv.AZURE_STORAGE_CONNECTION_STRING;

  if (previousEnv.AZURE_ACCOUNT === undefined) delete process.env.AZURE_ACCOUNT;
  else process.env.AZURE_ACCOUNT = previousEnv.AZURE_ACCOUNT;

  if (previousEnv.AZURE_KEY === undefined) delete process.env.AZURE_KEY;
  else process.env.AZURE_KEY = previousEnv.AZURE_KEY;

  if (previousEnv.AZURE_CONTAINER === undefined) delete process.env.AZURE_CONTAINER;
  else process.env.AZURE_CONTAINER = previousEnv.AZURE_CONTAINER;
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

type BlobUploadOptions = {
  blobHTTPHeaders?: {
    blobContentType?: string;
    blobContentDisposition?: string;
  };
};

function createMockAzureService() {
  const containerLookups: string[] = [];
  const blockBlobLookups: string[] = [];
  const blobLookups: string[] = [];
  const deletedKeys: string[] = [];
  const uploads: Array<{ key: string; body: Buffer; options: BlobUploadOptions }> = [];
  const serviceClient = {
    getContainerClient(container: string) {
      containerLookups.push(container);
      return {
        getBlockBlobClient(key: string) {
          blockBlobLookups.push(key);
          return {
            async uploadData(body: Uint8Array, options: BlobUploadOptions) {
              uploads.push({ key, body: Buffer.from(body), options });
            },
          };
        },
        getBlobClient(key: string) {
          blobLookups.push(key);
          return {
            async download() {
              return { readableStreamBody: Readable.from([Buffer.from("stored body")]) };
            },
          };
        },
        async deleteBlob(key: string) {
          deletedKeys.push(key);
        },
      };
    },
  } as unknown as BlobServiceClient;
  return {
    serviceClient,
    containerLookups,
    blockBlobLookups,
    blobLookups,
    deletedKeys,
    uploads,
  };
}

const storageOptions = (serviceClient: BlobServiceClient) => ({
  account: "coderso",
  key: "test-key",
  container: "media",
  baseUrl: "https://cdn.example.com/media",
  serviceClient,
});

test("Azure adapter supports connection string", () => {
  process.env.AZURE_STORAGE_CONNECTION_STRING =
    "DefaultEndpointsProtocol=https;AccountName=coderso;AccountKey=key;EndpointSuffix=core.windows.net";
  process.env.AZURE_CONTAINER = "media";
  delete process.env.AZURE_ACCOUNT;
  delete process.env.AZURE_KEY;
  delete process.env.MEDIA_BASE_URL;

  const adapter = createAzureAdapter();
  expect(adapter.getPublicUrl("2026/01/file.txt")).toBe(
    "https://coderso.blob.core.windows.net/media/2026/01/file.txt"
  );
});

test("Azure media upload sends exact canonical metadata and preserves generic put", async () => {
  const mock = createMockAzureService();
  const adapter = createAzureAdapter(storageOptions(mock.serviceClient));
  const content = Buffer.from("safe SVG bytes");
  const poisonedBytes = {
    name: "../../logo.svg.exe.html",
    type: "text/html",
    size: content.byteLength,
    arrayBuffer: async () =>
      content.buffer.slice(
        content.byteOffset,
        content.byteOffset + content.byteLength
      ) as ArrayBuffer,
  };
  const downloadName = `../logo.svg.exe\r\nX-Injected: yes-${"ż".repeat(240)}`;
  const identity = {
    mimeType: "image/svg+xml",
    extension: ".svg",
    delivery: "attachment",
  } as const;

  const stored = await adapter.putMedia({ bytes: poisonedBytes, identity, downloadName });

  expect(mock.containerLookups).toEqual(["media"]);
  expect(mock.blockBlobLookups).toEqual([stored.key]);
  expect(stored.key).toMatch(/^\d{4}\/\d{2}\/[0-9a-f-]{36}\.svg$/i);
  expect(stored.key).not.toContain("logo");
  expect(stored.key).not.toContain(".exe");
  expect(stored.url).toBe(`https://cdn.example.com/media/${stored.key}`);
  expect(mock.uploads).toHaveLength(1);
  expect(mock.uploads[0]?.body).toEqual(content);
  expect(mock.uploads[0]?.options.blobHTTPHeaders).toEqual({
    blobContentType: "image/svg+xml",
    blobContentDisposition: safeMediaDisposition("attachment", downloadName, ".svg"),
  });
  expect(mock.uploads[0]?.options.blobHTTPHeaders?.blobContentDisposition).not.toMatch(/[\r\n]/u);
  expect(
    mock.uploads[0]?.options.blobHTTPHeaders?.blobContentDisposition?.length
  ).toBeLessThanOrEqual(768);

  const genericContent = Buffer.from('{"backup":true}');
  const generic = await adapter.put(
    buildUploadFile("coderso-backup.archive.json", "application/json", genericContent)
  );
  expect(generic.key).toMatch(/^\d{4}\/\d{2}\/[0-9a-f-]{36}\.json$/i);
  expect(mock.uploads[1]?.body).toEqual(genericContent);
  expect(mock.uploads[1]?.options.blobHTTPHeaders).toEqual({
    blobContentType: "application/json",
  });
  expect(mock.uploads[1]?.options.blobHTTPHeaders?.blobContentDisposition).toBeUndefined();

  expect(await streamToBuffer(await adapter.get(stored.key))).toEqual(Buffer.from("stored body"));
  await adapter.delete(stored.key);
  expect(mock.blobLookups).toEqual([stored.key]);
  expect(mock.deletedKeys).toEqual([stored.key]);
});

test("Azure media upload rejects invalid identity before byte or blob-client lookup", async () => {
  const mock = createMockAzureService();
  const adapter = createAzureAdapter(storageOptions(mock.serviceClient));
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
    extension: ".svg",
    delivery: "attachment",
  } as unknown as CanonicalMediaIdentity;
  const inheritedProfileKey = {
    mimeType: "constructor",
    extension: ".png",
    delivery: "inline",
  } as unknown as CanonicalMediaIdentity;

  for (const identity of [mismatchedIdentity, inheritedProfileKey]) {
    await expect(
      adapter.putMedia({ bytes, identity, downloadName: "ignored.png" })
    ).rejects.toThrow("media_identity_invalid");
  }

  expect(byteReads).toBe(0);
  expect(mock.containerLookups).toEqual([]);
  expect(mock.blockBlobLookups).toEqual([]);
  expect(mock.uploads).toEqual([]);
});
