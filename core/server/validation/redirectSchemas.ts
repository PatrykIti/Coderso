export const redirectCreateSchema = {
  type: "object",
  additionalProperties: false,
  required: ["fromPath", "toPath", "statusCode"],
  properties: {
    fromPath: { type: "string" },
    toPath: { type: "string" },
    statusCode: { type: "integer", enum: [301, 302, 307, 308] },
    enabled: { type: "boolean" },
  },
};

export const redirectUpdateSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    fromPath: { type: "string" },
    toPath: { type: "string" },
    statusCode: { type: "integer", enum: [301, 302, 307, 308] },
    enabled: { type: "boolean" },
  },
};
