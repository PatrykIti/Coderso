import {
  createUser,
  deleteUser,
  disableUser,
  enableUser,
  listUsers,
  setUserRoles,
  updateUser,
} from "../../services/admin/usersService";
import {
  adminUserCreateSchema,
  adminUserRolesSchema,
  adminUserUpdateSchema,
} from "../validation/adminUserSchemas";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
};

export type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type Router = {
  get: (path: string, ...handlers: RouteHandler[]) => void;
  post: (path: string, ...handlers: RouteHandler[]) => void;
  patch: (path: string, ...handlers: RouteHandler[]) => void;
  put: (path: string, ...handlers: RouteHandler[]) => void;
  delete: (path: string, ...handlers: RouteHandler[]) => void;
};

export type AdminUserRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export function registerAdminUsersRoutes(router: Router, deps: AdminUserRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/admin-users", requirePermission("users:read"), async () => {
    return listUsers();
  });

  router.post("/admin-users", requirePermission("users:write"), async (ctx) => {
    validate(adminUserCreateSchema, ctx.body);
    return createUser(ctx.body as Parameters<typeof createUser>[0]);
  });

  router.patch(
    "/admin-users/:id",
    requirePermission("users:write"),
    async (ctx) => {
      validate(adminUserUpdateSchema, ctx.body);
      const updated = await updateUser(
        ctx.params.id,
        ctx.body as Parameters<typeof updateUser>[1]
      );
      if (!updated) throw new Error("user_not_found");
      return updated;
    }
  );

  router.post(
    "/admin-users/:id/disable",
    requirePermission("users:write"),
    async (ctx) => {
      const updated = await disableUser(ctx.params.id);
      if (!updated) throw new Error("user_not_found");
      return updated;
    }
  );

  router.post(
    "/admin-users/:id/enable",
    requirePermission("users:write"),
    async (ctx) => {
      const updated = await enableUser(ctx.params.id);
      if (!updated) throw new Error("user_not_found");
      return updated;
    }
  );

  router.put(
    "/admin-users/:id/roles",
    requirePermission("users:write"),
    async (ctx) => {
      validate(adminUserRolesSchema, ctx.body);
      const updated = await setUserRoles(
        ctx.params.id,
        (ctx.body as { roleIds: string[] }).roleIds
      );
      if (!updated) throw new Error("user_not_found");
      return updated;
    }
  );

  router.delete(
    "/admin-users/:id",
    requirePermission("users:write"),
    async (ctx) => {
      const deleted = await deleteUser(ctx.params.id);
      if (!deleted) throw new Error("user_not_found");
      return { ok: true };
    }
  );
}
