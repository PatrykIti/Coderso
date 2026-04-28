import {
  createPopup,
  deletePopup,
  getPopup,
  listPopups,
  setPopupStatus,
  updatePopup,
  type PopupCreateInput,
  type PopupUpdateInput,
} from "../../services/popups/popupService";
import type { PopupStatus } from "../../services/popups/popupTypes";
import { ApiError } from "../errorHandler";
import type { RouteContext } from "../router";
import {
  popupCreateSchema,
  popupListQuerySchema,
  popupStatusSchema,
  popupUpdateSchema,
} from "../validation/popupSchemas";

export type PopupsRouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type PopupsRouteDeps = {
  requirePermission: (permission: string) => PopupsRouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export type Router = {
  get: (path: string, ...handlers: PopupsRouteHandler[]) => void;
  post: (path: string, ...handlers: PopupsRouteHandler[]) => void;
  patch: (path: string, ...handlers: PopupsRouteHandler[]) => void;
  delete: (path: string, ...handlers: PopupsRouteHandler[]) => void;
};

const parseNumber = (value: string | undefined) => {
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.floor(parsed) : undefined;
};

const normalizeListQuery = (query: Record<string, string | undefined>) => {
  const status =
    typeof query.status === "string" && query.status.trim().length > 0
      ? query.status.trim()
      : undefined;
  const search =
    typeof query.search === "string" && query.search.trim().length > 0
      ? query.search.trim()
      : undefined;
  const limit = parseNumber(query.limit);
  const offset = parseNumber(query.offset);

  return {
    ...(status ? { status } : {}),
    ...(search ? { search } : {}),
    ...(limit !== undefined ? { limit } : {}),
    ...(offset !== undefined ? { offset } : {}),
  };
};

export const mapPopupError = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "popup_not_found":
      return new ApiError("popup_not_found", "Popup not found", 404);
    case "popup_slug_exists":
      return new ApiError("popup_slug_exists", "Popup slug already exists", 409);
    default:
      if (error.message.startsWith("popup_")) {
        return new ApiError(error.message, "Invalid popup payload", 400);
      }
      return null;
  }
};

const withPopupErrors = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const mapped = mapPopupError(error);
    if (mapped) throw mapped;
    throw error;
  }
};

export function registerPopupsRoutes(router: Router, deps: PopupsRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/popups", requirePermission("popups:read"), async (ctx) => {
    return withPopupErrors(async () => {
      const query = normalizeListQuery(ctx.query);
      validate(popupListQuerySchema, query);
      const items = await listPopups(query as Parameters<typeof listPopups>[0]);
      return { items };
    });
  });

  router.get("/popups/:id", requirePermission("popups:read"), async (ctx) => {
    return withPopupErrors(async () => {
      const item = await getPopup(ctx.params.id);
      if (!item) throw new Error("popup_not_found");
      return item;
    });
  });

  router.post("/popups", requirePermission("popups:write"), async (ctx) => {
    return withPopupErrors(async () => {
      validate(popupCreateSchema, ctx.body ?? {});
      return createPopup((ctx.body ?? {}) as PopupCreateInput);
    });
  });

  router.patch("/popups/:id", requirePermission("popups:write"), async (ctx) => {
    return withPopupErrors(async () => {
      validate(popupUpdateSchema, ctx.body ?? {});
      const updated = await updatePopup(ctx.params.id, (ctx.body ?? {}) as PopupUpdateInput);
      if (!updated) throw new Error("popup_not_found");
      return updated;
    });
  });

  router.patch("/popups/:id/status", requirePermission("popups:write"), async (ctx) => {
    return withPopupErrors(async () => {
      const payload = ctx.body ?? {};
      validate(popupStatusSchema, payload);
      const status = (payload as { status: PopupStatus }).status;
      const updated = await setPopupStatus(ctx.params.id, status);
      if (!updated) throw new Error("popup_not_found");
      return updated;
    });
  });

  router.delete("/popups/:id", requirePermission("popups:write"), async (ctx) => {
    return withPopupErrors(async () => {
      const deleted = await deletePopup(ctx.params.id);
      if (!deleted) throw new Error("popup_not_found");
      return { ok: true };
    });
  });
}
