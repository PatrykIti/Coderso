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

export const userSettingsUpdateSchema = {
  type: "object",
  required: ["value"],
  properties: {
    value: {},
  },
  additionalProperties: false,
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
      anyOf: [{ type: "string" }, { type: "null" }, { type: "array", items: { type: "string" } }],
    },
    delivery: {
      type: "object",
      additionalProperties: false,
      properties: {
        accessMode: { enum: ["public", "internal"] },
      },
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
    quota: {
      type: "object",
      additionalProperties: false,
      properties: {
        totalBytes: { type: ["number", "null"] },
        planLabel: { type: ["string", "null"] },
      },
    },
  },
};

export const securitySettingsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    requestId: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        headerName: { type: "string" },
      },
    },
    csrf: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        headerName: { type: "string" },
        tokenTtlMinutes: { type: "number" },
      },
    },
    cors: {
      type: "object",
      additionalProperties: false,
      properties: {
        allowedOrigins: {
          anyOf: [{ type: "array", items: { type: "string" } }, { type: "string" }],
        },
        allowCredentials: { type: "boolean" },
        allowedMethods: {
          anyOf: [{ type: "array", items: { type: "string" } }, { type: "string" }],
        },
        allowedHeaders: {
          anyOf: [{ type: "array", items: { type: "string" } }, { type: "string" }],
        },
        maxAgeSeconds: { type: "number" },
      },
    },
    rateLimit: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        buckets: {
          type: "object",
          additionalProperties: false,
          properties: {
            auth: {
              type: "object",
              additionalProperties: false,
              properties: {
                windowSeconds: { type: "number" },
                maxRequests: { type: "number" },
              },
            },
            admin_read: {
              type: "object",
              additionalProperties: false,
              properties: {
                windowSeconds: { type: "number" },
                maxRequests: { type: "number" },
              },
            },
            admin_write: {
              type: "object",
              additionalProperties: false,
              properties: {
                windowSeconds: { type: "number" },
                maxRequests: { type: "number" },
              },
            },
            public_read: {
              type: "object",
              additionalProperties: false,
              properties: {
                windowSeconds: { type: "number" },
                maxRequests: { type: "number" },
              },
            },
            public_write: {
              type: "object",
              additionalProperties: false,
              properties: {
                windowSeconds: { type: "number" },
                maxRequests: { type: "number" },
              },
            },
            assistant: {
              type: "object",
              additionalProperties: false,
              properties: {
                windowSeconds: { type: "number" },
                maxRequests: { type: "number" },
              },
            },
          },
        },
        admin: {
          type: "object",
          additionalProperties: false,
          properties: {
            windowSeconds: { type: "number" },
            maxRequests: { type: "number" },
          },
        },
        auth: {
          type: "object",
          additionalProperties: false,
          properties: {
            windowSeconds: { type: "number" },
            maxRequests: { type: "number" },
          },
        },
      },
    },
    botProtection: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        provider: { enum: ["recaptcha_v3"] },
        siteKey: { type: ["string", "null"] },
        secretKey: { type: ["string", "null"] },
        thresholds: {
          type: "object",
          additionalProperties: false,
          properties: {
            login: { type: "number" },
            reset: { type: "number" },
            publicWrite: { type: "number" },
          },
        },
        enforceOnLocalhost: { type: "boolean" },
      },
    },
    headers: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        frameOptions: { enum: ["DENY", "SAMEORIGIN"] },
        contentTypeOptions: { type: "boolean" },
        referrerPolicy: { type: ["string", "null"] },
        permissionsPolicy: { type: ["string", "null"] },
        csp: { type: ["string", "null"] },
        hsts: { type: ["string", "null"] },
      },
    },
    validation: {
      type: "object",
      additionalProperties: false,
      properties: {
        rejectUnknownFields: { type: "boolean" },
      },
    },
    plugins: {
      type: "object",
      additionalProperties: false,
      properties: {
        safeMode: { type: "boolean" },
      },
    },
    session: {
      type: "object",
      additionalProperties: false,
      properties: {
        ttlDays: { type: "number" },
        maxPerUser: { type: "number" },
        singleSession: { type: "boolean" },
      },
    },
    loginAlerts: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        notifyOnNewDevice: { type: "boolean" },
        notifyOnNewLocation: { type: "boolean" },
      },
    },
  },
};
