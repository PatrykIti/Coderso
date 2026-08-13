import { popupStatuses } from "../../services/popups/popupTypes";

const slugPattern = "^[a-z0-9]+(?:-[a-z0-9]+)*$";

export const popupTriggerSchema = {
  anyOf: [
    {
      type: "object",
      required: ["type", "delaySeconds"],
      properties: {
        type: { const: "time_delay" },
        delaySeconds: { type: "integer", minimum: 0, maximum: 3600 },
      },
      additionalProperties: false,
    },
    {
      type: "object",
      required: ["type", "percent"],
      properties: {
        type: { const: "scroll_depth" },
        percent: { type: "integer", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
    {
      type: "object",
      required: ["type"],
      properties: {
        type: { const: "exit_intent" },
      },
      additionalProperties: false,
    },
    {
      type: "object",
      required: ["type", "selector"],
      properties: {
        type: { const: "cta_click" },
        selector: { type: "string", minLength: 1, maxLength: 240 },
      },
      additionalProperties: false,
    },
  ],
} as const;

export const popupTargetingSchema = {
  type: "object",
  required: ["includePaths", "excludePaths", "audience"],
  properties: {
    includePaths: {
      type: "array",
      maxItems: 200,
      items: { type: "string", maxLength: 500 },
    },
    excludePaths: {
      type: "array",
      maxItems: 200,
      items: { type: "string", maxLength: 500 },
    },
    audience: { enum: ["all", "logged_in", "logged_out"] },
  },
  additionalProperties: false,
} as const;

export const popupFrequencySchema = {
  type: "object",
  required: ["strategy"],
  properties: {
    strategy: { enum: ["always", "session_once", "daily_once"] },
    cooldownMinutes: { type: ["integer", "null"], minimum: 0, maximum: 43200 },
  },
  additionalProperties: false,
} as const;

export const popupContentSchema = {
  type: "object",
  properties: {
    title: { type: ["string", "null"], maxLength: 200 },
    body: { type: ["string", "null"], maxLength: 10000 },
    templateId: { type: ["string", "null"], maxLength: 128 },
    ctaLabel: { type: ["string", "null"], maxLength: 120 },
    ctaHref: { type: ["string", "null"], maxLength: 500 },
  },
  additionalProperties: false,
} as const;

export const popupSettingsSchema = {
  type: "object",
  properties: {
    placement: { enum: ["center", "bottom_right", "top_banner"] },
    dismissible: { type: "boolean" },
    showOverlay: { type: "boolean" },
  },
  additionalProperties: false,
} as const;

const popupBaseProperties = {
  name: { type: "string", minLength: 1, maxLength: 160 },
  slug: {
    type: ["string", "null"],
    minLength: 1,
    maxLength: 160,
    pattern: slugPattern,
  },
  status: { enum: popupStatuses },
  trigger: popupTriggerSchema,
  targeting: popupTargetingSchema,
  frequency: popupFrequencySchema,
  content: popupContentSchema,
  settings: popupSettingsSchema,
} as const;

export const popupCreateSchema = {
  type: "object",
  required: ["name", "trigger", "targeting", "frequency", "content", "settings"],
  properties: popupBaseProperties,
  additionalProperties: false,
} as const;

export const popupUpdateSchema = {
  type: "object",
  minProperties: 1,
  properties: popupBaseProperties,
  additionalProperties: false,
} as const;

export const popupStatusSchema = {
  type: "object",
  required: ["status"],
  properties: {
    status: { enum: popupStatuses },
  },
  additionalProperties: false,
} as const;

export const popupListQuerySchema = {
  type: "object",
  properties: {
    status: { enum: popupStatuses },
    search: { type: "string", maxLength: 160 },
    limit: { type: "integer", minimum: 1, maximum: 200 },
    offset: { type: "integer", minimum: 0, maximum: 5000 },
  },
  additionalProperties: false,
} as const;

// Owned by the domain/service contract module (TASK-486-01-L01); re-exported
// here so routes import the public query schema from one validation surface.
export { popupPublicQuerySchema } from "../../services/popups/popupPublicContract";
