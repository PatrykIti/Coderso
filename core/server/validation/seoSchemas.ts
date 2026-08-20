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

// TASK-493-04-L02: SEO search-performance read/sync/sitemap schemas. Each is
// reject-unknown (`additionalProperties: false`); date windows and the sitemap
// path are validated/clamped in the owning services, never duplicated here.
export const seoSearchPerformanceQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    targetId: { type: "string" },
    startDate: { type: "string" },
    endDate: { type: "string" },
    limit: { type: "number" },
  },
};

export const seoSyncSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    startDate: { type: "string" },
    endDate: { type: "string" },
  },
};

export const seoSitemapSubmitSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    sitemapPath: { type: "string" },
  },
};
