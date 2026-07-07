import { ApiError } from "../errorHandler";
import type { RouteContext, RouteHandler, Router } from "../router";
import {
  getDashboardLayoutForUser,
  resetDashboardLayoutForUser,
  saveDashboardLayoutForUser,
} from "../../services/dashboard/dashboardLayoutRepository";
import { DashboardLayoutError } from "../../services/dashboard/dashboardLayoutService";
import { getDashboardData } from "../../services/dashboard/dashboardService";
import {
  DASHBOARD_LAYOUT_INVALID,
  DASHBOARD_WIDGET_CONFIG_KIND_MISMATCH,
} from "../../services/dashboard/dashboardWidgetContract";
import {
  resolveSavedLayoutWidgetData,
  resolveWidgetDataBatch,
} from "../../services/dashboard/dashboardWidgetData";
import {
  dashboardLayoutSchema,
  dashboardWidgetDataRequestSchema,
} from "../validation/dashboardSchemas";

export type DashboardRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

const requireUserId = (ctx: RouteContext) => {
  if (!ctx.user?.id) {
    throw new ApiError("auth_required", "Authentication required", 401);
  }
  return ctx.user.id;
};

export function mapDashboardError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    if (error.code === "validation_error") {
      return new ApiError(
        DASHBOARD_LAYOUT_INVALID,
        "Invalid dashboard payload",
        400,
        error.details
      );
    }
    return error;
  }
  if (error instanceof DashboardLayoutError) {
    return new ApiError(error.code, "Invalid dashboard layout", 400);
  }
  if (error instanceof Error) {
    if (
      error.message === DASHBOARD_LAYOUT_INVALID ||
      error.message === DASHBOARD_WIDGET_CONFIG_KIND_MISMATCH
    ) {
      return new ApiError(error.message, "Invalid dashboard payload", 400);
    }
  }
  return new ApiError("dashboard_error", "Dashboard request failed", 500);
}

const withDashboardErrors =
  (handler: RouteHandler): RouteHandler =>
  async (ctx) => {
    try {
      return await handler(ctx);
    } catch (error) {
      throw mapDashboardError(error);
    }
  };

export function registerDashboardRoutes(router: Router, deps: DashboardRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/dashboard", requirePermission("content:read"), async () => {
    return getDashboardData();
  });

  router.get(
    "/dashboard/layout",
    requirePermission("content:read"),
    withDashboardErrors(async (ctx) => {
      return getDashboardLayoutForUser(requireUserId(ctx));
    })
  );

  router.put(
    "/dashboard/layout",
    requirePermission("dashboard:write"),
    withDashboardErrors(async (ctx) => {
      validate(dashboardLayoutSchema, ctx.body);
      return saveDashboardLayoutForUser(requireUserId(ctx), ctx.body);
    })
  );

  router.post(
    "/dashboard/layout/reset",
    requirePermission("dashboard:write"),
    withDashboardErrors(async (ctx) => {
      return resetDashboardLayoutForUser(requireUserId(ctx));
    })
  );

  router.get(
    "/dashboard/widget-data",
    requirePermission("content:read"),
    withDashboardErrors(async (ctx) => {
      return resolveSavedLayoutWidgetData(requireUserId(ctx));
    })
  );

  router.post(
    "/dashboard/widget-data",
    requirePermission("content:read"),
    withDashboardErrors(async (ctx) => {
      validate(dashboardWidgetDataRequestSchema, ctx.body);
      return resolveWidgetDataBatch(ctx.body);
    })
  );
}
