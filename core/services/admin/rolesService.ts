import { and, eq, inArray, ne } from "drizzle-orm";

import { db } from "../../db/client";
import { roles, userRoles } from "../../db/schema";
import { listPermissionIds } from "./permissionsCatalog";

export type RoleRecord = typeof roles.$inferSelect;
type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type AdminRoleRecord = {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  system: boolean;
};

export type RoleUpdateTransition = {
  before: AdminRoleRecord;
  after: AdminRoleRecord;
};

export type RoleCreateInput = {
  name: string;
  description?: string | null;
  permissions: string[];
};

export type RoleUpdateInput = Partial<RoleCreateInput>;

const permissionSet = new Set(listPermissionIds());

function normalizePermissions(raw: string[]) {
  const cleaned = raw
    .map((permission) => permission.trim())
    .filter((permission) => permission.length > 0);

  if (cleaned.includes("*")) {
    return ["*"];
  }

  const unique = Array.from(new Set(cleaned));
  for (const permission of unique) {
    if (!permissionSet.has(permission)) {
      throw new Error("permission_invalid");
    }
  }

  return unique;
}

export function hasFullAccess(role: RoleRecord) {
  const permissions = Array.isArray(role.permissions) ? (role.permissions as string[]) : [];
  return permissions.includes("*");
}

export function isSystemRole(role: RoleRecord) {
  return role.name === "admin" || hasFullAccess(role);
}

function toAdminRoleRecord(role: RoleRecord): AdminRoleRecord {
  const permissions = Array.isArray(role.permissions) ? (role.permissions as string[]) : [];
  return {
    id: role.id,
    name: role.name,
    description: role.description ?? undefined,
    permissions,
    system: isSystemRole(role),
  };
}

export async function getAdminRoleIds(excludeRoleId?: string, client: DbClient = db) {
  const rows = await client.select().from(roles);
  return rows
    .filter((role) => hasFullAccess(role))
    .map((role) => role.id)
    .filter((id) => (excludeRoleId ? id !== excludeRoleId : true));
}

async function countUsersWithRoles(roleIds: string[], client: DbClient = db) {
  if (roleIds.length === 0) return 0;
  const rows = await client
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(inArray(userRoles.roleId, roleIds));
  return new Set(rows.map((row) => row.userId)).size;
}

async function ensureAdminRoleRemains(excludingRoleId?: string, client: DbClient = db) {
  const adminRoleIds = await getAdminRoleIds(excludingRoleId, client);
  if (adminRoleIds.length === 0) {
    throw new Error("last_admin");
  }
  const adminUsers = await countUsersWithRoles(adminRoleIds, client);
  if (adminUsers === 0) {
    throw new Error("last_admin");
  }
}

export async function listRoles() {
  const rows = await db.select().from(roles);
  return rows.map((role) => toAdminRoleRecord(role));
}

export async function getRole(id: string) {
  const [row] = await db.select().from(roles).where(eq(roles.id, id));
  if (!row) return null;
  return toAdminRoleRecord(row);
}

export async function createRole(input: RoleCreateInput) {
  const name = input.name.trim();
  if (!name) throw new Error("role_invalid");

  const permissions = normalizePermissions(input.permissions ?? []);
  const description = input.description?.trim() || null;

  const existing = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, name));
  if (existing.length > 0) {
    throw new Error("role_exists");
  }

  const [row] = await db
    .insert(roles)
    .values({
      name,
      description,
      permissions,
      createdAt: new Date(),
    })
    .returning();

  if (!row) return null;
  return toAdminRoleRecord(row);
}

async function updateRoleWithTransitionInClient(
  client: DbClient,
  id: string,
  input: RoleUpdateInput
): Promise<RoleUpdateTransition | null> {
  const [existing] = await client.select().from(roles).where(eq(roles.id, id)).for("update");
  if (!existing) return null;

  const nextName = input.name?.trim() ?? existing.name;
  const nextDescription =
    input.description !== undefined
      ? input.description?.trim() || null
      : (existing.description ?? null);
  const nextPermissions =
    input.permissions !== undefined
      ? normalizePermissions(input.permissions)
      : Array.isArray(existing.permissions)
        ? (existing.permissions as string[])
        : [];

  if (!nextName) throw new Error("role_invalid");

  if (nextName !== existing.name) {
    const nameConflict = await client
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.name, nextName), ne(roles.id, id)));
    if (nameConflict.length > 0) {
      throw new Error("role_exists");
    }
  }

  const wasAdmin = hasFullAccess(existing);
  const nextAdmin = Array.isArray(nextPermissions) && nextPermissions.includes("*");

  if (wasAdmin && !nextAdmin) {
    await ensureAdminRoleRemains(id, client);
  }

  const [row] = await client
    .update(roles)
    .set({
      name: nextName,
      description: nextDescription,
      permissions: nextPermissions,
    })
    .where(eq(roles.id, id))
    .returning();

  if (!row) return null;
  return {
    before: toAdminRoleRecord(existing),
    after: toAdminRoleRecord(row),
  };
}

export async function updateRoleWithTransition(id: string, input: RoleUpdateInput) {
  return db.transaction((tx) => updateRoleWithTransitionInClient(tx, id, input));
}

export async function updateRole(id: string, input: RoleUpdateInput) {
  const transition = await updateRoleWithTransition(id, input);
  return transition?.after ?? null;
}

export async function deleteRole(id: string) {
  const [existing] = await db.select().from(roles).where(eq(roles.id, id));
  if (!existing) return null;

  if (hasFullAccess(existing)) {
    await ensureAdminRoleRemains(id);
  }

  const [row] = await db.delete(roles).where(eq(roles.id, id)).returning();

  return row ?? null;
}

export async function listRoleAssignments(roleId: string) {
  const rows = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(eq(userRoles.roleId, roleId));
  return rows.map((row) => row.userId);
}
