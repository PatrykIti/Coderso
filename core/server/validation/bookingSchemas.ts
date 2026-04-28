const uuidPattern =
  "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$";
const dateTimePattern =
  "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?(?:Z|[+-]\\d{2}:\\d{2})$";

export const bookingResourceCreateSchema = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string", minLength: 1, maxLength: 160 },
    slug: { type: ["string", "null"], minLength: 1, maxLength: 160 },
    type: { enum: ["staff", "bay", "tool", "vehicle", "other"] },
    status: { enum: ["active", "inactive"] },
    timezone: { type: "string", minLength: 1, maxLength: 120 },
    capacity: { type: "integer", minimum: 1, maximum: 10000 },
    settings: { type: "object" },
  },
  additionalProperties: false,
} as const;

export const bookingResourceUpdateSchema = {
  type: "object",
  minProperties: 1,
  properties: {
    name: { type: "string", minLength: 1, maxLength: 160 },
    slug: { type: ["string", "null"], minLength: 1, maxLength: 160 },
    type: { enum: ["staff", "bay", "tool", "vehicle", "other"] },
    status: { enum: ["active", "inactive"] },
    timezone: { type: "string", minLength: 1, maxLength: 120 },
    capacity: { type: "integer", minimum: 1, maximum: 10000 },
    settings: { type: "object" },
  },
  additionalProperties: false,
} as const;

export const bookingServiceCreateSchema = {
  type: "object",
  required: ["name", "durationMinutes"],
  properties: {
    name: { type: "string", minLength: 1, maxLength: 160 },
    slug: { type: ["string", "null"], minLength: 1, maxLength: 160 },
    status: { enum: ["active", "inactive"] },
    description: { type: ["string", "null"], maxLength: 1000 },
    durationMinutes: { type: "integer", minimum: 5, maximum: 1440 },
    bufferBeforeMinutes: { type: "integer", minimum: 0, maximum: 1440 },
    bufferAfterMinutes: { type: "integer", minimum: 0, maximum: 1440 },
    priceCents: { type: ["integer", "null"], minimum: 0, maximum: 1000000000 },
    currency: { type: ["string", "null"], minLength: 3, maxLength: 8 },
    settings: { type: "object" },
  },
  additionalProperties: false,
} as const;

export const bookingServiceUpdateSchema = {
  type: "object",
  minProperties: 1,
  properties: {
    name: { type: "string", minLength: 1, maxLength: 160 },
    slug: { type: ["string", "null"], minLength: 1, maxLength: 160 },
    status: { enum: ["active", "inactive"] },
    description: { type: ["string", "null"], maxLength: 1000 },
    durationMinutes: { type: "integer", minimum: 5, maximum: 1440 },
    bufferBeforeMinutes: { type: "integer", minimum: 0, maximum: 1440 },
    bufferAfterMinutes: { type: "integer", minimum: 0, maximum: 1440 },
    priceCents: { type: ["integer", "null"], minimum: 0, maximum: 1000000000 },
    currency: { type: ["string", "null"], minLength: 3, maxLength: 8 },
    settings: { type: "object" },
  },
  additionalProperties: false,
} as const;

export const bookingServiceResourcesSchema = {
  type: "array",
  maxItems: 300,
  items: {
    type: "object",
    required: ["resourceId"],
    properties: {
      resourceId: { type: "string", pattern: uuidPattern },
      isRequired: { type: "boolean" },
    },
    additionalProperties: false,
  },
} as const;

export const bookingSchedulesSchema = {
  type: "array",
  maxItems: 200,
  items: {
    type: "object",
    required: ["dayOfWeek", "startMinute", "endMinute"],
    properties: {
      dayOfWeek: { type: "integer", minimum: 0, maximum: 6 },
      startMinute: { type: "integer", minimum: 0, maximum: 1439 },
      endMinute: { type: "integer", minimum: 1, maximum: 1440 },
      timezone: { type: "string", minLength: 1, maxLength: 120 },
      isAvailable: { type: "boolean" },
    },
    additionalProperties: false,
  },
} as const;

export const bookingBlackoutCreateSchema = {
  type: "object",
  required: ["startsAt", "endsAt"],
  properties: {
    resourceId: { type: ["string", "null"], pattern: uuidPattern },
    startsAt: { type: "string", pattern: dateTimePattern },
    endsAt: { type: "string", pattern: dateTimePattern },
    reason: { type: ["string", "null"], maxLength: 1000 },
  },
  additionalProperties: false,
} as const;

export const bookingSlotPreviewSchema = {
  type: "object",
  required: ["serviceId", "resourceId", "date"],
  properties: {
    serviceId: { type: "string", pattern: uuidPattern },
    resourceId: { type: "string", pattern: uuidPattern },
    date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    timezone: { type: "string", minLength: 1, maxLength: 120 },
    intervalMinutes: { type: "integer", minimum: 5, maximum: 180 },
  },
  additionalProperties: false,
} as const;

export const bookingReservationCreateSchema = {
  type: "object",
  required: ["serviceId", "resourceId", "startsAt", "endsAt", "customerName"],
  properties: {
    serviceId: { type: "string", pattern: uuidPattern },
    resourceId: { type: "string", pattern: uuidPattern },
    startsAt: { type: "string", pattern: dateTimePattern },
    endsAt: { type: "string", pattern: dateTimePattern },
    timezone: { type: "string", minLength: 1, maxLength: 120 },
    customerName: { type: "string", minLength: 1, maxLength: 200 },
    customerEmail: { type: ["string", "null"], maxLength: 320 },
    customerPhone: { type: ["string", "null"], maxLength: 64 },
    notes: { type: ["string", "null"], maxLength: 2000 },
    metadata: { type: "object" },
  },
  additionalProperties: false,
} as const;

export const bookingReservationStatusSchema = {
  type: "object",
  required: ["status"],
  properties: {
    status: {
      enum: ["pending", "confirmed", "cancelled", "completed", "no_show"],
    },
  },
  additionalProperties: false,
} as const;

export const bookingPublicSlotQuerySchema = {
  type: "object",
  required: ["serviceId", "resourceId", "date"],
  properties: {
    serviceId: { type: "string", pattern: uuidPattern },
    resourceId: { type: "string", pattern: uuidPattern },
    date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    runtimeToken: { type: "string", minLength: 1, maxLength: 1024 },
    timezone: { type: "string", minLength: 1, maxLength: 120 },
    intervalMinutes: { type: "integer", minimum: 5, maximum: 180 },
  },
  additionalProperties: false,
} as const;

export const bookingPublicReservationSchema = {
  type: "object",
  required: [
    "serviceId",
    "resourceId",
    "startsAt",
    "endsAt",
    "customerName",
  ],
  properties: {
    serviceId: { type: "string", pattern: uuidPattern },
    resourceId: { type: "string", pattern: uuidPattern },
    startsAt: { type: "string", pattern: dateTimePattern },
    endsAt: { type: "string", pattern: dateTimePattern },
    timezone: { type: "string", minLength: 1, maxLength: 120 },
    customerName: { type: "string", minLength: 1, maxLength: 200 },
    customerEmail: { type: ["string", "null"], maxLength: 320 },
    customerPhone: { type: ["string", "null"], maxLength: 64 },
    notes: { type: ["string", "null"], maxLength: 2000 },
    metadata: { type: "object" },
    captchaToken: { type: "string", minLength: 1, maxLength: 4096 },
    formNonce: { type: "string", minLength: 1, maxLength: 1024 },
  },
  additionalProperties: false,
} as const;
