const uuidPattern = "^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$";

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
