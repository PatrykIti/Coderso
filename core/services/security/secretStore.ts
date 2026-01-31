import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const KEY_LENGTH = 32;
const IV_LENGTH = 12;

export type EncryptedSecret = {
  v: 1;
  iv: string;
  tag: string;
  cipherText: string;
};

function resolveKeyFromEnv(): Buffer {
  const raw = process.env.MEDIA_SECRET_MASTER_KEY;
  if (!raw) {
    throw new Error("secret_master_key_missing");
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("secret_master_key_missing");
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

  throw new Error("secret_master_key_invalid");
}

export function hasValidSecretMasterKey() {
  try {
    resolveKeyFromEnv();
    return true;
  } catch {
    return false;
  }
}

export function isEncryptedSecret(input: unknown): input is EncryptedSecret {
  if (!input || typeof input !== "object") return false;
  const value = input as EncryptedSecret;
  return (
    value.v === 1 &&
    typeof value.iv === "string" &&
    typeof value.tag === "string" &&
    typeof value.cipherText === "string"
  );
}

export function encryptSecret(plain: string): EncryptedSecret {
  const key = resolveKeyFromEnv();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plain, "utf8")),
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

export function decryptSecret(payload: EncryptedSecret): string {
  const key = resolveKeyFromEnv();
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const cipherText = Buffer.from(payload.cipherText, "base64");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(cipherText),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
