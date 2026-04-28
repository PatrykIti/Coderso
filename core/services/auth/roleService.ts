import { eq, inArray } from "drizzle-orm";
import { db } from "../../db/client";
import { roles, userRoles } from "../../db/schema";

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
  const rows = await db
    .select()
    .from(userRoles)
    .where(eq(userRoles.userId, userId));

  if (rows.length === 0) return [];
  const roleIds = rows.map((row) => row.roleId);

  return db.select().from(roles).where(inArray(roles.id, roleIds));
}

export async function getUserPermissions(userId: string) {
  const roleRows = await getUserRoles(userId);
  const permissionLists = roleRows.map((role) =>
    Array.isArray(role.permissions) ? role.permissions : []
  );
  return mergePermissions(permissionLists);
}
