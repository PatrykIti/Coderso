import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export type EncryptedEmail = {
  v: 1;
  iv: string;
  tag: string;
  cipherText: string;
};

const resolveKeyFromEnv = (envName: "PII_HASH_KEY" | "PII_ENC_KEY") => {
  const raw = process.env[envName];
  if (!raw) {
    throw new Error(`${envName.toLowerCase()}_missing`);
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error(`${envName.toLowerCase()}_missing`);
  }

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  const base64 = Buffer.from(trimmed, "base64");
  if (base64.length === KEY_LENGTH) {
    return base64;
  }

  if (trimmed.length === KEY_LENGTH) {
    return Buffer.from(trimmed, "utf8");
  }

  throw new Error(`${envName.toLowerCase()}_invalid`);
};

const resolveHashKey = () => resolveKeyFromEnv("PII_HASH_KEY");
const resolveEncKey = () => resolveKeyFromEnv("PII_ENC_KEY");

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function hashEmail(email: string) {
  const normalized = normalizeEmail(email);
  const key = resolveHashKey();
  return createHmac("sha256", key).update(normalized, "utf8").digest("hex");
}

export function isEncryptedEmail(value: unknown): value is EncryptedEmail {
  if (!value || typeof value !== "object") return false;
  const record = value as EncryptedEmail;
  return (
    record.v === 1 &&
    typeof record.iv === "string" &&
    typeof record.tag === "string" &&
    typeof record.cipherText === "string"
  );
}

export function parseEncryptedEmail(value: unknown): EncryptedEmail | null {
  if (isEncryptedEmail(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (isEncryptedEmail(parsed)) return parsed;
    } catch {
      return null;
    }
  }
  return null;
}

export function encryptEmail(email: string): EncryptedEmail {
  const normalized = normalizeEmail(email);
  const key = resolveEncKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(normalized, "utf8")),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    v: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    cipherText: encrypted.toString("base64"),
  };
}

export function decryptEmail(payload: EncryptedEmail): string {
  const key = resolveEncKey();
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const cipherText = Buffer.from(payload.cipherText, "base64");
  if (iv.length !== IV_LENGTH || tag.length !== AUTH_TAG_LENGTH) {
    throw new Error("encrypted_email_invalid");
  }

  const decipher = createDecipheriv("aes-256-gcm", key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(cipherText),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function resolveEmailValue(input: {
  emailEncrypted?: unknown;
  email?: string | null;
}): string | null {
  const encrypted = parseEncryptedEmail(input.emailEncrypted);
  if (encrypted) {
    return decryptEmail(encrypted);
  }
  if (typeof input.email === "string") {
    const trimmed = input.email.trim();
    if (trimmed && isLikelyEmail(trimmed)) return trimmed;
  }
  return null;
}

export function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}


export function buildEmailFields(email: string) {
  const normalized = normalizeEmail(email);
  const emailHash = hashEmail(normalized);
  const emailEncrypted = encryptEmail(normalized);
  return {
    email: emailHash,
    emailHash,
    emailEncrypted,
  };
}
