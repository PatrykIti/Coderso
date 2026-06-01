import { ApiError } from "../errorHandler";
import { logAudit } from "../../services/audit/auditService";
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
  inviteUserWithSetPassword,
  requestAdminPasswordReset,
} from "../../services/admin/userPasswordFlowService";
import {
  adminUserCreateSchema,
  adminUserInviteSchema,
  adminUserPasswordResetSchema,
  adminUserRolesSchema,
  adminUserUpdateSchema,
} from "../validation/adminUserSchemas";

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
  put: (path: string, ...handlers: RouteHandler[]) => void;
  delete: (path: string, ...handlers: RouteHandler[]) => void;
};

export type AdminUserRouteDeps = {
  requirePermission: (permission: string) => RouteHandler;
  validate: (schema: unknown, payload: unknown) => void;
  createUser?: typeof createUser;
  updateUser?: typeof updateUser;
  disableUser?: typeof disableUser;
  enableUser?: typeof enableUser;
  setUserRoles?: typeof setUserRoles;
  deleteUser?: typeof deleteUser;
  inviteUserWithSetPassword?: typeof inviteUserWithSetPassword;
  requestAdminPasswordReset?: typeof requestAdminPasswordReset;
  logAudit?: typeof logAudit;
};

export const mapAdminUserError = (error: unknown) => {
  if (error instanceof ApiError) return error;
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "user_not_found":
      return new ApiError("user_not_found", "User not found", 404);
    case "user_invalid":
      return new ApiError("user_invalid", "Invalid user payload", 400);
    case "user_exists":
      return new ApiError("user_exists", "User already exists", 409);
    case "role_invalid":
      return new ApiError("role_invalid", "Invalid role assignment", 400);
    case "last_admin":
      return new ApiError("last_admin", "Last admin cannot be modified", 409);
    case "email_not_configured":
      return new ApiError("email_not_configured", "Email delivery is not configured", 400);
    case "email_recipient_invalid":
      return new ApiError("email_recipient_invalid", "Recipient email is invalid", 400);
    case "email_send_failed":
      return new ApiError("email_send_failed", "Set-password email could not be sent", 400);
    default:
      return null;
  }
};

const withAdminUserErrors = async <T>(operation: () => Promise<T>) => {
  try {
    return await operation();
  } catch (error) {
    const mapped = mapAdminUserError(error);
    if (mapped) throw mapped;
    throw error;
  }
};

export function registerAdminUsersRoutes(router: Router, deps: AdminUserRouteDeps) {
  const { requirePermission, validate } = deps;
  const createUserRecord = deps.createUser ?? createUser;
  const updateUserRecord = deps.updateUser ?? updateUser;
  const disableUserRecord = deps.disableUser ?? disableUser;
  const enableUserRecord = deps.enableUser ?? enableUser;
  const setUserRoleRecords = deps.setUserRoles ?? setUserRoles;
  const deleteUserRecord = deps.deleteUser ?? deleteUser;
  const inviteWithSetPassword = deps.inviteUserWithSetPassword ?? inviteUserWithSetPassword;
  const requestPasswordReset = deps.requestAdminPasswordReset ?? requestAdminPasswordReset;
  const writeAudit = deps.logAudit ?? logAudit;

  router.get("/admin-users", requirePermission("users:read"), async () => {
    return listUsers();
  });

  router.post("/admin-users", requirePermission("users:write"), async (ctx) => {
    validate(adminUserCreateSchema, ctx.body);
    return withAdminUserErrors(async () => {
      const created = await createUserRecord(ctx.body as Parameters<typeof createUserRecord>[0]);
      if (!created) throw new ApiError("user_invalid", "Invalid user payload", 400);
      return created;
    });
  });

  router.post("/admin-users/invite", requirePermission("users:write"), async (ctx) => {
    validate(adminUserInviteSchema, ctx.body);
    return withAdminUserErrors(async () => {
      const result = await inviteWithSetPassword(
        ctx.body as Parameters<typeof inviteWithSetPassword>[0]
      );
      await writeAudit({
        actorId: ctx.user?.id ?? null,
        action: "admin.user.invite",
        targetType: "user",
        targetId: result.user.id,
        metadata: {
          email: result.user.email,
          roleIds: result.user.roleIds,
          delivery: result.setPassword.delivery,
          deliveryStatus: result.setPassword.status,
          expiresAt: result.setPassword.expiresAt.toISOString(),
        },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return result;
    });
  });

  router.patch("/admin-users/:id", requirePermission("users:write"), async (ctx) => {
    validate(adminUserUpdateSchema, ctx.body);
    const updated = await withAdminUserErrors(() =>
      updateUserRecord(ctx.params.id, ctx.body as Parameters<typeof updateUserRecord>[1])
    );
    if (!updated) throw new ApiError("user_not_found", "User not found", 404);
    return updated;
  });

  router.post("/admin-users/:id/disable", requirePermission("users:write"), async (ctx) => {
    const updated = await withAdminUserErrors(() => disableUserRecord(ctx.params.id));
    if (!updated) throw new ApiError("user_not_found", "User not found", 404);
    return updated;
  });

  router.post("/admin-users/:id/enable", requirePermission("users:write"), async (ctx) => {
    const updated = await withAdminUserErrors(() => enableUserRecord(ctx.params.id));
    if (!updated) throw new ApiError("user_not_found", "User not found", 404);
    return updated;
  });

  router.put("/admin-users/:id/roles", requirePermission("users:write"), async (ctx) => {
    validate(adminUserRolesSchema, ctx.body);
    const updated = await withAdminUserErrors(() =>
      setUserRoleRecords(ctx.params.id, (ctx.body as { roleIds: string[] }).roleIds)
    );
    if (!updated) throw new ApiError("user_not_found", "User not found", 404);
    return updated;
  });

  router.delete("/admin-users/:id", requirePermission("users:write"), async (ctx) => {
    const deleted = await withAdminUserErrors(() => deleteUserRecord(ctx.params.id));
    if (!deleted) throw new ApiError("user_not_found", "User not found", 404);
    return { ok: true };
  });

  router.post("/admin-users/:id/password-reset", requirePermission("users:write"), async (ctx) => {
    validate(adminUserPasswordResetSchema, ctx.body);
    return withAdminUserErrors(async () => {
      const result = await requestPasswordReset(ctx.params.id);
      if (!result) throw new ApiError("user_not_found", "User not found", 404);
      await writeAudit({
        actorId: ctx.user?.id ?? null,
        action: "admin.user.password_reset",
        targetType: "user",
        targetId: ctx.params.id,
        metadata: {
          delivery: result.delivery,
          deliveryStatus: result.status,
          expiresAt: result.expiresAt.toISOString(),
        },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      return result;
    });
  });
}
