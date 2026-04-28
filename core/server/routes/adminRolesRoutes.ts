import {
  createRole,
  deleteRole,
  listRoles,
  updateRole,
} from "../../services/admin/rolesService";
import { listPermissions } from "../../services/admin/permissionsCatalog";
import {
  adminRoleCreateSchema,
  adminRoleUpdateSchema,
} from "../validation/adminRoleSchemas";

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
  delete: (path: string, ...handlers: RouteHandler[]) => void;
};

export type AdminRoleRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
};

export function registerAdminRolesRoutes(router: Router, deps: AdminRoleRouteDeps) {
  const { requirePermission, validate } = deps;

  router.get("/admin-roles", requirePermission("roles:read"), async () => {
    return listRoles();
  });

  router.get(
    "/admin-roles/permissions",
    requirePermission("roles:read"),
    async () => {
      return listPermissions();
    }
  );

  router.post("/admin-roles", requirePermission("roles:write"), async (ctx) => {
    validate(adminRoleCreateSchema, ctx.body);
    return createRole(ctx.body as Parameters<typeof createRole>[0]);
  });

  router.patch(
    "/admin-roles/:id",
    requirePermission("roles:write"),
    async (ctx) => {
      validate(adminRoleUpdateSchema, ctx.body);
      const updated = await updateRole(
        ctx.params.id,
        ctx.body as Parameters<typeof updateRole>[1]
      );
      if (!updated) throw new Error("role_not_found");
      return updated;
    }
  );

  router.delete(
    "/admin-roles/:id",
    requirePermission("roles:write"),
    async (ctx) => {
      const deleted = await deleteRole(ctx.params.id);
      if (!deleted) throw new Error("role_not_found");
      return { ok: true };
    }
  );
}
