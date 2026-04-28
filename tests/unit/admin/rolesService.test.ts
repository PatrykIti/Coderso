import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { roles } from "../../../core/db/schema";
import {
  createRole,
  deleteRole,
  updateRole,
} from "../../../core/services/admin/rolesService";

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

afterAll(async () => {
  if (roleId) {
    await db.delete(roles).where(eq(roles.id, roleId));
  }
});

testIfDb("create/update/delete role", async () => {
  const created = await createRole({
    name: `role-${randomUUID()}`,
    description: "Test role",
    permissions: ["content:read"],
  });

  roleId = created?.id;
  if (!created) throw new Error("missing_created_role");

  const updated = await updateRole(created.id, {
    description: "Updated role",
  });

  expect(updated?.description).toBe("Updated role");

  const deleted = await deleteRole(created.id);
  expect(deleted?.id).toBe(created.id);

  roleId = undefined;
});
