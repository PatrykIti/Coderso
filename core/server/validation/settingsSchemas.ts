export const settingsUpdateSchema = {
  type: "object",
  required: ["value"],
  properties: {
    value: {},
  },
  additionalProperties: false,
};

export const settingsBulkSchema = {
  type: "object",
  minProperties: 1,
  additionalProperties: true,
};

export const storageSettingsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    driver: { enum: ["local", "s3", "azure"] },
    local: {
      type: "object",
      additionalProperties: false,
      properties: {
        dir: { type: ["string", "null"] },
      },
    },
    publicBaseUrl: { type: ["string", "null"] },
    maxSizeBytes: { type: ["number", "null"] },
    allowedMime: {
      anyOf: [
        { type: "string" },
        { type: "null" },
        { type: "array", items: { type: "string" } },
      ],
    },
    s3: {
      type: "object",
      additionalProperties: false,
      properties: {
        bucket: { type: ["string", "null"] },
        region: { type: ["string", "null"] },
        endpoint: { type: ["string", "null"] },
        accessKey: { type: ["string", "null"] },
        secretKey: { type: ["string", "null"] },
      },
    },
    azure: {
      type: "object",
      additionalProperties: false,
      properties: {
        container: { type: ["string", "null"] },
        account: { type: ["string", "null"] },
        key: { type: ["string", "null"] },
        connectionString: { type: ["string", "null"] },
      },
    },
  },
};
