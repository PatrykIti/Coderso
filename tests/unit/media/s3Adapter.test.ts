import { afterAll, expect, test } from "bun:test";

import { createS3Adapter } from "../../../core/services/media/storage/s3";

const previousEnv = {
  MEDIA_BASE_URL: process.env.MEDIA_BASE_URL,
  S3_BUCKET: process.env.S3_BUCKET,
  S3_REGION: process.env.S3_REGION,
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
  S3_SECRET_KEY: process.env.S3_SECRET_KEY,
  S3_ENDPOINT: process.env.S3_ENDPOINT,
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
