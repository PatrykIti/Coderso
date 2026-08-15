import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { Readable } from "node:stream";
import { safeMediaDisposition } from "../mediaFileTrust";
import {
  assertCanonicalStorageKey,
  assertCanonicalStoredUpload,
  buildCanonicalStorageKey,
  type CanonicalStoredUpload,
  type MediaStorageAdapter,
  type UploadFile,
} from "./adapter";

export type S3StorageOptions = {
  bucket?: string | null;
  region?: string | null;
  accessKeyId?: string | null;
  secretAccessKey?: string | null;
  endpoint?: string | null;
  baseUrl?: string | null;
  client?: S3Client;
};

function getS3Config(options?: S3StorageOptions) {
  const bucket = options?.bucket ?? process.env.S3_BUCKET;
  const region = options?.region ?? process.env.S3_REGION;
  const accessKeyId = options?.accessKeyId ?? process.env.S3_ACCESS_KEY;
  const secretAccessKey = options?.secretAccessKey ?? process.env.S3_SECRET_KEY;
  const endpoint = (options?.endpoint ?? process.env.S3_ENDPOINT)?.trim() || undefined;
  const baseUrl = options?.baseUrl ?? process.env.MEDIA_BASE_URL;

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    throw new Error("s3_config_missing");
  }

  return { bucket, region, accessKeyId, secretAccessKey, endpoint, baseUrl };
}

function getBaseUrl(bucket: string, region: string, endpoint?: string, baseUrl?: string | null) {
  if (baseUrl) {
    return baseUrl;
  }
  if (endpoint) {
    const normalized = endpoint.replace(/\/+$/g, "");
    return `${normalized}/${bucket}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com`;
}

function getKeyPrefix() {
  return process.env.S3_PREFIX?.replace(/^\/+|\/+$/g, "") ?? "";
}

function buildKey(prefix: string, fileName: string) {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = path.extname(fileName || "");
  const base = `${yyyy}/${mm}/${randomUUID()}${ext}`;
  return prefix ? `${prefix}/${base}` : base;
}

export function createS3Adapter(options?: S3StorageOptions): MediaStorageAdapter {
  const { bucket, region, accessKeyId, secretAccessKey, endpoint, baseUrl } = getS3Config(options);
  const resolvedBaseUrl = getBaseUrl(bucket, region, endpoint, baseUrl);
  const client =
    options?.client ??
    new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      endpoint,
    });

  return {
    async put(file: UploadFile) {
      const prefix = getKeyPrefix();
      const key = buildKey(prefix, file.name);
      const body = Buffer.from(await file.arrayBuffer());

      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: file.type,
        })
      );

      return { key, url: `${resolvedBaseUrl}/${key}` };
    },
    async putMedia(upload: CanonicalStoredUpload) {
      assertCanonicalStoredUpload(upload);
      const prefix = getKeyPrefix();
      const baseKey = buildCanonicalStorageKey(upload.identity);
      const key = prefix ? `${prefix}/${baseKey}` : baseKey;
      assertCanonicalStorageKey(key);
      const contentDisposition = safeMediaDisposition(
        upload.identity.delivery,
        upload.downloadName,
        upload.identity.extension
      );
      const body = Buffer.from(await upload.bytes.arrayBuffer());

      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: upload.identity.mimeType,
          ContentDisposition: contentDisposition,
        })
      );

      return { key, url: `${resolvedBaseUrl}/${key}` };
    },
    async get(key: string) {
      const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

      if (!result.Body) {
        throw new Error("s3_object_missing");
      }

      return result.Body as NodeJS.ReadableStream;
    },
    async putAt(key: string, body: AsyncIterable<Uint8Array>, size: number, contentType: string) {
      // SDK v3 PutObject Body does not accept a bare async iterable — wrap it in
      // a Node Readable. ContentLength avoids buffering the whole file.
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: Readable.from(body),
          ContentLength: size,
          ContentType: contentType,
        })
      );
    },
    async delete(key: string) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
    getPublicUrl(key: string) {
      return `${resolvedBaseUrl}/${key}`;
    },
  };
}
