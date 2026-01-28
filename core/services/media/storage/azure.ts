import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { MediaStorageAdapter, UploadFile } from "./adapter";

type AzureConfig = {
  account: string;
  container: string;
  connectionString?: string;
  key?: string;
};

function parseAccountFromConnectionString(connectionString: string) {
  const match = connectionString.match(/AccountName=([^;]+)/i);
  return match?.[1];
}

function getAzureConfig() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const account =
    process.env.AZURE_ACCOUNT ??
    (connectionString ? parseAccountFromConnectionString(connectionString) : undefined);
  const key = process.env.AZURE_KEY;
  const container = process.env.AZURE_CONTAINER;

  if (!container) {
    throw new Error("azure_config_missing");
  }

  if (connectionString) {
    if (!account) {
      throw new Error("azure_config_missing");
    }
    return { account, container, connectionString } satisfies AzureConfig;
  }

  if (!account || !key) {
    throw new Error("azure_config_missing");
  }

  return { account, key, container } satisfies AzureConfig;
}

function getBaseUrl(account: string, container: string) {
  return (
    process.env.MEDIA_BASE_URL ??
    `https://${account}.blob.core.windows.net/${container}`
  );
}

function buildKey(fileName: string) {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = path.extname(fileName || "");
  return `${yyyy}/${mm}/${randomUUID()}${ext}`;
}

export function createAzureAdapter(): MediaStorageAdapter {
  const { account, key, container, connectionString } = getAzureConfig();
  const service = connectionString
    ? BlobServiceClient.fromConnectionString(connectionString)
    : (() => {
        if (!key) {
          throw new Error("azure_config_missing");
        }
        return new BlobServiceClient(
          `https://${account}.blob.core.windows.net`,
          new StorageSharedKeyCredential(account, key)
        );
      })();
  const containerClient = service.getContainerClient(container);
  const baseUrl = getBaseUrl(account, container);

  return {
    async put(file: UploadFile) {
      const keyName = buildKey(file.name);
      const blockBlob = containerClient.getBlockBlobClient(keyName);
      const buffer = Buffer.from(await file.arrayBuffer());

      await blockBlob.uploadData(buffer, {
        blobHTTPHeaders: { blobContentType: file.type },
      });

      return { key: keyName, url: `${baseUrl}/${keyName}` };
    },
    async get(keyName: string) {
      const blobClient = containerClient.getBlobClient(keyName);
      const response = await blobClient.download();
      if (!response.readableStreamBody) {
        throw new Error("azure_object_missing");
      }
      return response.readableStreamBody;
    },
    async delete(keyName: string) {
      await containerClient.deleteBlob(keyName);
    },
    getPublicUrl(keyName: string) {
      return `${baseUrl}/${keyName}`;
    },
  };
}
