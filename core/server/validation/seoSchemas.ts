import { seoAuditCheckIds } from "../../services/seo/seoTypes";

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
    targetType: { type: "string", enum: ["page", "entry"] },
    targetId: { type: "string" },
    checks: {
      type: "array",
      items: { type: "string", enum: [...seoAuditCheckIds] },
      minItems: 1,
      maxItems: seoAuditCheckIds.length,
      uniqueItems: true,
    },
  },
};
