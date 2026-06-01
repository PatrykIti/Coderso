import { createRole, deleteRole, listRoles, updateRole } from "../../services/admin/rolesService";
import { listPermissions } from "../../services/admin/permissionsCatalog";
import { logAudit } from "../../services/audit/auditService";
import { ApiError } from "../errorHandler";
import { adminRoleCreateSchema, adminRoleUpdateSchema } from "../validation/adminRoleSchemas";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
  ip?: string;
  userAgent?: string;
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
  createRole?: typeof createRole;
  updateRole?: typeof updateRole;
  deleteRole?: typeof deleteRole;
  logAudit?: typeof logAudit;
};

export const mapAdminRoleError = (error: unknown) => {
  if (error instanceof ApiError) return error;
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "role_not_found":
      return new ApiError("role_not_found", "Role not found", 404);
    case "role_invalid":
      return new ApiError("role_invalid", "Invalid role payload", 400);
    case "permission_invalid":
      return new ApiError("permission_invalid", "Invalid permission assignment", 400);
    case "role_exists":
      return new ApiError("role_exists", "Role already exists", 409);
    case "last_admin":
      return new ApiError("last_admin", "Last admin role cannot be modified", 409);
    default:
      return null;
  }
};

const withAdminRoleErrors = async <T>(operation: () => Promise<T>) => {
  try {
    return await operation();
  } catch (error) {
    const mapped = mapAdminRoleError(error);
    if (mapped) throw mapped;
    throw error;
  }
};

export function registerAdminRolesRoutes(router: Router, deps: AdminRoleRouteDeps) {
  const { requirePermission, validate } = deps;
  const createRoleRecord = deps.createRole ?? createRole;
  const updateRoleRecord = deps.updateRole ?? updateRole;
  const deleteRoleRecord = deps.deleteRole ?? deleteRole;
  const writeAudit = deps.logAudit ?? logAudit;

  router.get("/admin-roles", requirePermission("roles:read"), async () => {
    return listRoles();
  });

  router.get("/admin-roles/permissions", requirePermission("roles:read"), async () => {
    return listPermissions();
  });

  router.post("/admin-roles", requirePermission("roles:write"), async (ctx) => {
    validate(adminRoleCreateSchema, ctx.body);
    return withAdminRoleErrors(async () => {
      const body = ctx.body as Parameters<typeof createRoleRecord>[0] & {
        sourceRoleId?: string;
        sourceRoleName?: string;
      };
      const created = await createRoleRecord({
        name: body.name,
        description: body.description,
        permissions: body.permissions,
      });
      if (!created) throw new ApiError("role_invalid", "Invalid role payload", 400);

      const sourceRoleId = body.sourceRoleId?.trim();
      const sourceRoleName = body.sourceRoleName?.trim();
      await writeAudit({
        actorId: ctx.user?.id ?? null,
        action: sourceRoleId ? "admin.role.duplicate" : "admin.role.create",
        targetType: "role",
        targetId: created.id,
        metadata: {
          name: created.name,
          permissions: created.permissions,
          ...(sourceRoleId ? { sourceRoleId } : {}),
          ...(sourceRoleName ? { sourceRoleName } : {}),
        },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });

      return created;
    });
  });

  router.patch("/admin-roles/:id", requirePermission("roles:write"), async (ctx) => {
    validate(adminRoleUpdateSchema, ctx.body);
    const updated = await withAdminRoleErrors(() =>
      updateRoleRecord(ctx.params.id, ctx.body as Parameters<typeof updateRoleRecord>[1])
    );
    if (!updated) throw new ApiError("role_not_found", "Role not found", 404);
    await writeAudit({
      actorId: ctx.user?.id ?? null,
      action: "admin.role.update",
      targetType: "role",
      targetId: updated.id,
      metadata: {
        name: updated.name,
        permissions: updated.permissions,
      },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return updated;
  });

  router.delete("/admin-roles/:id", requirePermission("roles:write"), async (ctx) => {
    const deleted = await withAdminRoleErrors(() => deleteRoleRecord(ctx.params.id));
    if (!deleted) throw new ApiError("role_not_found", "Role not found", 404);
    const deletedPermissions = Array.isArray(deleted.permissions)
      ? (deleted.permissions as string[])
      : [];
    await writeAudit({
      actorId: ctx.user?.id ?? null,
      action: "admin.role.delete",
      targetType: "role",
      targetId: deleted.id,
      metadata: {
        name: deleted.name,
        permissions: deletedPermissions,
      },
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return { ok: true };
  });
}
