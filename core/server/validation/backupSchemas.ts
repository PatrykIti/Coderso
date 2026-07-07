export const createBackupSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    kind: { type: "string", enum: ["manual", "scheduled"] },
    include: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      uniqueItems: true,
      items: { type: "string", enum: ["database", "media", "settings"] },
    },
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
  },
};
