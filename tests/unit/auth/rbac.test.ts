import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import { roles, userRoles, users } from "../../../core/db/schema";
import {
  requirePermission,
  type PermissionRequirement,
} from "../../../core/server/middleware/rbac";
import {
  buildAdminPermissionSnapshotFromRoles,
  getAdminPermissionSnapshot,
  hasPermission,
  mergePermissions,
  type RoleQueryExecutor,
} from "../../../core/services/auth/roleService";

type TestRoleRow = {
  id: string;
  name: string;
  permissions: unknown;
};

type RoleQueryTrace = {
  selectCalls: number;
  selectedFields: Record<string, unknown> | null;
  selectedKeys: string[];
  fromTable: unknown;
  joinedTable: unknown;
  joinCondition: unknown;
  whereCalls: number;
  whereCondition: unknown;
};

const createRecordingRoleExecutor = (roleRows: readonly TestRoleRow[]) => {
  const trace: RoleQueryTrace = {
    selectCalls: 0,
    selectedFields: null,
    selectedKeys: [],
    fromTable: null,
    joinedTable: null,
    joinCondition: null,
    whereCalls: 0,
    whereCondition: null,
  };
  const executor = {
    select: (fields: Record<string, unknown>) => {
      trace.selectCalls += 1;
      trace.selectedFields = fields;
      trace.selectedKeys = Object.keys(fields);
      return {
        from: (table: unknown) => {
          trace.fromTable = table;
          return {
            innerJoin: (tableToJoin: unknown, condition: unknown) => {
              trace.joinedTable = tableToJoin;
              trace.joinCondition = condition;
              return {
                where: (conditionToApply: unknown) => {
                  trace.whereCalls += 1;
                  trace.whereCondition = conditionToApply;
                  return Promise.resolve([...roleRows]);
                },
              };
            },
          };
        },
      };
    },
  } as unknown as RoleQueryExecutor;

  return { executor, trace };
};

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const testIfDbWithOptions = testIfDb as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;

type OwnedRbacFixture = Readonly<{
  userId: string;
  roleId: string;
}>;

const deleteOwnedRbacFixture = async (fixture: OwnedRbacFixture) => {
  await db.delete(userRoles).where(eq(userRoles.userId, fixture.userId));
  await db.delete(roles).where(eq(roles.id, fixture.roleId));
  await db.delete(users).where(eq(users.id, fixture.userId));
};

const createOwnedRbacFixture = async (
  permissions: string[],
  options: Readonly<{ assignRole?: boolean }> = {}
): Promise<OwnedRbacFixture> => {
  const [user] = await db
    .insert(users)
    .values({
      email: `rbac-${randomUUID()}@example.com`,
      passwordHash: "test",
      status: "active",
    })
    .returning({ id: users.id });
  if (!user) throw new Error("missing_rbac_test_user");

  let roleId: string | null = null;
  try {
    const [role] = await db
      .insert(roles)
      .values({
        name: `rbac-role-${randomUUID()}`,
        permissions,
      })
      .returning({ id: roles.id });
    if (!role) throw new Error("missing_rbac_test_role");
    roleId = role.id;

    if (options.assignRole !== false) {
      await db.insert(userRoles).values({ userId: user.id, roleId: role.id });
    }
    return { userId: user.id, roleId: role.id };
  } catch (error) {
    if (roleId) await db.delete(roles).where(eq(roles.id, roleId));
    await db.delete(users).where(eq(users.id, user.id));
    throw error;
  }
};

const createSignal = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

test("mergePermissions merges unique values", () => {
  const merged = mergePermissions([
    ["content:read", "content:write"],
    ["content:write", "users:read"],
  ]);

  expect(merged).toEqual(expect.arrayContaining(["content:read", "content:write", "users:read"]));
});

test("hasPermission respects wildcard", () => {
  expect(hasPermission(["*"], "content:read")).toBe(true);
  expect(hasPermission(["content:read"], "content:read")).toBe(true);
  expect(hasPermission(["content:read"], "content:write")).toBe(false);
});

test("buildAdminPermissionSnapshotFromRoles redacts roles and normalizes permissions", () => {
  const snapshot = buildAdminPermissionSnapshotFromRoles([
    {
      id: "role-2",
      name: "Content Editors",
      permissions: ["content:write", "content:read", "content:write", 123],
    },
    {
      id: "role-1",
      name: "Full Access",
      permissions: ["*"],
    },
    {
      id: "role-3",
      name: "Broken Permissions",
      permissions: "settings:read",
    },
  ]);

  expect(snapshot.permissions).toEqual(["*", "content:read", "content:write"]);
  expect(snapshot.roles).toEqual([
    { id: "role-3", slug: "broken-permissions", name: "Broken Permissions" },
    { id: "role-2", slug: "content-editors", name: "Content Editors" },
    { id: "role-1", slug: "full-access", name: "Full Access" },
  ]);
});

test("getAdminPermissionSnapshot performs one minimal joined role query", async () => {
  const { executor, trace } = createRecordingRoleExecutor([
    {
      id: "role-joined",
      name: "Joined Role",
      permissions: ["content:write"],
    },
  ]);

  const snapshot = await getAdminPermissionSnapshot("actor-joined", executor);

  expect(snapshot).toEqual({
    permissions: ["content:write"],
    roles: [{ id: "role-joined", slug: "joined-role", name: "Joined Role" }],
  });
  expect(trace.selectCalls).toBe(1);
  expect(trace.selectedKeys).toEqual(["id", "name", "permissions"]);
  expect(trace.selectedFields?.id).toBe(roles.id);
  expect(trace.selectedFields?.name).toBe(roles.name);
  expect(trace.selectedFields?.permissions).toBe(roles.permissions);
  expect(trace.fromTable).toBe(userRoles);
  expect(trace.joinedTable).toBe(roles);
  expect(trace.joinCondition).toBeDefined();
  expect(trace.whereCalls).toBe(1);
  expect(trace.whereCondition).toBeDefined();
});

test("requirePermission preserves string guards and evaluates non-empty arrays as all-of", async () => {
  const cases: ReadonlyArray<
    Readonly<{
      name: string;
      requirement: PermissionRequirement;
      permissions: string[];
      allowed: boolean;
    }>
  > = [
    {
      name: "legacy string allow",
      requirement: "content:write",
      permissions: ["content:write"],
      allowed: true,
    },
    {
      name: "legacy string deny",
      requirement: "content:publish",
      permissions: ["content:write"],
      allowed: false,
    },
    {
      name: "all-of allow",
      requirement: ["content:write", "content:publish"],
      permissions: ["content:publish", "content:write"],
      allowed: true,
    },
    {
      name: "all-of missing member deny",
      requirement: ["content:write", "content:publish"],
      permissions: ["content:write"],
      allowed: false,
    },
    {
      name: "wildcard string allow",
      requirement: "content:publish",
      permissions: ["*"],
      allowed: true,
    },
    {
      name: "wildcard all-of allow",
      requirement: ["content:write", "content:publish"],
      permissions: ["*"],
      allowed: true,
    },
  ];

  for (const item of cases) {
    const { executor, trace } = createRecordingRoleExecutor([
      { id: `role-${item.name}`, name: item.name, permissions: item.permissions },
    ]);
    const guarded = requirePermission(item.requirement)({ user: { id: "actor" } }, executor);
    if (item.allowed) {
      await expect(guarded).resolves.toBeUndefined();
    } else {
      await expect(guarded).rejects.toThrow("forbidden");
    }
    expect(trace.selectCalls, item.name).toBe(1);
  }
});

test("requirePermission rejects an empty all-of requirement before querying", async () => {
  const { executor, trace } = createRecordingRoleExecutor([
    { id: "role-wildcard", name: "Wildcard", permissions: ["*"] },
  ]);

  await expect(requirePermission([])({ user: { id: "actor" } }, executor)).rejects.toThrow(
    "forbidden"
  );
  expect(trace.selectCalls).toBe(0);
});

test("requirePermission rejects a missing actor before querying", async () => {
  const { executor, trace } = createRecordingRoleExecutor([
    { id: "role-wildcard", name: "Wildcard", permissions: ["*"] },
  ]);

  await expect(requirePermission("content:write")({}, executor)).rejects.toThrow("auth_required");
  expect(trace.selectCalls).toBe(0);
});

testIfDbWithOptions(
  "permission snapshots observe commits before the joined statement but not later commits",
  async () => {
    const fixture = await createOwnedRbacFixture(["content:write"], { assignRole: false });
    const updateStarted = createSignal();
    const releaseUpdate = createSignal();
    let pendingUpdate: Promise<void> | null = null;
    const guardThroughTransaction = (requirement: PermissionRequirement) =>
      db.transaction((tx) => requirePermission(requirement)({ user: { id: fixture.userId } }, tx));

    try {
      await expect(guardThroughTransaction("content:write")).rejects.toThrow("forbidden");

      await db.insert(userRoles).values({ userId: fixture.userId, roleId: fixture.roleId });
      await expect(guardThroughTransaction("content:write")).resolves.toBeUndefined();

      pendingUpdate = db.transaction(async (tx) => {
        await tx
          .update(roles)
          .set({ permissions: ["content:publish"] })
          .where(eq(roles.id, fixture.roleId));
        updateStarted.resolve();
        await releaseUpdate.promise;
      });
      await updateStarted.promise;

      await expect(guardThroughTransaction("content:write")).resolves.toBeUndefined();

      releaseUpdate.resolve();
      await pendingUpdate;
      pendingUpdate = null;

      await expect(guardThroughTransaction("content:write")).rejects.toThrow("forbidden");
      await expect(guardThroughTransaction("content:publish")).resolves.toBeUndefined();
    } finally {
      releaseUpdate.resolve();
      await pendingUpdate?.catch(() => undefined);
      await deleteOwnedRbacFixture(fixture);
    }
  },
  { timeout: 30_000 }
);

testIfDbWithOptions(
  "transaction-bound RBAC completes with DB_POOL_MAX=1 and fails closed on a missing permission",
  async () => {
    const fixture = await createOwnedRbacFixture(["content:write"]);
    let child: (Bun.Subprocess & { kill: () => void }) | null = null;
    let childFinished = false;
    let exitCode: number | null = null;

    try {
      const childScript = `
        const deadline = setTimeout(() => {
          process.stderr.write("rbac_pool_one_child_deadline_exceeded");
          process.exit(2);
        }, 4_000);
        try {
          const userId = process.env.RBAC_TEST_USER_ID;
          if (!userId) throw new Error("missing_child_user_id");
          const { db } = await import("./core/db/client.ts");
          const { requirePermission } = await import("./core/server/middleware/rbac.ts");
          let denied = false;
          await db.transaction(async (tx) => {
            await requirePermission("content:write")({ user: { id: userId } }, tx);
            try {
              await requirePermission(["content:write", "content:publish"])(
                { user: { id: userId } },
                tx
              );
            } catch (error) {
              if (!(error instanceof Error) || error.message !== "forbidden") throw error;
              denied = true;
            }
          });
          if (!denied) throw new Error("missing_child_permission_denial");
          clearTimeout(deadline);
          process.stdout.write("rbac_pool_one_ok");
          process.exit(0);
        } catch (error) {
          clearTimeout(deadline);
          process.stderr.write(error instanceof Error ? error.stack ?? error.message : String(error));
          process.exit(1);
        }
      `;
      child = Bun.spawn({
        cmd: [process.execPath, "-e", childScript],
        cwd: process.cwd(),
        env: {
          ...process.env,
          DB_POOL_MAX: "1",
          RBAC_TEST_USER_ID: fixture.userId,
        },
        stdout: "pipe",
        stderr: "pipe",
      }) as Bun.Subprocess & { kill: () => void };
      const stdoutPromise = new Response(child.stdout).text();
      const stderrPromise = new Response(child.stderr).text();
      let deadlineError: Error | null = null;
      let deadline: ReturnType<typeof setTimeout> | null = null;

      try {
        exitCode = await Promise.race([
          child.exited,
          new Promise<never>((_, reject) => {
            deadline = setTimeout(
              () => reject(new Error("rbac_pool_one_deadline_exceeded")),
              6_000
            );
          }),
        ]);
      } catch (error) {
        deadlineError = error instanceof Error ? error : new Error(String(error));
      } finally {
        if (deadline) clearTimeout(deadline);
        if (exitCode === null) {
          child.kill();
          await child.exited;
        }
        childFinished = true;
      }

      const [stdout, stderr] = await Promise.all([stdoutPromise, stderrPromise]);
      if (deadlineError) {
        throw new Error(`${deadlineError.message}:${stderr}`);
      }
      expect(exitCode).toBe(0);
      expect(stdout).toContain("rbac_pool_one_ok");
      expect(stderr).toBe("");
    } finally {
      try {
        if (child && !childFinished) {
          child.kill();
          await child.exited;
        }
      } finally {
        await deleteOwnedRbacFixture(fixture);
      }
    }
  },
  { timeout: 15_000 }
);
