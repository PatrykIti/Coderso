import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { MediaStorageAdapter, UploadFile } from "./adapter";

function getS3Config() {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION;
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    throw new Error("s3_config_missing");
  }

  return { bucket, region, accessKeyId, secretAccessKey };
}

function getBaseUrl(bucket: string, region: string) {
  return (
    process.env.MEDIA_BASE_URL ??
    `https://${bucket}.s3.${region}.amazonaws.com`
  );
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

export function createS3Adapter(): MediaStorageAdapter {
  const { bucket, region, accessKeyId, secretAccessKey } = getS3Config();
  const baseUrl = getBaseUrl(bucket, region);
  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
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

      return { key, url: `${baseUrl}/${key}` };
    },
    async get(key: string) {
      const result = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key })
      );

      if (!result.Body) {
        throw new Error("s3_object_missing");
      }

      return result.Body as NodeJS.ReadableStream;
    },
    async delete(key: string) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
    getPublicUrl(key: string) {
      return `${baseUrl}/${key}`;
    },
  };
}
