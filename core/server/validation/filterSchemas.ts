export const listingFilterPreviewSchema = {
  type: "object",
  required: ["listingQueryId"],
  properties: {
    listingQueryId: {
      type: "string",
      minLength: 1,
      maxLength: 64,
      pattern:
        "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
    },
    queryString: {
      type: "string",
      minLength: 0,
      maxLength: 4000,
    },
  },
  additionalProperties: false,
} as const;

export const publicSearchRequestSchema = {
  type: "object",
  required: ["q"],
  properties: {
    q: {
      type: "string",
      minLength: 1,
      maxLength: 160,
    },
    limit: {
      type: "integer",
      minimum: 1,
      maximum: 50,
    },
    sources: {
      type: "string",
      minLength: 1,
      maxLength: 120,
      pattern: "^[a-zA-Z,\\s-]+$",
    },
  },
  additionalProperties: false,
} as const;
