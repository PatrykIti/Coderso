import {
  BRIDGE_INPUT_READER,
  BRIDGE_OUTPUT_WRITER,
  bridgeInputSchemaGuard,
} from "../../runtime/bun-child-protocol.mjs";

const USER_PROVISION_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("user-provision-input-v1") +
  String.raw`
import { eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { roles, userRoles, users } from "./db/schema.ts";
import { createUser } from "./services/admin/usersService.ts";
import { getAdminRoleIds } from "./services/admin/rolesService.ts";
import { hashPassword } from "./services/auth/password.ts";
import { updatePassword } from "./services/auth/userService.ts";
import { normalizeEmail, resolveEmailValue } from "./services/security/piiEmail.ts";
if (Object.keys(input).sort().join(",") !== "email,name" || normalizeEmail(input.email) !== input.email) throw new Error("wf540_input");
const roleIds = await getAdminRoleIds();
if (roleIds.length !== 1) throw new Error("wf540_admin_role");
const adminRoles = await db.select({id:roles.id,name:roles.name,description:roles.description,permissions:roles.permissions,createdAt:roles.createdAt}).from(roles).where(eq(roles.id,roleIds[0])).limit(2);
if (adminRoles.length !== 1 || adminRoles[0].name !== "admin" || canonical(adminRoles[0].permissions) !== canonical(["*"])) throw new Error("wf540_admin_role_tuple");
const user = await createUser({ name: input.name, email: input.email, roleIds, status: "active" });
if (!user) throw new Error("wf540_user_create");
const passwordHash = await hashPassword(process.env.ADMIN_PASSWORD);
const updated = await updatePassword(user.id, { passwordHash, activatePending: true });
if (!updated || updated.id !== user.id || updated.passwordHash !== passwordHash) throw new Error("wf540_user_password_exact_id");
const storedUsers = await db.select().from(users).where(eq(users.id,user.id)).limit(2);
const storedRoles = await db.select({
  userId:userRoles.userId,roleId:userRoles.roleId,roleName:roles.name,
  roleDescription:roles.description,rolePermissions:roles.permissions,roleCreatedAt:roles.createdAt,
}).from(userRoles).innerJoin(roles,eq(roles.id,userRoles.roleId)).where(eq(userRoles.userId,user.id)).limit(2);
if (storedUsers.length !== 1 || storedRoles.length !== 1 || storedRoles[0].roleId !== roleIds[0] || storedRoles[0].roleName !== "admin" || canonical(storedRoles[0].rolePermissions) !== canonical(["*"]) || normalizeEmail(resolveEmailValue(storedUsers[0]) ?? "") !== input.email) throw new Error("wf540_user_complete_proof");
const output = {
  adminRoleTupleCount:1,exactIdPasswordUpdate:true,normalizedEmailMatches:true,
  userEmail:input.email,userId:user.id,
};` +
  BRIDGE_OUTPUT_WRITER;
const USER_PROOF_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("user-identity-input-v1") +
  String.raw`
import { getUser } from "./services/admin/usersService.ts";
import { getAdminRoleIds } from "./services/admin/rolesService.ts";
if (Object.keys(input).sort().join(",") !== "email,userId") throw new Error("wf540_input");
const user = await getUser(input.userId); const adminRoleIds = await getAdminRoleIds();
if (!user || user.email !== input.email || user.status !== "active" || adminRoleIds.length !== 1 || user.roleIds.length !== 1 || user.roleIds[0] !== adminRoleIds[0]) throw new Error("wf540_user_proof");
const output = { ok: true };` +
  BRIDGE_OUTPUT_WRITER;
const USER_DELETE_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("user-id-input-v1") +
  String.raw`
import { deleteUser, getUser } from "./services/admin/usersService.ts";
if (Object.keys(input).join(",") !== "userId") throw new Error("wf540_input");
const before = await getUser(input.userId); if (!before) throw new Error("wf540_user_missing");
const deleted = await deleteUser(input.userId); if (!deleted) throw new Error("wf540_user_delete");
const output = { ok: (await getUser(input.userId)) === null };` +
  BRIDGE_OUTPUT_WRITER;
const USER_ABSENCE_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("user-id-input-v1") +
  String.raw`
import { getUser } from "./services/admin/usersService.ts";
if (Object.keys(input).join(",") !== "userId") throw new Error("wf540_input");
const output = { absent: (await getUser(input.userId)) === null };` +
  BRIDGE_OUTPUT_WRITER;
const PREFERENCE_SET_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("preference-write-input-v1") +
  String.raw`
import { setUserSetting } from "./services/settings/userSettingsService.ts";
if (Object.keys(input).sort().join(",") !== "showFieldMetadata,userId" || typeof input.showFieldMetadata !== "boolean") throw new Error("wf540_input");
const row = await setUserSetting(input.userId, "customScreens.entry.preferences", { version: 1, showFieldMetadata: input.showFieldMetadata });
const output = { ok: row.userId === input.userId };` +
  BRIDGE_OUTPUT_WRITER;
const PREFERENCE_GET_BRIDGE_SOURCE =
  BRIDGE_INPUT_READER +
  bridgeInputSchemaGuard("user-id-input-v1") +
  String.raw`
import { getUserSetting } from "./services/settings/userSettingsService.ts";
if (Object.keys(input).join(",") !== "userId") throw new Error("wf540_input");
const value = await getUserSetting(input.userId, "customScreens.entry.preferences");
if (!value || Object.keys(value).sort().join(",") !== "showFieldMetadata,version" || value.version !== 1 || typeof value.showFieldMetadata !== "boolean") throw new Error("wf540_preference");
const output = { showFieldMetadata: value.showFieldMetadata };` +
  BRIDGE_OUTPUT_WRITER;

export {
  PREFERENCE_GET_BRIDGE_SOURCE,
  PREFERENCE_SET_BRIDGE_SOURCE,
  USER_ABSENCE_BRIDGE_SOURCE,
  USER_DELETE_BRIDGE_SOURCE,
  USER_PROOF_BRIDGE_SOURCE,
  USER_PROVISION_BRIDGE_SOURCE,
};
