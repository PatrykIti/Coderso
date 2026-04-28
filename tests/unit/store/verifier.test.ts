import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import * as ed from "@noble/ed25519";
import {
  assertChecksum,
  assertMetadataCompatibility,
  canonicalizeMetadata,
  verifyChecksum,
  verifyMetadataSignature,
} from "../../../core/store/verifier";
import type { StoreMetadata } from "../../../core/store/client";

const metadata: StoreMetadata = {
  name: "seo-boost",
  version: "1.0.0",
  apiVersion: "1",
  coreVersion: ">=0.1.0",
  checksum: { sha256: "" },
  files: { download: "https://store.example.com/plugin.zip" },
  release: { type: "security", channel: "stable" },
  signature: { keyId: "test" },
};

test("verifies ed25519 signature for metadata", async () => {
  const { secretKey, publicKey } = await ed.keygenAsync();

  const metaBytes = canonicalizeMetadata({
    ...metadata,
    checksum: { sha256: "abc" },
  });
  const signature = await ed.signAsync(metaBytes, secretKey);
  const signatureBase64 = Buffer.from(signature).toString("base64");
  const publicKeyBase64 = Buffer.from(publicKey).toString("base64");

  const valid = await verifyMetadataSignature(
    { ...metadata, checksum: { sha256: "abc" } },
    signatureBase64,
    publicKeyBase64
  );

  expect(valid).toBe(true);
});

test("checksum validation", () => {
  const bytes = new TextEncoder().encode("payload");
  const expected = createHash("sha256").update(bytes).digest("hex");
  const ok = verifyChecksum(bytes, expected);
  expect(ok).toBe(true);
  expect(() => assertChecksum(bytes, "deadbeef")).toThrow("store_checksum_mismatch");
});

test("metadata compatibility", () => {
  expect(() => assertMetadataCompatibility(metadata)).not.toThrow();
});
