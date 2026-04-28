export const createBackupSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    kind: { type: "string", enum: ["manual", "scheduled"] },
  },
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
