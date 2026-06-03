import { and, desc, eq, inArray, ne, or } from "drizzle-orm";
import { randomBytes } from "node:crypto";

import { db } from "../../db/client";
import { roles, userRoles, users } from "../../db/schema";
import { hashPassword } from "../auth/password";
import { buildEmailFields, normalizeEmail, resolveEmailValue } from "../security/piiEmail";
import { getAdminRoleIds } from "./rolesService";

export type UserStatus = "active" | "inactive" | "pending";

export type UserRecord = typeof users.$inferSelect;

export type UserSummary = {
  id: string;
  name: string | null;
  email: string;
  status: UserStatus;
  roleIds: string[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
};

export type UserCreateInput = {
  name: string;
  email: string;
  roleIds: string[];
  status?: UserStatus;
};

export type UserUpdateInput = {
  name?: string;
  email?: string;
  status?: UserStatus;
};

async function listRoleIdsForUsers(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string[]>();
  const rows = await db.select().from(userRoles).where(inArray(userRoles.userId, userIds));

  const map = new Map<string, string[]>();
  rows.forEach((row) => {
    const current = map.get(row.userId) ?? [];
    current.push(row.roleId);
    map.set(row.userId, current);
  });
  return map;
}

const resolveUserEmail = (row: { emailEncrypted?: unknown; email?: string | null }) =>
  resolveEmailValue({ emailEncrypted: row.emailEncrypted, email: row.email }) ?? "";

async function getAdminUserIdsExcluding(userId?: string) {
  const adminRoleIds = await getAdminRoleIds();
  if (adminRoleIds.length === 0) return new Set<string>();
  const rows = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(inArray(userRoles.roleId, adminRoleIds));
  const ids = new Set(rows.map((row) => row.userId));
  if (userId) ids.delete(userId);
  return ids;
}

async function ensureNotLastAdmin(userId: string) {
  const otherAdmins = await getAdminUserIdsExcluding(userId);
  if (otherAdmins.size === 0) {
    throw new Error("last_admin");
  }
}

async function userHasAdminRole(userId: string) {
  const adminRoleIds = await getAdminRoleIds();
  if (adminRoleIds.length === 0) return false;
  const rows = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), inArray(userRoles.roleId, adminRoleIds)));
  return rows.length > 0;
}

async function assertRoleIdsExist(roleIds: string[]) {
  if (roleIds.length === 0) return;
  const rows = await db.select({ id: roles.id }).from(roles).where(inArray(roles.id, roleIds));
  if (rows.length !== roleIds.length) {
    throw new Error("role_invalid");
  }
}

export async function listUsers(): Promise<UserSummary[]> {
  const rows = await db.select().from(users).orderBy(desc(users.createdAt));
  const userIds = rows.map((row) => row.id);
  const roleMap = await listRoleIdsForUsers(userIds);

  return rows.map((row) => ({
    id: row.id,
    name: row.name ?? null,
    email: resolveUserEmail(row),
    status: row.status as UserStatus,
    roleIds: roleMap.get(row.id) ?? [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastLoginAt: row.lastLoginAt ?? null,
  }));
}

export async function getUser(id: string) {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  if (!row) return null;
  const roleMap = await listRoleIdsForUsers([row.id]);
  return {
    id: row.id,
    name: row.name ?? null,
    email: resolveUserEmail(row),
    status: row.status as UserStatus,
    roleIds: roleMap.get(row.id) ?? [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastLoginAt: row.lastLoginAt ?? null,
  };
}

export async function createUser(input: UserCreateInput) {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  const roleIds = input.roleIds ?? [];

  if (!email || !name) {
    throw new Error("user_invalid");
  }

  const emailFields = buildEmailFields(email);

  await assertRoleIdsExist(roleIds);

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.emailHash, emailFields.emailHash), eq(users.email, email)));
  if (existing.length > 0) {
    throw new Error("user_exists");
  }

  const passwordHash = await hashPassword(randomBytes(16).toString("hex"));
  const status: UserStatus = input.status ?? "pending";

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(users)
      .values({
        email: emailFields.email,
        emailHash: emailFields.emailHash,
        emailEncrypted: emailFields.emailEncrypted,
        name,
        passwordHash,
        status,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    if (!row) return null;

    if (roleIds.length > 0) {
      await tx
        .insert(userRoles)
        .values(roleIds.map((roleId) => ({ userId: row.id, roleId })))
        .onConflictDoNothing();
    }

    return {
      id: row.id,
      name: row.name ?? null,
      email: resolveUserEmail(row),
      status: row.status as UserStatus,
      roleIds,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastLoginAt: row.lastLoginAt ?? null,
    };
  });
}

export async function updateUser(id: string, input: UserUpdateInput) {
  const [existing] = await db.select().from(users).where(eq(users.id, id));
  if (!existing) return null;

  const update: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("user_invalid");
    update.name = name;
  }

  if (input.email !== undefined) {
    const email = normalizeEmail(input.email);
    if (!email) throw new Error("user_invalid");
    const emailFields = buildEmailFields(email);
    const conflict = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          or(eq(users.emailHash, emailFields.emailHash), eq(users.email, email)),
          ne(users.id, id)
        )
      );
    if (conflict.length > 0) {
      throw new Error("user_exists");
    }
    update.email = emailFields.email;
    update.emailHash = emailFields.emailHash;
    update.emailEncrypted = emailFields.emailEncrypted;
  }

  if (input.status !== undefined) {
    update.status = input.status;
  }

  const [row] = await db.update(users).set(update).where(eq(users.id, id)).returning();
  if (!row) return null;

  const roleMap = await listRoleIdsForUsers([row.id]);

  return {
    id: row.id,
    name: row.name ?? null,
    email: resolveUserEmail(row),
    status: row.status as UserStatus,
    roleIds: roleMap.get(row.id) ?? [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastLoginAt: row.lastLoginAt ?? null,
  };
}

export async function setUserRoles(userId: string, roleIds: string[]) {
  await assertRoleIdsExist(roleIds);

  const adminRoleIds = await getAdminRoleIds();
  const removingAdmin =
    adminRoleIds.length > 0 &&
    (await userHasAdminRole(userId)) &&
    !roleIds.some((roleId) => adminRoleIds.includes(roleId));

  if (removingAdmin) {
    await ensureNotLastAdmin(userId);
  }

  return db.transaction(async (tx) => {
    await tx.delete(userRoles).where(eq(userRoles.userId, userId));

    if (roleIds.length > 0) {
      await tx
        .insert(userRoles)
        .values(roleIds.map((roleId) => ({ userId, roleId })))
        .onConflictDoNothing();
    }

    const [userRow] = await tx.select().from(users).where(eq(users.id, userId));
    if (!userRow) return null;

    return {
      id: userRow.id,
      name: userRow.name ?? null,
      email: resolveUserEmail(userRow),
      status: userRow.status as UserStatus,
      roleIds,
      createdAt: userRow.createdAt,
      updatedAt: userRow.updatedAt,
      lastLoginAt: userRow.lastLoginAt ?? null,
    };
  });
}

export async function disableUser(userId: string) {
  if (await userHasAdminRole(userId)) {
    await ensureNotLastAdmin(userId);
  }
  const [row] = await db
    .update(users)
    .set({ status: "inactive", updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return row ?? null;
}

export async function enableUser(userId: string) {
  const [row] = await db
    .update(users)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return row ?? null;
}

export async function deleteUser(userId: string) {
  if (await userHasAdminRole(userId)) {
    await ensureNotLastAdmin(userId);
  }
  const [row] = await db.delete(users).where(eq(users.id, userId)).returning();
  return row ?? null;
}
