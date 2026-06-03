import {
  adminCursorQueryParamSchema,
  adminDateTimeQueryParamSchema,
  adminLimitQueryParamSchema,
  adminQueryTextParamSchema,
} from "./adminQuerySchemas";
export { auditExportRequestSchema } from "../../services/audit/auditExportContract";

export const auditLogQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    limit: adminLimitQueryParamSchema,
    q: adminQueryTextParamSchema,
    category: { type: "string", enum: ["authentication", "content", "system"] },
    severity: { type: "string", enum: ["info", "warning", "error"] },
    from: adminDateTimeQueryParamSchema,
    to: adminDateTimeQueryParamSchema,
    cursor: adminCursorQueryParamSchema,
  },
};
