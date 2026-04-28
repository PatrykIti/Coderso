import { afterAll, beforeEach, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  solutionKitInstallItems,
  solutionKitInstallRuns,
} from "../../../core/db/schema";

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

const cleanup = async () => {
  if (!hasDb) return;
  await db.delete(solutionKitInstallItems);
  await db.delete(solutionKitInstallRuns);
};

beforeEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

testIfDb("solution kit install tables accept inserts and cascade items", async () => {
  const [run] = await db
    .insert(solutionKitInstallRuns)
    .values({
      kitId: "automotive-workshop",
      mode: "apply",
      status: "running",
      options: {},
      summary: {},
    })
    .returning();

  const [item] = await db
    .insert(solutionKitInstallItems)
    .values({
      runId: run.id,
      position: 0,
      resourceType: "page",
      resourceKey: "/",
      operation: "create",
      status: "success",
      rollbackAction: { strategy: "delete_by_id", id: "x" },
    })
    .returning();

  expect(item.runId).toBe(run.id);

  await db.delete(solutionKitInstallRuns).where(eq(solutionKitInstallRuns.id, run.id));

  const remaining = await db
    .select({ id: solutionKitInstallItems.id })
    .from(solutionKitInstallItems)
    .where(eq(solutionKitInstallItems.runId, run.id));
  expect(remaining.length).toBe(0);
});

testIfDb("solution kit install items enforce run resource uniqueness", async () => {
  const [run] = await db
    .insert(solutionKitInstallRuns)
    .values({
      kitId: "automotive-workshop",
      mode: "apply",
      status: "running",
      options: {},
      summary: {},
    })
    .returning();

  await db.insert(solutionKitInstallItems).values({
    runId: run.id,
    position: 0,
    resourceType: "form",
    resourceKey: "contact",
    operation: "create",
    status: "success",
  });

  await expect(
    db
      .insert(solutionKitInstallItems)
      .values({
        runId: run.id,
        position: 1,
        resourceType: "form",
        resourceKey: "contact",
        operation: "update",
        status: "success",
      })
      .execute()
  ).rejects.toThrow();
});

