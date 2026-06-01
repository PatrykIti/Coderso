import {
  adminCursorQueryParamSchema,
  adminDateTimeQueryParamSchema,
  adminLimitQueryParamSchema,
  adminQueryTextParamSchema,
} from "./adminQuerySchemas";

export const accessLogQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    limit: adminLimitQueryParamSchema,
    status: { type: "string", enum: ["success", "failed"] },
    q: adminQueryTextParamSchema,
    userId: { type: "string", minLength: 1, maxLength: 128 },
    method: { type: "string", minLength: 1, maxLength: 16 },
    ip: { type: "string", minLength: 1, maxLength: 128 },
    from: adminDateTimeQueryParamSchema,
    to: adminDateTimeQueryParamSchema,
    cursor: adminCursorQueryParamSchema,
  },
};
