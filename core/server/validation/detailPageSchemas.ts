const uuidPattern = "^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$";

export const detailPageIdParamsSchema = {
  type: "object",
  required: ["id"],
  additionalProperties: false,
  properties: {
    id: {
      type: "string",
      pattern: uuidPattern,
    },
  },
};

export const detailPageRevisionParamsSchema = {
  type: "object",
  required: ["id", "revisionId"],
  additionalProperties: false,
  properties: {
    id: {
      type: "string",
      pattern: uuidPattern,
    },
    revisionId: {
      type: "string",
      pattern: uuidPattern,
    },
  },
};

export const detailPageListQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    contentTypeId: {
      type: "string",
      pattern: uuidPattern,
    },
  },
};

const detailPageDocumentEnvelopeSchema = {
  type: "object",
  required: ["document"],
  additionalProperties: false,
  properties: {
    document: {
      type: "object",
    },
  },
};

export const detailPageCreateSchema = detailPageDocumentEnvelopeSchema;
export const detailPageUpdateSchema = detailPageDocumentEnvelopeSchema;

export const detailPagePreviewSchema = {
  type: "object",
  required: ["sampleEntryId"],
  additionalProperties: false,
  properties: {
    sampleEntryId: {
      type: "string",
      pattern: uuidPattern,
    },
    ttlMinutes: { type: "number", minimum: 1, maximum: 120 },
  },
};

export const detailPageAutosaveSchema = detailPageDocumentEnvelopeSchema;

export const detailPageEmptyLifecycleSchema = {
  type: "object",
  additionalProperties: false,
  properties: {},
};
