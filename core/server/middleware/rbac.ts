import { getUserPermissions, hasPermission } from "../../services/auth/roleService";

export type RbacContext = {
  user?: { id: string };
};

export function requirePermission(permission: string) {
  return async (ctx: RbacContext) => {
    if (!ctx.user?.id) throw new Error("auth_required");

    const permissions = await getUserPermissions(ctx.user.id);
    if (!hasPermission(permissions, permission)) {
      throw new Error("forbidden");
    }
  };
}
