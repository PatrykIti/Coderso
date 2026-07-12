import {
  getUserPermissions,
  hasPermission,
  type RoleQueryExecutor,
} from "../../services/auth/roleService";

export type RbacContext = {
  params?: Record<string, string>;
  user?: { id: string };
};

export type PermissionRequirement = string | readonly string[];

export type PermissionHandler = (ctx: RbacContext, executor?: RoleQueryExecutor) => Promise<void>;

export type PermissionGuardFactory = (permission: PermissionRequirement) => PermissionHandler;

export const requirePermission: PermissionGuardFactory = (permission) => {
  const requiredPermissions = Object.freeze(
    typeof permission === "string" ? [permission] : [...permission]
  );

  return async (ctx: RbacContext, executor?: RoleQueryExecutor) => {
    if (!ctx.user?.id) throw new Error("auth_required");
    if (requiredPermissions.length === 0) throw new Error("forbidden");

    const permissions = await getUserPermissions(ctx.user.id, executor);
    if (!requiredPermissions.every((required) => hasPermission(permissions, required))) {
      throw new Error("forbidden");
    }
  };
};
