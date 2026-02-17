export const formCreateSchema = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string" },
    slug: { type: "string" },
    status: { type: "string" },
    description: { type: ["string", "null"] },
    successMessage: { type: ["string", "null"] },
    successRedirectUrl: { type: ["string", "null"] },
  },
  additionalProperties: false,
};

export const formUpdateSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    slug: { type: "string" },
    status: { type: "string" },
    description: { type: ["string", "null"] },
    successMessage: { type: ["string", "null"] },
    successRedirectUrl: { type: ["string", "null"] },
  },
  additionalProperties: false,
};

export const formFieldsSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      id: { type: "string" },
      type: { type: "string" },
      label: { type: "string" },
      name: { type: "string" },
      required: { type: "boolean" },
      orderIndex: { type: "number" },
      settings: { type: "object" },
    },
    additionalProperties: true,
  },
};

export const formSubmissionSchema = {
  type: "object",
  required: ["data"],
  properties: {
    data: { type: "object" },
    captchaToken: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
};
