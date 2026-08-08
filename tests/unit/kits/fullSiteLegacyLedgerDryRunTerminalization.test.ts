import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { acquireNativeCmsWriterFence } from "../../../core/db/nativeCmsWriterFence";
import { solutionKitInstallRuns, users } from "../../../core/db/schema";
import type { FullSiteOwnedRunFinalizationResult } from "../../../core/services/kits/fullSiteInstallTypes";
import { createLegacyInstallLedger } from "../../../core/services/kits/legacyInstallRunPersistence";
import { createOwnedRunFinalization } from "../../../core/services/kits/legacyInstallRunPersistence/dryRunTerminalization";

type FinalizationDatabase = NonNullable<Parameters<typeof createOwnedRunFinalization>[0]>;

const createActor = async (): Promise<string> => {
  const actorId = randomUUID();
  await db.insert(users).values({
    id: actorId,
    email: `full-site-finalize-${actorId}@example.test`,
    passwordHash: "test-only-password-hash",
  });
  return actorId;
};

const insertSource = async (
  input: Readonly<{
    id?: string;
    packageKey: string;
    actorId: string;
    status?: "running" | "success" | "failed";
  }>
) => {
  const id = input.id ?? randomUUID();
  const now = new Date();
  await db.insert(solutionKitInstallRuns).values({
    id,
    kitId: input.packageKey,
    mode: "apply",
    status: input.status ?? "running",
    actorId: input.actorId,
    options: {},
    summary: {},
    error: null,
    createdAt: now,
    updatedAt: now,
    finishedAt: input.status === "success" ? now : null,
  });
  return id;
};

const cleanup = async (runIds: ReadonlySet<string>, actorId: string): Promise<void> => {
  if (runIds.size > 0) {
    await db.delete(solutionKitInstallRuns).where(inArray(solutionKitInstallRuns.id, [...runIds]));
  }
  await db.delete(users).where(eq(users.id, actorId));
};

const mapDesired = (result: FullSiteOwnedRunFinalizationResult): void => {
  if (result.outcome !== "desired_terminal") throw new Error("site_package_recovery_conflict");
};

test.each([
  { dryRun: false, status: "success" as const, error: null },
  { dryRun: true, status: "failed" as const, error: "site_package_invalid" },
])(
  "finalizeOwnedRun closes $dryRun apply owner in one desired terminal",
  async (terminal) => {
    const actorId = await createActor();
    const packageKey = `finalize-owner-${randomUUID()}`;
    const options = { request: packageKey };
    const ledger = createLegacyInstallLedger();
    const runIds = new Set<string>();
    try {
      const result = await ledger.withPackageLock(
        { intent: "apply", packageKey, actorId, dryRun: terminal.dryRun, options },
        async (context) => {
          runIds.add(context.ownerRunId);
          const outcome = await ledger.finalizeOwnedRun({
            ownerRunId: context.ownerRunId,
            status: terminal.status,
            error: terminal.error,
          });
          mapDesired(outcome);
          return outcome;
        }
      );
      expect(result.outcome).toBe("desired_terminal");
      const [owner] = await db
        .select()
        .from(solutionKitInstallRuns)
        .where(eq(solutionKitInstallRuns.id, [...runIds][0]!));
      expect(owner).toMatchObject({ status: terminal.status, error: terminal.error });
      expect(owner?.options).not.toHaveProperty("nativeCmsWriterFenceV1");
    } finally {
      await cleanup(runIds, actorId);
    }
  },
  360_000
);

test("explicit rollback finalization atomically marks its interrupted apply source", async () => {
  const actorId = await createActor();
  const packageKey = `finalize-interrupted-${randomUUID()}`;
  const sourceRunId = await insertSource({ packageKey, actorId });
  const runIds = new Set<string>([sourceRunId]);
  const ledger = createLegacyInstallLedger();
  const options = { request: packageKey };
  try {
    await ledger.withPackageLock(
      { intent: "explicit_rollback", packageKey, actorId, sourceRunId, options },
      async (context) => {
        runIds.add(context.ownerRunId);
        const result = await ledger.finalizeOwnedRun({
          ownerRunId: context.ownerRunId,
          status: "success",
          error: null,
          interruptedApplySource: {
            runId: sourceRunId,
            status: "failed",
            error: "site_package_apply_interrupted",
          },
        });
        mapDesired(result);
      }
    );
    const rows = await db
      .select()
      .from(solutionKitInstallRuns)
      .where(inArray(solutionKitInstallRuns.id, [...runIds]));
    const source = rows.find((row) => row.id === sourceRunId);
    const owner = rows.find((row) => row.id !== sourceRunId);
    expect(source).toMatchObject({
      status: "failed",
      error: "site_package_apply_interrupted",
    });
    expect(owner).toMatchObject({ status: "success", error: null });
    expect(owner?.options).not.toHaveProperty("nativeCmsWriterFenceV1");
  } finally {
    await cleanup(runIds, actorId);
  }
}, 360_000);

test("apply finalization atomically closes its unmarked automatic compensation child", async () => {
  const actorId = await createActor();
  const packageKey = `finalize-compensation-${randomUUID()}`;
  const options = { request: packageKey };
  const ledger = createLegacyInstallLedger();
  const runIds = new Set<string>();
  let childRunId: string | null = null;
  try {
    await ledger.withPackageLock(
      { intent: "apply", packageKey, actorId, dryRun: false, options },
      async (context) => {
        runIds.add(context.ownerRunId);
        childRunId = randomUUID();
        runIds.add(childRunId);
        await db.transaction(
          async (tx) => {
            await acquireNativeCmsWriterFence(tx);
            const now = new Date();
            await tx.insert(solutionKitInstallRuns).values({
              id: childRunId!,
              kitId: packageKey,
              mode: "rollback",
              status: "running",
              actorId,
              rollbackOfRunId: context.ownerRunId,
              options: { automaticCompensation: true },
              summary: {},
              error: null,
              createdAt: now,
              updatedAt: now,
            });
          },
          { isolationLevel: "read committed" }
        );
        const result = await ledger.finalizeOwnedRun({
          ownerRunId: context.ownerRunId,
          status: "failed",
          error: "site_package_apply_failed",
          automaticCompensation: { runId: childRunId!, status: "success", error: null },
        });
        mapDesired(result);
      }
    );
    const rows = await db
      .select()
      .from(solutionKitInstallRuns)
      .where(inArray(solutionKitInstallRuns.id, [...runIds]));
    expect(rows.find((row) => row.id === childRunId)).toMatchObject({
      status: "success",
      error: null,
    });
    expect(rows.find((row) => row.id !== childRunId)).toMatchObject({
      status: "failed",
      error: "site_package_apply_failed",
    });
  } finally {
    await cleanup(runIds, actorId);
  }
}, 360_000);

test.each(["desired", "different"])(
  "ambiguous commit reread returns the immutable %s terminal outcome",
  async (terminalKind) => {
    const actorId = await createActor();
    const packageKey = `finalize-ambiguous-${randomUUID()}`;
    const options = { request: packageKey };
    const ledger = createLegacyInstallLedger();
    const runIds = new Set<string>();
    let transactions = 0;
    const ambiguousDatabase: FinalizationDatabase = {
      async transaction(callback, config) {
        transactions += 1;
        const result = await db.transaction(callback, config);
        if (transactions === 1) {
          if (terminalKind === "different") {
            const ownerRunId = [...runIds][0];
            if (!ownerRunId) throw new Error("owner_run_missing");
            await db
              .update(solutionKitInstallRuns)
              .set({
                status: "failed",
                error: "site_package_invalid",
              })
              .where(eq(solutionKitInstallRuns.id, ownerRunId));
          }
          throw new Error("ambiguous-commit-driver-sentinel");
        }
        return result;
      },
    };
    const finalizer = createOwnedRunFinalization(ambiguousDatabase);
    try {
      const outcome = await ledger.withPackageLock(
        { intent: "apply", packageKey, actorId, dryRun: false, options },
        async (context) => {
          runIds.add(context.ownerRunId);
          const result = await finalizer.finalizeOwnedRun({
            ownerRunId: context.ownerRunId,
            status: "success",
            error: null,
          });
          if (terminalKind === "desired") mapDesired(result);
          return result;
        }
      );
      expect(outcome.outcome).toBe(
        terminalKind === "desired" ? "desired_terminal" : "different_terminal"
      );
      expect(transactions).toBe(2);
    } finally {
      await cleanup(runIds, actorId);
    }
  },
  360_000
);

test("invalid finalization input fails before closing or database I/O", async () => {
  let transactionCalls = 0;
  const database = {
    transaction: async () => {
      transactionCalls += 1;
      throw new Error("transaction_must_not_run");
    },
  } as unknown as FinalizationDatabase;
  const finalizer = createOwnedRunFinalization(database);

  await expect(
    finalizer.finalizeOwnedRun({
      ownerRunId: randomUUID(),
      status: "success",
      error: null,
      extra: true,
    } as never)
  ).rejects.toThrow("site_package_invalid");
  expect(transactionCalls).toBe(0);
});
