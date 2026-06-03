import {
  adminCursorQueryParamSchema,
  adminDateTimeQueryParamSchema,
  adminLimitQueryParamSchema,
  adminQueryTextParamSchema,
} from "./adminQuerySchemas";
export { accessLogExportRequestSchema } from "../../services/access/accessLogExportContract";

const uuidPattern = "^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$";

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

export const accessLogRevokeParamsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id"],
  properties: {
    id: { type: "string", pattern: uuidPattern },
  },
};

export const accessLogRevokeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["reason"],
  properties: {
    reason: { type: "string", enum: ["admin_manual_revoke"] },
  },
};
