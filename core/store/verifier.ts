import canonicalize from "canonicalize";
import * as ed from "@noble/ed25519";
import { createHash } from "node:crypto";
import { assertCompatible } from "../plugins/compat";
import type { StoreMetadata } from "./client";

export function canonicalizeMetadata(metadata: StoreMetadata) {
  const canonical = canonicalize(metadata);
  if (!canonical) {
    throw new Error("metadata_canonicalize_failed");
  }
  return new TextEncoder().encode(canonical);
}

export function decodeBase64(value: string) {
  return Uint8Array.from(Buffer.from(value, "base64"));
}

export async function verifyMetadataSignature(
  metadata: StoreMetadata,
  signatureBase64: string,
  publicKeyBase64: string
) {
  const payload = canonicalizeMetadata(metadata);
  const signature = decodeBase64(signatureBase64);
  const publicKey = decodeBase64(publicKeyBase64);
  return await ed.verifyAsync(signature, payload, publicKey);
}

export async function assertMetadataSignature(
  metadata: StoreMetadata,
  signatureBase64: string,
  publicKeyBase64: string
) {
  const valid = await verifyMetadataSignature(metadata, signatureBase64, publicKeyBase64);
  if (!valid) {
    throw new Error("store_signature_invalid");
  }
}

export function verifyChecksum(bytes: Uint8Array, expectedHex: string) {
  const digest = createHash("sha256").update(bytes).digest("hex");
  return digest.toLowerCase() === expectedHex.toLowerCase();
}

export function assertChecksum(bytes: Uint8Array, expectedHex: string) {
  if (!verifyChecksum(bytes, expectedHex)) {
    throw new Error("store_checksum_mismatch");
  }
}

export function assertMetadataCompatibility(metadata: StoreMetadata) {
  assertCompatible({ apiVersion: metadata.apiVersion, coreVersion: metadata.coreVersion });
}
