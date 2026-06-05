export const emailSettingsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    provider: { enum: ["smtp", "resend"] },
    smtp: {
      type: "object",
      additionalProperties: false,
      properties: {
        host: { type: ["string", "null"] },
        port: { type: ["number", "null"] },
        secure: { type: ["boolean", "null"] },
        user: { type: ["string", "null"] },
        password: { type: ["string", "null"] },
      },
    },
    from: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: ["string", "null"] },
        email: { type: ["string", "null"] },
      },
    },
  },
};

export const emailTestSchema = {
  type: "object",
  required: ["to"],
  properties: {
    to: { type: "string" },
  },
  additionalProperties: false,
};
