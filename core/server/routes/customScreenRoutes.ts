import { ApiError } from "../errorHandler";
import type { RouteContext } from "../router";
import {
  createCustomScreen,
  deleteCustomScreen,
  getScreenEntryPresentationOverrides,
  getCustomScreen,
  listCustomScreens,
  normalizeScreenEntryPresentationOverrideReplacePayload,
  saveScreenEntryPresentationOverrides,
  screenEntryPresentationOverrideReplaceSchema,
  updateCustomScreen,
  type CustomScreenCreateInput,
  type CustomScreenUpdateInput,
} from "../../services/customScreens/customScreenService";
import {
  customScreenCreateSchema,
  customScreenUpdateSchema,
} from "../validation/customScreenSchemas";
import { CustomScreenDefinitionError } from "../../services/customScreens/customScreenSchemas";

export { CustomScreenDefinitionError };

export type CustomScreenRouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type CustomScreenRouteDeps = {
  requirePermission: (permission: string) => CustomScreenRouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export type Router = {
  get: (path: string, ...handlers: CustomScreenRouteHandler[]) => void;
  post: (path: string, ...handlers: CustomScreenRouteHandler[]) => void;
  patch: (path: string, ...handlers: CustomScreenRouteHandler[]) => void;
  delete: (path: string, ...handlers: CustomScreenRouteHandler[]) => void;
};

export const mapCustomScreenError = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "custom_screen_not_found":
      return new ApiError("custom_screen_not_found", "Custom screen not found", 404);
    case "custom_screen_invalid":
      return new ApiError("custom_screen_invalid", "Custom screen payload is invalid", 400);
    case "custom_screen_status_invalid":
      return new ApiError("custom_screen_status_invalid", "Custom screen status is invalid", 400);
    case "custom_screen_definition_invalid": {
      const fields = error instanceof CustomScreenDefinitionError ? error.fields : undefined;
      return new ApiError(
        "custom_screen_definition_invalid",
        "Custom screen definition is invalid", // BYTE-FROZEN — field names ride error.details
        400,
        fields?.length ? { fields } : undefined
      );
    }
    case "custom_screen_legacy_write_unsupported":
      return new ApiError(
        "custom_screen_legacy_write_unsupported",
        "Custom screen writes must use the V4 definition contract",
        400
      );
    case "custom_screen_override_invalid":
      return new ApiError(
        "custom_screen_override_invalid",
        "Custom screen presentation override payload is invalid",
        400
      );
    case "custom_screen_override_not_found":
      return new ApiError(
        "custom_screen_override_not_found",
        "Custom screen presentation override target was not found",
        404
      );
    case "custom_screen_override_conflict":
      return new ApiError(
        "custom_screen_override_conflict",
        "Custom screen presentation override targets must be unique",
        409
      );
    default:
      return null;
  }
};

const withCustomScreenErrors = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const mapped = mapCustomScreenError(error);
    if (mapped) throw mapped;
    throw error;
  }
};

export function registerCustomScreenRoutes(router: Router, deps: CustomScreenRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/custom-screens", requirePermission("content:read"), async () => {
    return withCustomScreenErrors(async () => {
      const items = await listCustomScreens();
      return { items };
    });
  });

  router.get("/custom-screens/:id", requirePermission("content:read"), async (ctx) => {
    return withCustomScreenErrors(async () => {
      const screen = await getCustomScreen(ctx.params.id);
      if (!screen) throw new Error("custom_screen_not_found");
      return screen;
    });
  });

  router.post("/custom-screens", requirePermission("content:write"), async (ctx) => {
    return withCustomScreenErrors(async () => {
      validate(customScreenCreateSchema, ctx.body ?? {});
      return createCustomScreen(ctx.body as CustomScreenCreateInput);
    });
  });

  router.patch("/custom-screens/:id", requirePermission("content:write"), async (ctx) => {
    return withCustomScreenErrors(async () => {
      validate(customScreenUpdateSchema, ctx.body ?? {});
      const updated = await updateCustomScreen(ctx.params.id, ctx.body as CustomScreenUpdateInput);
      if (!updated) throw new Error("custom_screen_not_found");
      return updated;
    });
  });

  router.get(
    "/custom-screens/:screenId/entries/:entryId/overrides",
    requirePermission("content:read"),
    async (ctx) => {
      return withCustomScreenErrors(async () => ({
        overrides: await getScreenEntryPresentationOverrides({
          screenId: ctx.params.screenId,
          entryId: ctx.params.entryId,
        }),
      }));
    }
  );

  router.patch(
    "/custom-screens/:screenId/entries/:entryId/overrides",
    requirePermission("content:write"),
    async (ctx) => {
      return withCustomScreenErrors(async () => {
        validate(screenEntryPresentationOverrideReplaceSchema, ctx.body ?? {});
        const body = normalizeScreenEntryPresentationOverrideReplacePayload(ctx.body ?? {});
        const actorId = ctx.user?.id;
        if (!actorId) throw new Error("custom_screen_override_invalid");
        return {
          overrides: await saveScreenEntryPresentationOverrides({
            screenId: ctx.params.screenId,
            entryId: ctx.params.entryId,
            overrides: body.overrides,
            actorId,
          }),
        };
      });
    }
  );

  router.delete("/custom-screens/:id", requirePermission("content:write"), async (ctx) => {
    return withCustomScreenErrors(async () => {
      const deleted = await deleteCustomScreen(ctx.params.id);
      if (!deleted) throw new Error("custom_screen_not_found");
      return { ok: true };
    });
  });
}
