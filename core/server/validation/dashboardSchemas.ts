import {
  DASHBOARD_MAX_WIDGETS,
  dashboardLayoutSchema,
} from "../../services/dashboard/dashboardWidgetContract";
import { DASHBOARD_WIDGET_TYPES } from "../../services/dashboard/dashboardTypes";

export { dashboardLayoutSchema };

export const dashboardWidgetDataRequestSchema = {
  type: "object",
  required: ["widgets"],
  properties: {
    widgets: {
      type: "array",
      maxItems: DASHBOARD_MAX_WIDGETS,
      items: {
        type: "object",
        required: ["id", "type"],
        properties: {
          id: { type: "string", minLength: 1, maxLength: 120 },
          type: { type: "string", enum: [...DASHBOARD_WIDGET_TYPES] },
          title: { type: "string", minLength: 1, maxLength: 120 },
          config: { type: "object" },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
} as const;
