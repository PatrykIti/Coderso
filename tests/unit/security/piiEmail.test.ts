import { expect, test } from "bun:test";

import {
  buildEmailFields,
  hashEmail,
  normalizeEmail,
  parseEncryptedEmail,
  resolveEmailValue,
} from "../../../core/services/security/piiEmail";

process.env.PII_HASH_KEY ||= "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.PII_ENC_KEY ||= "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

test("buildEmailFields hashes and encrypts email", () => {
  const fields = buildEmailFields("User@Example.com");
  expect(fields.emailHash).toHaveLength(64);
  expect(fields.emailEncrypted).toBeTruthy();
  const resolved = resolveEmailValue({ emailEncrypted: fields.emailEncrypted });
  expect(resolved).toBe("user@example.com");
});

test("hashEmail is deterministic for normalized email", () => {
  const first = hashEmail(normalizeEmail("USER@Example.com"));
  const second = hashEmail("user@example.com");
  expect(first).toBe(second);
});

test("resolveEmailValue falls back to plain email", () => {
  const email = "plain@example.com";
  expect(resolveEmailValue({ email })).toBe(email);
});

test("parseEncryptedEmail returns null for invalid payload", () => {
  expect(parseEncryptedEmail("not-json")).toBeNull();
});
