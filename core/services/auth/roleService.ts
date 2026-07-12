import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { roles, userRoles } from "../../db/schema";

export type RoleQueryExecutor = Pick<typeof db, "select">;

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

const ADMIN_PERMISSION_ROLE_FIELDS = {
  id: roles.id,
  name: roles.name,
  permissions: roles.permissions,
} as const;

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

export async function getUserRoles(userId: string, executor: RoleQueryExecutor = db) {
  return executor
    .select(ADMIN_PERMISSION_ROLE_FIELDS)
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
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

export async function getAdminPermissionSnapshot(
  userId: string,
  executor: RoleQueryExecutor = db
): Promise<AdminPermissionSnapshot> {
  const roleRows = await getUserRoles(userId, executor);
  return buildAdminPermissionSnapshotFromRoles(roleRows);
}

export async function getUserPermissions(userId: string, executor: RoleQueryExecutor = db) {
  const snapshot = await getAdminPermissionSnapshot(userId, executor);
  return snapshot.permissions;
}
