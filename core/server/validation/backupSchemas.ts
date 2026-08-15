export const createBackupSchema = {
  type: "object",
  additionalProperties: false,
  // Every v2 `.cbk` is encrypted (02) — the passphrase is REQUIRED. Real length
  // policy is enforced by 02's normalizeBackupPassphrase (12–256 chars).
  required: ["passphrase"],
  properties: {
    kind: { type: "string", enum: ["manual", "scheduled"] },
    include: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      uniqueItems: true,
      items: { type: "string", enum: ["database", "media", "settings", "users"] },
    },
    passphrase: { type: "string", minLength: 1 },
  },
};

export const restoreBackupSchema = {
  type: "object",
  additionalProperties: false,
  required: ["confirm"],
  properties: {
    confirm: { type: "boolean", enum: [true] },
  },
};

// Multipart import (TASK-511-05). Scalars arrive as STRINGS from req.formData()
// (requestBody.ts:24), so `confirm`/`restoreUsers` are string enums mirrored from
// 484's restoreBackupSchema (confirm enum [true]): an absent or "false" confirm is
// rejected here as validation_error (400) exactly like the 484 route. The file is
// a Web File/Blob ({ type: "object" }) guarded at runtime by isImportUploadFile.
export const importBackupSchema = {
  type: "object",
  additionalProperties: false,
  required: ["file", "passphrase", "confirm"],
  properties: {
    file: { type: "object" },
    passphrase: { type: "string", minLength: 1 },
    confirm: { type: "string", enum: ["true"] },
    restoreUsers: { type: "string", enum: ["true", "false"] },
  },
};

export const backupListQuerySchema = {
  type: "object",
  additionalProperties: false,
  required: ["page", "limit"],
  properties: {
    page: { type: "integer", minimum: 1, maximum: 100000 },
    limit: { type: "integer", minimum: 1, maximum: 100 },
    query: { type: "string", maxLength: 200 },
  },
};

export const pruneBackupsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {},
};

export const scheduleUpdateSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    enabled: { type: "boolean" },
    frequency: { type: "string", enum: ["daily", "weekly", "monthly"] },
    retentionDays: { type: "integer", minimum: 1, maximum: 3650 },
    storageDriver: { type: "string", enum: ["local", "s3", "azure"] },
    include: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      uniqueItems: true,
      items: { type: "string", enum: ["database", "media", "settings", "users"] },
    },
  },
};
