export const seoUpdateSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    canonicalUrl: { type: "string" },
    robots: { type: "string" },
  },
};

export const seoAuditSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    targetType: { type: "string" },
    targetId: { type: "string" },
  },
};
