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
      additionalProperties: false,
      required: [
        "name",
        "contentTypeId",
        "contentTypeSlug",
        "status",
        "titlePattern",
        "settings",
        "bindings",
      ],
      properties: {
        // TASK-580-03: the write envelope accepts both the retained v1 shape
        // (schemaVersion 1, `blocks`) and the v2 shape (schemaVersion 2,
        // `sections`). The write service stays authoritative: v1 payloads fail
        // closed there with `detail_page_legacy_v1_invalid`, while v2
        // documents normalize through the shared section/block normalizers.
        // `schemaVersion` stays optional so legacy docs without it remain
        // shape-valid at the envelope and are rejected by the service.
        schemaVersion: { enum: [1, 2] },
        id: { type: "string", pattern: uuidPattern },
        name: { type: "string", minLength: 1 },
        contentTypeId: { type: "string", pattern: uuidPattern },
        contentTypeSlug: { type: "string", minLength: 1 },
        status: { enum: ["draft", "published"] },
        titlePattern: { type: "string", minLength: 1 },
        settings: { type: "object" },
        blocks: { type: "array" },
        sections: { type: "array" },
        bindings: { type: "array" },
        related: { type: "array" },
        seo: { type: "object" },
      },
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
