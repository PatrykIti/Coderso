export const ipAllowlistCreateSchema = {
  type: "object",
  additionalProperties: false,
  required: ["cidr"],
  properties: {
    cidr: {
      type: "string",
      minLength: 3,
      maxLength: 64,
      pattern: "^(?:\\d{1,3}\\.){3}\\d{1,3}(?:/\\d{1,2})?$",
    },
    label: { type: "string", maxLength: 120 },
    description: { type: "string", maxLength: 500 },
  },
};
