export const authLoginSchema = {
  type: "object",
  required: ["email", "password"],
  properties: {
    email: {
      type: "string",
      minLength: 3,
      pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
    },
    password: { type: "string", minLength: 8 },
    captchaToken: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const authVerifyOtpSchema = {
  type: "object",
  additionalProperties: false,
  oneOf: [
    {
      required: ["code"],
      properties: {
        code: { type: "string", minLength: 6 },
      },
    },
    {
      required: ["recoveryCode"],
      properties: {
        recoveryCode: { type: "string", minLength: 8 },
      },
    },
  ],
};

export const authResetSchema = {
  type: "object",
  required: ["email"],
  properties: {
    email: {
      type: "string",
      minLength: 3,
      pattern: "^[^\s@]+@[^\s@]+\.[^\s@]+$",
    },
    captchaToken: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};

export const authResetConfirmSchema = {
  type: "object",
  required: ["token", "password"],
  properties: {
    token: { type: "string", minLength: 32 },
    password: { type: "string", minLength: 8 },
  },
  additionalProperties: false,
};
