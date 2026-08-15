import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { Readable } from "node:stream";
import { safeMediaDisposition } from "../mediaFileTrust";
import {
  assertCanonicalStoredUpload,
  buildCanonicalStorageKey,
  type CanonicalStoredUpload,
  type MediaStorageAdapter,
  type UploadFile,
} from "./adapter";

export type AzureStorageOptions = {
  account?: string | null;
  key?: string | null;
  container?: string | null;
  connectionString?: string | null;
  baseUrl?: string | null;
  serviceClient?: BlobServiceClient;
};

type AzureConfig = {
  account: string;
  container: string;
  connectionString?: string;
  key?: string;
  baseUrl?: string;
};

function parseAccountFromConnectionString(connectionString: string) {
  const match = connectionString.match(/AccountName=([^;]+)/i);
  return match?.[1];
}

function getAzureConfig(options?: AzureStorageOptions) {
  const connectionString = options?.connectionString ?? process.env.AZURE_STORAGE_CONNECTION_STRING;
  const account =
    options?.account ??
    process.env.AZURE_ACCOUNT ??
    (connectionString ? parseAccountFromConnectionString(connectionString) : undefined);
  const key = options?.key ?? process.env.AZURE_KEY;
  const container = options?.container ?? process.env.AZURE_CONTAINER;
  const baseUrl = options?.baseUrl ?? process.env.MEDIA_BASE_URL;

  if (!container) {
    throw new Error("azure_config_missing");
  }

  if (connectionString) {
    if (!account) {
      throw new Error("azure_config_missing");
    }
    return {
      account,
      container,
      connectionString,
      baseUrl: baseUrl ?? undefined,
    } satisfies AzureConfig;
  }

  if (!account || !key) {
    throw new Error("azure_config_missing");
  }

  return { account, key, container, baseUrl: baseUrl ?? undefined } satisfies AzureConfig;
}

function getBaseUrl(account: string, container: string, baseUrl?: string) {
  return baseUrl ?? `https://${account}.blob.core.windows.net/${container}`;
}

function buildKey(fileName: string) {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = path.extname(fileName || "");
  return `${yyyy}/${mm}/${randomUUID()}${ext}`;
}

export function createAzureAdapter(options?: AzureStorageOptions): MediaStorageAdapter {
  const { account, key, container, connectionString, baseUrl } = getAzureConfig(options);
  const service =
    options?.serviceClient ??
    (connectionString
      ? BlobServiceClient.fromConnectionString(connectionString)
      : (() => {
          if (!key) {
            throw new Error("azure_config_missing");
          }
          return new BlobServiceClient(
            `https://${account}.blob.core.windows.net`,
            new StorageSharedKeyCredential(account, key)
          );
        })());
  const resolvedBaseUrl = getBaseUrl(account, container, baseUrl);

  return {
    async put(file: UploadFile) {
      const keyName = buildKey(file.name);
      const containerClient = service.getContainerClient(container);
      const blockBlob = containerClient.getBlockBlobClient(keyName);
      const buffer = Buffer.from(await file.arrayBuffer());

      await blockBlob.uploadData(buffer, {
        blobHTTPHeaders: { blobContentType: file.type },
      });

      return { key: keyName, url: `${resolvedBaseUrl}/${keyName}` };
    },
    async putMedia(upload: CanonicalStoredUpload) {
      assertCanonicalStoredUpload(upload);
      const keyName = buildCanonicalStorageKey(upload.identity);
      const contentDisposition = safeMediaDisposition(
        upload.identity.delivery,
        upload.downloadName,
        upload.identity.extension
      );
      const containerClient = service.getContainerClient(container);
      const blockBlob = containerClient.getBlockBlobClient(keyName);
      const buffer = Buffer.from(await upload.bytes.arrayBuffer());

      await blockBlob.uploadData(buffer, {
        blobHTTPHeaders: {
          blobContentType: upload.identity.mimeType,
          blobContentDisposition: contentDisposition,
        },
      });

      return { key: keyName, url: `${resolvedBaseUrl}/${keyName}` };
    },
    async get(keyName: string) {
      const containerClient = service.getContainerClient(container);
      const blobClient = containerClient.getBlobClient(keyName);
      const response = await blobClient.download();
      if (!response.readableStreamBody) {
        throw new Error("azure_object_missing");
      }
      return response.readableStreamBody;
    },
    async putAt(
      keyName: string,
      body: AsyncIterable<Uint8Array>,
      _size: number,
      contentType: string
    ) {
      const containerClient = service.getContainerClient(container);
      const blockBlob = containerClient.getBlockBlobClient(keyName);
      await blockBlob.uploadStream(Readable.from(body), undefined, undefined, {
        blobHTTPHeaders: { blobContentType: contentType },
      });
    },
    async delete(keyName: string) {
      const containerClient = service.getContainerClient(container);
      await containerClient.deleteBlob(keyName);
    },
    getPublicUrl(keyName: string) {
      return `${resolvedBaseUrl}/${keyName}`;
    },
  };
}
