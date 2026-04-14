import { afterAll, expect, test } from "bun:test";

import {
  decryptSecret,
  encryptSecret,
  isEncryptedSecret,
} from "../../../core/services/security/secretStore";

const previousKey = process.env.MEDIA_SECRET_MASTER_KEY;

const testKey = Buffer.alloc(32, 7).toString("base64");
process.env.MEDIA_SECRET_MASTER_KEY = testKey;

afterAll(() => {
  if (previousKey === undefined) {
    delete process.env.MEDIA_SECRET_MASTER_KEY;
  } else {
    process.env.MEDIA_SECRET_MASTER_KEY = previousKey;
  }
});

test("encryptSecret and decryptSecret roundtrip", () => {
  const payload = encryptSecret("hello-world");
  expect(isEncryptedSecret(payload)).toBe(true);
  const plain = decryptSecret(payload);
  expect(plain).toBe("hello-world");
});

test("decryptSecret rejects malformed or truncated auth tags", () => {
  const payload = encryptSecret("hello-world");
  expect(() =>
    decryptSecret({
      ...payload,
      tag: Buffer.alloc(8).toString("base64"),
    })
  ).toThrow("encrypted_secret_invalid");

  expect(() =>
    decryptSecret({
      ...payload,
      tag: Buffer.alloc(16, 1).toString("base64"),
    })
  ).toThrow();
});

test("decryptSecret rejects malformed IVs", () => {
  const payload = encryptSecret("hello-world");
  expect(() =>
    decryptSecret({
      ...payload,
      iv: Buffer.alloc(8).toString("base64"),
    })
  ).toThrow("encrypted_secret_invalid");
});

test("encryptSecret fails without master key", () => {
  const current = process.env.MEDIA_SECRET_MASTER_KEY;
  delete process.env.MEDIA_SECRET_MASTER_KEY;
  try {
    expect(() => encryptSecret("secret")).toThrow("secret_master_key_missing");
  } finally {
    if (current !== undefined) {
      process.env.MEDIA_SECRET_MASTER_KEY = current;
    }
  }
});
