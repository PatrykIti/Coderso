import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { roles } from "../../../core/db/schema";
import {
  createRole,
  deleteRole,
  updateRole,
  updateRoleWithTransition,
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

const roleIds = new Set<string>();

afterAll(async () => {
  for (const roleId of roleIds) {
    await db.delete(roles).where(eq(roles.id, roleId));
  }
});

testIfDb("create/update/delete role", async () => {
  const created = await createRole({
    name: `role-${randomUUID()}`,
    description: "Test role",
    permissions: ["content:read"],
  });

  if (created) roleIds.add(created.id);
  if (!created) throw new Error("missing_created_role");

  const updated = await updateRole(created.id, {
    description: "Updated role",
  });

  expect(updated?.description).toBe("Updated role");

  const deleted = await deleteRole(created.id);
  expect(deleted?.id).toBe(created.id);

  roleIds.delete(created.id);
});

testIfDb("updateRoleWithTransition returns locked before and after role snapshots", async () => {
  const created = await createRole({
    name: `transition-role-${randomUUID()}`,
    description: "Transition source",
    permissions: ["content:read"],
  });

  if (!created) throw new Error("missing_created_role");
  roleIds.add(created.id);
  const nextName = `transition-role-renamed-${randomUUID()}`;

  const transition = await updateRoleWithTransition(created.id, {
    name: nextName,
    permissions: ["content:read", "roles:write"],
  });

  expect(transition?.before).toEqual(
    expect.objectContaining({
      id: created.id,
      name: created.name,
      description: "Transition source",
      permissions: ["content:read"],
      system: false,
    })
  );
  expect(transition?.after).toEqual(
    expect.objectContaining({
      id: created.id,
      name: nextName,
      description: "Transition source",
      permissions: ["content:read", "roles:write"],
      system: false,
    })
  );

  const deleted = await deleteRole(created.id);
  expect(deleted?.id).toBe(created.id);
  roleIds.delete(created.id);
});
