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
    rangeDays: { type: "number", minimum: 1, maximum: 365 },
    type: { type: "string", enum: ["page", "entry"] },
  },
};

export const topContentExportQuerySchema = {
  type: "object",
  additionalProperties: false,
  required: ["limit", "rangeDays", "format"],
  properties: {
    limit: { type: "number", minimum: 1, maximum: 50 },
    rangeDays: { type: "number", minimum: 1, maximum: 365 },
    type: { type: "string", enum: ["page", "entry"] },
    format: { type: "string", enum: ["csv"] },
  },
};

// Traffic analytics read-side query schemas (TASK-483-04-L03). Domain
// clamps/normalizers stay in trafficAggregationService.ts and are never
// duplicated here.
export const trafficOverviewQuerySchema = {
  type: "object",
  additionalProperties: false,
  required: ["rangeDays"],
  properties: {
    rangeDays: { type: "number", minimum: 1, maximum: 365 },
  },
};

export const topPagesQuerySchema = {
  type: "object",
  additionalProperties: false,
  required: ["limit", "rangeDays"],
  properties: {
    limit: { type: "number", minimum: 1, maximum: 100 },
    rangeDays: { type: "number", minimum: 1, maximum: 365 },
  },
};

export const topPagesExportQuerySchema = {
  type: "object",
  additionalProperties: false,
  required: ["limit", "rangeDays", "format"],
  properties: {
    limit: { type: "number", minimum: 1, maximum: 100 },
    rangeDays: { type: "number", minimum: 1, maximum: 365 },
    format: { type: "string", enum: ["csv"] },
  },
};
