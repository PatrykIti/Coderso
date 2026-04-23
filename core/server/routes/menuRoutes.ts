import {
  createMenu,
  deleteMenu,
  getMenuWithItems,
  listMenus,
  replaceMenuItems,
  updateMenu,
  type MenuItemInput,
} from "../../services/menus/menuService";
import { ApiError } from "../errorHandler";
import {
  menuCreateSchema,
  menuItemsSchema,
  menuUpdateSchema,
} from "../validation/menuSchemas";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
};

export type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type Router = {
  get: (path: string, ...handlers: RouteHandler[]) => void;
  post: (path: string, ...handlers: RouteHandler[]) => void;
  patch: (path: string, ...handlers: RouteHandler[]) => void;
  put: (path: string, ...handlers: RouteHandler[]) => void;
  delete: (path: string, ...handlers: RouteHandler[]) => void;
};

export type MenuRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

const mapMenuError = (error: unknown) => {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    const dbError = error as {
      code: string;
      constraint?: string;
      detail?: string;
    };
    if (dbError.code === "23503") {
      if (dbError.constraint?.includes("menu_items_page_id")) {
        return new ApiError(
          "menu_item_page_missing",
          "Menu item references a missing page",
          400
        );
      }
      if (dbError.constraint?.includes("menu_items_parent_id")) {
        return new ApiError(
          "menu_item_parent_missing",
          "Menu item references a missing parent",
          400
        );
      }
      return new ApiError(
        "menu_item_reference_invalid",
        "Menu item references an invalid resource",
        400
      );
    }
    if (dbError.code === "23505") {
      return new ApiError("menu_item_id_duplicate", "Duplicate menu item id", 400);
    }
    if (dbError.code === "23502") {
      return new ApiError(
        "menu_item_missing_field",
        "Menu item missing required field",
        400
      );
    }
    if (dbError.code === "42P01") {
      return new ApiError(
        "menu_items_table_missing",
        "Menu items table is missing",
        500,
        { detail: dbError.detail }
      );
    }
    if (dbError.code === "22P02") {
      return new ApiError(
        "menu_item_invalid_format",
        "Menu item contains invalid data",
        400
      );
    }
  }

  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "menu_not_found":
      return new ApiError("menu_not_found", "Menu not found", 404);
    case "menu_items_invalid":
      return new ApiError("menu_items_invalid", "Menu items invalid", 400);
    case "menu_item_label_required":
      return new ApiError(
        "menu_item_label_required",
        "Menu item label is required",
        400
      );
    case "menu_item_link_invalid":
      return new ApiError(
        "menu_item_link_invalid",
        "Menu item must link to a page or URL",
        400
      );
    case "menu_item_id_duplicate":
      return new ApiError("menu_item_id_duplicate", "Duplicate menu item id", 400);
    case "menu_items_cycle":
      return new ApiError("menu_items_cycle", "Menu items contain a cycle", 400);
    case "menu_item_page_missing":
      return new ApiError(
        "menu_item_page_missing",
        "Menu item references a missing page",
        400
      );
    default:
      return null;
  }
};

const withMenuErrors = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch (error) {
    const mapped = mapMenuError(error);
    if (mapped) throw mapped;
    if (process.env.NODE_ENV !== "production" && error instanceof Error) {
      throw new ApiError("menu_unexpected_error", error.message, 500);
    }
    throw error;
  }
};

export function registerMenuRoutes(router: Router, deps: MenuRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/menus", requirePermission("menus:read"), async () => {
    return withMenuErrors(() => listMenus());
  });

  router.post("/menus", requirePermission("menus:write"), async (ctx) => {
    return withMenuErrors(async () => {
      validate(menuCreateSchema, ctx.body);
      const body = ctx.body as {
        name: string;
        location?: string | null;
        status?: "draft" | "published";
      };
      return createMenu({
        name: body.name,
        location: body.location ?? null,
        status: body.status,
      });
    });
  });

  router.get("/menus/:id", requirePermission("menus:read"), async (ctx) => {
    return withMenuErrors(async () => {
      const menu = await getMenuWithItems(ctx.params.id);
      if (!menu) throw new Error("menu_not_found");
      return menu;
    });
  });

  router.patch(
    "/menus/:id",
    requirePermission("menus:write"),
    async (ctx) => {
      return withMenuErrors(async () => {
        validate(menuUpdateSchema, ctx.body);
        const body = ctx.body as {
          name?: string;
          location?: string | null;
          status?: "draft" | "published";
        };
        const updated = await updateMenu(ctx.params.id, body);
        if (!updated) throw new Error("menu_not_found");
        return updated;
      });
    }
  );

  router.put(
    "/menus/:id/items",
    requirePermission("menus:write"),
    async (ctx) => {
      return withMenuErrors(async () => {
        validate(menuItemsSchema, ctx.body);
        const body = ctx.body as { items: MenuItemInput[] };
        await replaceMenuItems(ctx.params.id, body.items);
        return { ok: true };
      });
    }
  );

  router.delete(
    "/menus/:id",
    requirePermission("menus:write"),
    async (ctx) => {
      return withMenuErrors(async () => {
        const removed = await deleteMenu(ctx.params.id);
        if (!removed) throw new Error("menu_not_found");
        return { ok: true };
      });
    }
  );
}
