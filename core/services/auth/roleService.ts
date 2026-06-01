import { eq, inArray } from "drizzle-orm";
import { db } from "../../db/client";
import { roles, userRoles } from "../../db/schema";

export type AdminPermissionSnapshotRole = {
  id: string;
  slug: string;
  name: string;
};

export type AdminPermissionSnapshot = {
  permissions: string[];
  roles: AdminPermissionSnapshotRole[];
};

type RoleLike = {
  id: string;
  name: string;
  permissions: unknown;
};

const normalizePermissionList = (permissions: unknown) => {
  if (!Array.isArray(permissions)) return [];
  return permissions.filter((permission): permission is string => typeof permission === "string");
};

const normalizeRoleSlug = (name: string, id: string) => {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : id;
};

export function mergePermissions(permissionsList: string[][]) {
  const merged = new Set<string>();
  for (const list of permissionsList) {
    for (const permission of list ?? []) {
      merged.add(permission);
    }
  }
  return Array.from(merged);
}

export function hasPermission(permissions: string[], permission: string) {
  if (permissions.includes("*")) return true;
  return permissions.includes(permission);
}

export async function getUserRoles(userId: string) {
  const rows = await db.select().from(userRoles).where(eq(userRoles.userId, userId));

  if (rows.length === 0) return [];
  const roleIds = rows.map((row) => row.roleId);

  return db.select().from(roles).where(inArray(roles.id, roleIds));
}

export function buildAdminPermissionSnapshotFromRoles(
  roleRows: readonly RoleLike[]
): AdminPermissionSnapshot {
  const permissionLists = roleRows.map((role) => normalizePermissionList(role.permissions));
  return {
    permissions: mergePermissions(permissionLists).sort(),
    roles: roleRows
      .map((role) => ({
        id: role.id,
        slug: normalizeRoleSlug(role.name, role.id),
        name: role.name,
      }))
      .sort((left, right) => left.name.localeCompare(right.name)),
  };
}

export async function getAdminPermissionSnapshot(userId: string): Promise<AdminPermissionSnapshot> {
  const roleRows = await getUserRoles(userId);
  return buildAdminPermissionSnapshotFromRoles(roleRows);
}

export async function getUserPermissions(userId: string) {
  const snapshot = await getAdminPermissionSnapshot(userId);
  return snapshot.permissions;
}
