export const overviewQuerySchema = {
  type: "object",
  additionalProperties: false,
  required: ["rangeDays"],
  properties: {
    rangeDays: { type: "number", minimum: 1, maximum: 365 },
  },
};

export const topContentQuerySchema = {
  type: "object",
  additionalProperties: false,
  required: ["limit"],
  properties: {
    limit: { type: "number", minimum: 1, maximum: 50 },
    type: { type: "string", enum: ["page", "entry"] },
  },
};
