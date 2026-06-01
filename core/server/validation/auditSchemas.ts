import { adminLimitQueryParamSchema } from "./adminQuerySchemas";

export const auditLogQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    limit: adminLimitQueryParamSchema,
  },
};
