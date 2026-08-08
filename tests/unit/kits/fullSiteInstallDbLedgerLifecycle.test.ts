import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  contentEntries,
  contentTypes,
  forms,
  solutionKitInstallRuns,
  users,
} from "../../../core/db/schema";
import {
  FULL_SITE_ROLLBACK_ADAPTERS,
  type FullSiteNativeSnapshot,
  type FullSiteRollbackAdapters,
} from "../../../core/services/kits/fullSiteInstall/adapters";
import { createFullSiteCurrentResourceResolver } from "../../../core/services/kits/fullSiteInstall/currentResourceResolver";
import { rollbackFullSiteInstall } from "../../../core/services/kits/fullSiteInstall/rollback";
import { buildFullSiteDurableAfterSnapshotV1 } from "../../../core/services/kits/fullSiteInstall/staging";
import { createLegacyInstallLedger } from "../../../core/services/kits/legacyInstallRunPersistence";

type SnapshotState = Map<string, FullSiteNativeSnapshot>;

const settingRollbackAdapters = (
  calls: string[],
  state: SnapshotState
): FullSiteRollbackAdapters => ({
  ...FULL_SITE_ROLLBACK_ADAPTERS,
  setting: {
    ...FULL_SITE_ROLLBACK_ADAPTERS.setting,
    captureSnapshotByIdOrNull: async (id) => state.get(id) ?? null,
    deleteSnapshotAtomic: async (input) => {
      expect(state.get(input.id) ?? null).toEqual(input.expectedCurrent);
      state.delete(input.id);
      calls.push(`delete:setting:${input.id}`);
    },
    restoreSnapshotAtomic: async (input) => {
      expect(state.get(input.id) ?? null).toEqual(input.expectedCurrent);
      state.set(input.id, input.target);
      calls.push(`restore:setting:${input.id}:${String(input.target.desired.value)}`);
    },
    reverseSettingsBatch: async ({ items }) => {
      for (const item of items) {
        expect(state.get(item.id) ?? null).toEqual(item.expectedCurrent);
      }
      for (const item of items) {
        if (item.target) {
          state.set(item.id, item.target);
          calls.push(`restore:setting:${item.id}:${String(item.target.desired.value)}`);
        } else {
          state.delete(item.id);
          calls.push(`delete:setting:${item.id}`);
        }
      }
    },
  },
});

describe("full-site DB ledger lifecycle", () => {
  test("serializes concurrent rollback claims and resumes the failed owner", async () => {
    const scope = crypto.randomUUID();
    const packageKey = `task-547-claim-${scope}`;
    const [actor] = await db
      .insert(users)
      .values({
        email: `${scope}@claim.task-547.invalid`,
        passwordHash: "task-547-not-a-login",
        status: "inactive",
      })
      .returning({ id: users.id });
    if (!actor) throw new Error("actor_fixture_failed");
    const port = createLegacyInstallLedger();
    try {
      const source = await port.createRun({
        packageKey,
        actorId: actor.id,
        dryRun: false,
      });
      await port.finalizeRun({ runId: source.id, status: "success" });
      if (!port.claimRollbackRun) throw new Error("rollback_claim_missing");
      const claims = await Promise.all([
        port.claimRollbackRun({
          sourceRunId: source.id,
          packageKey,
          actorId: actor.id,
        }),
        port.claimRollbackRun({
          sourceRunId: source.id,
          packageKey,
          actorId: actor.id,
        }),
      ]);
      expect(new Set(claims.map((claim) => claim.id)).size).toBe(1);
      expect(claims.map((claim) => claim.state).sort()).toEqual(["busy", "created"]);
      await port.finalizeRun({
        runId: claims[0]!.id,
        status: "failed",
        error: "injected_partial_failure",
      });
      const resumed = await port.claimRollbackRun({
        sourceRunId: source.id,
        packageKey,
        actorId: actor.id,
      });
      expect(resumed).toEqual({ id: claims[0]!.id, state: "resumed" });
      await port.finalizeRun({
        runId: resumed.id,
        status: "failed",
        error: "retry_failed",
      });
      const competing = await port.createRollbackRun({
        sourceRunId: source.id,
        packageKey,
        actorId: actor.id,
      });
      await port.finalizeRun({
        runId: competing.id,
        status: "failed",
        error: "competing_failed_owner",
      });
      await db
        .update(solutionKitInstallRuns)
        .set({ createdAt: new Date(Date.now() + 1_000) })
        .where(eq(solutionKitInstallRuns.id, competing.id));
      expect(
        await port.claimRollbackRun({
          sourceRunId: source.id,
          packageKey,
          actorId: actor.id,
        })
      ).toEqual({ id: resumed.id, state: "resumed" });
    } finally {
      await db.delete(solutionKitInstallRuns).where(eq(solutionKitInstallRuns.kitId, packageKey));
      await db.delete(users).where(eq(users.id, actor.id));
    }
  });

  test("serializes complete package lifecycles under one advisory lock", async () => {
    const port = createLegacyInstallLedger();
    const scope = crypto.randomUUID();
    const packageKey = `task-547-package-lock-${scope}`;
    const [actor] = await db
      .insert(users)
      .values({
        email: `${scope}@package-lock.task-547.invalid`,
        passwordHash: "task-547-not-a-login",
        status: "inactive",
      })
      .returning({ id: users.id });
    if (!actor) throw new Error("actor_fixture_failed");
    const reservation = {
      intent: "apply" as const,
      packageKey,
      actorId: actor.id,
      dryRun: false,
      options: { fullSitePackage: true },
    };
    const order: string[] = [];
    let releaseFirst: () => void = () => undefined;
    let markFirstEntered: () => void = () => undefined;
    const firstEntered = new Promise<void>((resolve) => {
      markFirstEntered = () => resolve();
    });
    const firstRelease = new Promise<void>((resolve) => {
      releaseFirst = () => resolve();
    });
    const pending: Promise<void>[] = [];
    try {
      const first = port.withPackageLock(reservation, async () => {
        order.push("first:start");
        markFirstEntered();
        await firstRelease;
        order.push("first:end");
      });
      pending.push(first);
      await firstEntered;
      const second = port.withPackageLock(reservation, async () => {
        order.push("second:start");
        order.push("second:end");
      });
      pending.push(second);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(order).toEqual(["first:start"]);
      releaseFirst();
      await Promise.all([first, second]);
      expect(order).toEqual(["first:start", "first:end", "second:start", "second:end"]);
    } finally {
      releaseFirst();
      await Promise.allSettled(pending);
      await db.delete(solutionKitInstallRuns).where(eq(solutionKitInstallRuns.kitId, packageKey));
      await db.delete(users).where(eq(users.id, actor.id));
    }
  });

  test("noop does not replace mutation ownership but a later update does", async () => {
    const scope = crypto.randomUUID();
    const packageKey = `task-547-evidence-${scope}`;
    const [actor] = await db
      .insert(users)
      .values({
        email: `${scope}@evidence.task-547.invalid`,
        passwordHash: "task-547-not-a-login",
        status: "inactive",
      })
      .returning({ id: users.id });
    if (!actor) throw new Error("actor_fixture_failed");
    const port = createLegacyInstallLedger();
    const recordRun = async (operation: "create" | "update" | "noop") => {
      const run = await port.createRun({
        packageKey,
        actorId: actor.id,
        dryRun: false,
      });
      await port.recordItem({
        runId: run.id,
        position: 0,
        kind: "page",
        key: "home",
        operation,
        status: "success",
        beforeSnapshot: null,
        afterSnapshot: { id: "page-id", desired: { marker: operation } },
      });
      await port.finalizeRun({ runId: run.id, status: "success" });
      return run;
    };
    try {
      const mutation = await recordRun("create");
      await recordRun("noop");
      expect(
        await port.findManagedResourceEvidence({
          packageKey,
          kind: "page",
          key: "home",
        })
      ).toMatchObject({ runId: mutation.id });
      const update = await recordRun("update");
      expect(
        await port.findManagedResourceEvidence({
          packageKey,
          kind: "page",
          key: "home",
        })
      ).toMatchObject({ runId: update.id });
    } finally {
      await db.delete(solutionKitInstallRuns).where(eq(solutionKitInstallRuns.kitId, packageKey));
      await db.delete(users).where(eq(users.id, actor.id));
    }
  });

  test("restores mutation ownership to the preceding active run after rollback", async () => {
    const scope = crypto.randomUUID();
    const packageKey = `task-547-rollback-evidence-${scope}`;
    const [actor] = await db
      .insert(users)
      .values({
        email: `${scope}@rollback-evidence.task-547.invalid`,
        passwordHash: "task-547-not-a-login",
        status: "inactive",
      })
      .returning({ id: users.id });
    if (!actor) throw new Error("actor_fixture_failed");
    const port = createLegacyInstallLedger();
    const recordMutation = async (marker: string) => {
      const run = await port.createRun({
        packageKey,
        actorId: actor.id,
        dryRun: false,
      });
      await port.recordItem({
        runId: run.id,
        position: 0,
        kind: "page",
        key: "home",
        operation: marker === "create" ? "create" : "update",
        status: "success",
        beforeSnapshot: null,
        afterSnapshot: { id: "page-id", desired: { marker } },
      });
      await port.finalizeRun({ runId: run.id, status: "success" });
      return run;
    };
    try {
      const createRun = await recordMutation("create");
      const updateRun = await recordMutation("update");
      const rollback = await port.createRollbackRun({
        sourceRunId: updateRun.id,
        packageKey,
        actorId: actor.id,
      });
      await port.recordItem({
        runId: rollback.id,
        position: 0,
        kind: "page",
        key: "home",
        operation: "update",
        status: "success",
        beforeSnapshot: { id: "page-id", desired: { marker: "update" } },
        afterSnapshot: { id: "page-id", desired: { marker: "create" } },
      });
      await port.finalizeRun({
        runId: rollback.id,
        status: "failed",
        error: "another_item_failed",
      });

      expect(
        await port.findManagedResourceEvidence({
          packageKey,
          kind: "page",
          key: "home",
        })
      ).toMatchObject({
        runId: createRun.id,
        resourceId: "page-id",
        desired: { marker: "create" },
        rolledBack: false,
      });
    } finally {
      await db.delete(solutionKitInstallRuns).where(eq(solutionKitInstallRuns.kitId, packageKey));
      await db.delete(users).where(eq(users.id, actor.id));
    }
  });

  test("resolves identical entry slugs only within the referenced content type", async () => {
    const scope = crypto.randomUUID();
    const slug = `shared-${scope}`;
    const [firstType, secondType] = await db
      .insert(contentTypes)
      .values([
        { name: `First ${scope}`, slug: `first-${scope}`, schema: {}, config: {} },
        { name: `Second ${scope}`, slug: `second-${scope}`, schema: {}, config: {} },
      ])
      .returning({ id: contentTypes.id });
    if (!firstType || !secondType) throw new Error("content_type_fixture_failed");
    const createdEntries = await db
      .insert(contentEntries)
      .values([
        { typeId: firstType.id, slug, title: "First", data: {}, status: "draft" },
        { typeId: secondType.id, slug, title: "Second", data: {}, status: "draft" },
      ])
      .returning({ id: contentEntries.id, typeId: contentEntries.typeId });
    try {
      const port = createLegacyInstallLedger();
      port.findManagedResourceEvidence = async ({ kind, key }) =>
        kind === "content_type" && key === "second"
          ? {
              runId: "run-id",
              resourceId: secondType.id,
              desired: {},
              successful: true,
              rolledBack: false,
            }
          : null;
      const resolver = createFullSiteCurrentResourceResolver("package", port);
      const resolved = await resolver("content_entry", {
        key: "entry",
        desired: {
          slug,
          contentTypeId: { ref: "content_type", key: "second" },
        },
      });
      expect(resolved?.id).toBe(createdEntries.find((entry) => entry.typeId === secondType.id)?.id);
    } finally {
      await db.delete(contentEntries).where(eq(contentEntries.slug, slug));
      await db.delete(contentTypes).where(eq(contentTypes.id, firstType.id));
      await db.delete(contentTypes).where(eq(contentTypes.id, secondType.id));
    }
  });

  test("detects an unmanaged native natural-key collision", async () => {
    const slug = `task-547-unmanaged-${crypto.randomUUID()}`;
    const [created] = await db
      .insert(forms)
      .values({ name: "Unmanaged fixture", slug, status: "draft", settings: {} })
      .returning({ id: forms.id });
    if (!created) throw new Error("site_package_test_form_create_failed");
    try {
      const resolver = createFullSiteCurrentResourceResolver(
        "package",
        createLegacyInstallLedger()
      );
      expect(await resolver("form", { key: "brief", desired: { slug } })).toEqual({
        id: created.id,
        desired: { slug },
      });
    } finally {
      await db.delete(forms).where(eq(forms.id, created.id));
    }
  });

  test("persists an exact apply source and successful scoped rollback proof", async () => {
    const scope = crypto.randomUUID();
    const packageKey = `task-547-${scope}`;
    const [actor] = await db
      .insert(users)
      .values({
        email: `${scope}@task-547.invalid`,
        passwordHash: "task-547-not-a-login",
        status: "inactive",
      })
      .returning({ id: users.id });
    if (!actor) throw new Error("site_package_test_actor_create_failed");
    const port = createLegacyInstallLedger();

    try {
      const source = await port.createRun({
        packageKey,
        actorId: actor.id,
        dryRun: false,
        options: { fullSitePackage: true, rollbackDependencySchemaVersion: 1 },
      });
      await port.recordItem({
        runId: source.id,
        position: 0,
        kind: "setting",
        key: "site.homepageId",
        operation: "update",
        status: "success",
        beforeSnapshot: {
          id: "site.homepageId",
          desired: { present: true, value: "before" },
        },
        afterSnapshot: buildFullSiteDurableAfterSnapshotV1({
          complete: {
            id: "site.homepageId",
            desired: { present: true, value: "after" },
          },
          staged: null,
          phase: "complete",
        }),
        rollbackAction: { schemaVersion: 1, dependencies: [] },
      });
      await port.finalizeRun({ runId: source.id, status: "success" });

      const calls: string[] = [];
      const rollbackAdapters = settingRollbackAdapters(
        calls,
        new Map([
          [
            "site.homepageId",
            {
              id: "site.homepageId",
              desired: { present: true, value: "after" },
            },
          ],
        ])
      );
      const result = await rollbackFullSiteInstall({
        sourceRunId: source.id,
        actorId: actor.id,
        ledger: port,
        adapters: rollbackAdapters,
        resolveCurrentResource: async () => ({
          id: "site.homepageId",
          desired: { present: true, value: "after" },
        }),
      });

      expect(calls).toEqual(["restore:setting:site.homepageId:before"]);
      expect(await port.hasSuccessfulRollback(source.id)).toBe(true);
      const rollbackRun = await port.getRun(result.runId);
      expect(rollbackRun).toMatchObject({
        packageKey,
        mode: "rollback",
        status: "success",
        rollbackOfRunId: source.id,
      });
      expect(await port.listItems(result.runId)).toHaveLength(1);
    } finally {
      await db.delete(solutionKitInstallRuns).where(eq(solutionKitInstallRuns.kitId, packageKey));
      await db.delete(users).where(eq(users.id, actor.id));
    }
  });
});
