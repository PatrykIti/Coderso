import {
  createMenu,
  deleteMenu,
  getMenuWithItems,
  listMenus,
  replaceMenuItems,
  updateMenu,
  type MenuItemInput,
} from "../../services/menus/menuService";
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

export function registerMenuRoutes(router: Router, deps: MenuRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/menus", requirePermission("menus:read"), async () => {
    return listMenus();
  });

  router.post("/menus", requirePermission("menus:write"), async (ctx) => {
    validate(menuCreateSchema, ctx.body);
    const body = ctx.body as { name: string; location?: string | null };
    return createMenu({ name: body.name, location: body.location ?? null });
  });

  router.get("/menus/:id", requirePermission("menus:read"), async (ctx) => {
    const menu = await getMenuWithItems(ctx.params.id);
    if (!menu) throw new Error("menu_not_found");
    return menu;
  });

  router.patch(
    "/menus/:id",
    requirePermission("menus:write"),
    async (ctx) => {
      validate(menuUpdateSchema, ctx.body);
      const body = ctx.body as { name?: string; location?: string | null };
      const updated = await updateMenu(ctx.params.id, body);
      if (!updated) throw new Error("menu_not_found");
      return updated;
    }
  );

  router.put(
    "/menus/:id/items",
    requirePermission("menus:write"),
    async (ctx) => {
      validate(menuItemsSchema, ctx.body);
      const body = ctx.body as { items: MenuItemInput[] };
      await replaceMenuItems(ctx.params.id, body.items);
      return { ok: true };
    }
  );

  router.delete(
    "/menus/:id",
    requirePermission("menus:write"),
    async (ctx) => {
      const removed = await deleteMenu(ctx.params.id);
      if (!removed) throw new Error("menu_not_found");
      return { ok: true };
    }
  );
}
