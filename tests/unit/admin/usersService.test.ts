import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { roles, users } from "../../../core/db/schema";
import {
  createUser,
  deleteUser,
  disableUser,
  enableUser,
  setUserRoles,
  updateUser,
} from "../../../core/services/admin/usersService";

process.env.PII_HASH_KEY ||= "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.PII_ENC_KEY ||= "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

let roleId: string | undefined;
let userId: string | undefined;

afterAll(async () => {
  if (userId) {
    await db.delete(users).where(eq(users.id, userId));
  }
  if (roleId) {
    await db.delete(roles).where(eq(roles.id, roleId));
  }
});

testIfDb("create/update/disable user", async () => {
  const roleName = `role-${randomUUID()}`;
  const [role] = await db
    .insert(roles)
    .values({
      name: roleName,
      description: "Test role",
      permissions: ["content:read"],
      createdAt: new Date(),
    })
    .returning();

  roleId = role.id;

  const created = await createUser({
    name: "Test User",
    email: `user-${randomUUID()}@example.com`,
    roleIds: [role.id],
    status: "active",
  });

  expect(created?.roleIds).toContain(role.id);
  userId = created?.id;
  if (!created) throw new Error("missing_created_user");

  const updated = await updateUser(created.id, { name: "Updated" });
  expect(updated?.name).toBe("Updated");

  const rolesUpdated = await setUserRoles(created.id, []);
  expect(rolesUpdated?.roleIds.length).toBe(0);

  const disabled = await disableUser(created.id);
  expect(disabled?.status).toBe("inactive");

  const enabled = await enableUser(created.id);
  expect(enabled?.status).toBe("active");

  const deleted = await deleteUser(created.id);
  expect(deleted?.id).toBe(created.id);

  userId = undefined;
});
