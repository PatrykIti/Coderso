import type {
  PlainJsonObject,
  PlainJsonValue,
  WorkerOperationContext,
} from "../../../../workers/contracts";
import {
  canonicalTask540Json as canonical,
  task540HandlerArtifactSha256,
  type Task540InputFor,
  type Task540TypedHandler,
} from "../contracts";

export async function handleUserAbsence(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"user-id-input-v1">;

  const { getUser } = await import("../../../../../../core/services/admin/usersService");
  if (Object.keys(input).join(",") !== "userId") throw new Error("wf540_input");
  const output = { absent: (await getUser(input.userId)) === null };
  return output as unknown as PlainJsonValue;
}

export async function handleUserDelete(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"user-id-input-v1">;

  const { deleteUser, getUser } =
    await import("../../../../../../core/services/admin/usersService");
  if (Object.keys(input).join(",") !== "userId") throw new Error("wf540_input");
  const before = await getUser(input.userId);
  if (!before) throw new Error("wf540_user_missing");
  const deleted = await deleteUser(input.userId);
  if (!deleted) throw new Error("wf540_user_delete");
  const output = { ok: (await getUser(input.userId)) === null };
  return output as unknown as PlainJsonValue;
}

export async function handleUserPreferenceGet(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"user-id-input-v1">;

  const { getUserSetting } =
    await import("../../../../../../core/services/settings/userSettingsService");
  if (Object.keys(input).join(",") !== "userId") throw new Error("wf540_input");
  const value = await getUserSetting(input.userId, "customScreens.entry.preferences");
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("wf540_preference");
  const preference = value as unknown as Readonly<Record<string, unknown>>;
  if (
    Object.keys(preference).sort().join(",") !== "showFieldMetadata,version" ||
    preference.version !== 1 ||
    typeof preference.showFieldMetadata !== "boolean"
  )
    throw new Error("wf540_preference");
  const output = { showFieldMetadata: preference.showFieldMetadata };
  return output as unknown as PlainJsonValue;
}

export async function handleUserPreferenceSet(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"preference-write-input-v1">;

  const { setUserSetting } =
    await import("../../../../../../core/services/settings/userSettingsService");
  if (
    Object.keys(input).sort().join(",") !== "showFieldMetadata,userId" ||
    typeof input.showFieldMetadata !== "boolean"
  )
    throw new Error("wf540_input");
  const row = await setUserSetting(input.userId, "customScreens.entry.preferences", {
    version: 1,
    showFieldMetadata: input.showFieldMetadata,
  });
  const output = { ok: row.userId === input.userId };
  return output as unknown as PlainJsonValue;
}

export async function handleUserProof(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"user-identity-input-v1">;

  const { getUser } = await import("../../../../../../core/services/admin/usersService");
  const { getAdminRoleIds } = await import("../../../../../../core/services/admin/rolesService");
  if (Object.keys(input).sort().join(",") !== "email,userId") throw new Error("wf540_input");
  const user = await getUser(input.userId);
  const adminRoleIds = await getAdminRoleIds();
  if (
    !user ||
    user.email !== input.email ||
    user.status !== "active" ||
    adminRoleIds.length !== 1 ||
    user.roleIds.length !== 1 ||
    user.roleIds[0] !== adminRoleIds[0]
  )
    throw new Error("wf540_user_proof");
  const output = { ok: true };
  return output as unknown as PlainJsonValue;
}

export async function handleUserProvision(
  inputValue: PlainJsonObject,
  _context: WorkerOperationContext
): Promise<PlainJsonValue> {
  const input = inputValue as unknown as Task540InputFor<"user-provision-input-v1">;

  const { eq } = await import("drizzle-orm");
  const { db } = await import("../../../../../../core/db/client");
  const { roles, userRoles, users } = await import("../../../../../../core/db/schema");
  const { createUser } = await import("../../../../../../core/services/admin/usersService");
  const { getAdminRoleIds } = await import("../../../../../../core/services/admin/rolesService");
  const { hashPassword } = await import("../../../../../../core/services/auth/password");
  const { updatePassword } = await import("../../../../../../core/services/auth/userService");
  const { normalizeEmail, resolveEmailValue } =
    await import("../../../../../../core/services/security/piiEmail");
  if (
    Object.keys(input).sort().join(",") !== "email,name" ||
    normalizeEmail(input.email) !== input.email
  )
    throw new Error("wf540_input");
  const roleIds = await getAdminRoleIds();
  if (roleIds.length !== 1) throw new Error("wf540_admin_role");
  const adminRoles = await db
    .select({
      id: roles.id,
      name: roles.name,
      description: roles.description,
      permissions: roles.permissions,
      createdAt: roles.createdAt,
    })
    .from(roles)
    .where(eq(roles.id, roleIds[0]))
    .limit(2);
  if (
    adminRoles.length !== 1 ||
    adminRoles[0].name !== "admin" ||
    canonical(adminRoles[0].permissions) !== canonical(["*"])
  )
    throw new Error("wf540_admin_role_tuple");
  const user = await createUser({
    name: input.name,
    email: input.email,
    roleIds,
    status: "active",
  });
  if (!user) throw new Error("wf540_user_create");
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword === undefined) throw new Error("wf540_admin_password_absent");
  const passwordHash = await hashPassword(adminPassword);
  const updated = await updatePassword(user.id, { passwordHash, activatePending: true });
  if (!updated || updated.id !== user.id || updated.passwordHash !== passwordHash)
    throw new Error("wf540_user_password_exact_id");
  const storedUsers = await db.select().from(users).where(eq(users.id, user.id)).limit(2);
  const storedRoles = await db
    .select({
      userId: userRoles.userId,
      roleId: userRoles.roleId,
      roleName: roles.name,
      roleDescription: roles.description,
      rolePermissions: roles.permissions,
      roleCreatedAt: roles.createdAt,
    })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, user.id))
    .limit(2);
  if (
    storedUsers.length !== 1 ||
    storedRoles.length !== 1 ||
    storedRoles[0].roleId !== roleIds[0] ||
    storedRoles[0].roleName !== "admin" ||
    canonical(storedRoles[0].rolePermissions) !== canonical(["*"]) ||
    normalizeEmail(resolveEmailValue(storedUsers[0]) ?? "") !== input.email
  )
    throw new Error("wf540_user_complete_proof");
  const output = {
    adminRoleTupleCount: 1,
    exactIdPasswordUpdate: true,
    normalizedEmailMatches: true,
    userEmail: input.email,
    userId: user.id,
  };
  return output as unknown as PlainJsonValue;
}

export const TASK540_USER_PREFERENCE_HANDLERS: readonly Task540TypedHandler[] = Object.freeze([
  Object.freeze({
    handlerId: "source/user/absence",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/user/absence"),
    execute: handleUserAbsence,
  }),
  Object.freeze({
    handlerId: "source/user/delete",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/user/delete"),
    execute: handleUserDelete,
  }),
  Object.freeze({
    handlerId: "source/user/preference-get",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/user/preference-get"),
    execute: handleUserPreferenceGet,
  }),
  Object.freeze({
    handlerId: "source/user/preference-set",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/user/preference-set"),
    execute: handleUserPreferenceSet,
  }),
  Object.freeze({
    handlerId: "source/user/proof",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/user/proof"),
    execute: handleUserProof,
  }),
  Object.freeze({
    handlerId: "source/user/provision",
    handlerArtifactSha256: task540HandlerArtifactSha256("source/user/provision"),
    execute: handleUserProvision,
  }),
]);
