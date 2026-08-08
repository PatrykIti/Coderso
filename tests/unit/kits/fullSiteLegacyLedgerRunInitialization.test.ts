import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { solutionKitInstallItems, solutionKitInstallRuns, users } from "../../../core/db/schema";
import {
  buildFullSiteRollbackActionV1,
  type FullSiteInitializedLedgerItemInput,
  type FullSiteReservedRunInitializationInput,
} from "../../../core/services/kits/fullSiteInstallTypes";
import { createLegacyInstallLedger } from "../../../core/services/kits/legacyInstallRunPersistence";
import { createRunInitialization } from "../../../core/services/kits/legacyInstallRunPersistence/runInitialization";

type InitializationDatabase = NonNullable<Parameters<typeof createRunInitialization>[0]>;

const makeItem = (position: number): FullSiteInitializedLedgerItemInput => {
  const key = `page-${position}`;
  return Object.freeze({
    position,
    kind: "page",
    key,
    operation: "create",
    beforeSnapshot: null,
    afterSnapshot: { id: key, desired: { value: position } },
    rollbackAction: buildFullSiteRollbackActionV1({
      identity: `page:${key}`,
      dependencies: [],
    }),
  });
};

const makeDottedSettingItem = (): FullSiteInitializedLedgerItemInput => ({
  position: 0,
  kind: "setting",
  key: "site.contentRoutes",
  operation: "create",
  beforeSnapshot: null,
  afterSnapshot: {
    id: "site.contentRoutes",
    desired: { present: true, value: [] },
  },
  rollbackAction: buildFullSiteRollbackActionV1({
    identity: "setting:site.contentRoutes",
    dependencies: [],
  }),
});

const createActor = async (): Promise<string> => {
  const actorId = randomUUID();
  await db.insert(users).values({
    id: actorId,
    email: `full-site-initialize-${actorId}@example.test`,
    passwordHash: "test-only-password-hash",
  });
  return actorId;
};

const cleanup = async (ownerRunId: string | null, actorId: string): Promise<void> => {
  if (ownerRunId) {
    await db.delete(solutionKitInstallRuns).where(eq(solutionKitInstallRuns.id, ownerRunId));
  }
  await db.delete(users).where(eq(users.id, actorId));
};

test.each([0, 1, 512])(
  "initializeReservedRun atomically persists the exact %i-item plan",
  async (count) => {
    const ledger = createLegacyInstallLedger();
    const actorId = await createActor();
    const packageKey = `initialize-${count}-${randomUUID()}`;
    const options = { request: packageKey };
    const items = Object.freeze(Array.from({ length: count }, (_, index) => makeItem(index)));
    let ownerRunId: string | null = null;
    try {
      const returned = await ledger.withPackageLock(
        { intent: "apply", packageKey, actorId, dryRun: false, options },
        async (context) => {
          if (context.intent !== "apply" || context.resumePhase !== "reserved") {
            throw new Error("reserved_context_missing");
          }
          ownerRunId = context.ownerRunId;
          return ledger.initializeReservedRun({
            ownerRunId: context.ownerRunId,
            packageKey,
            actorId,
            dryRun: false,
            options,
            items,
          });
        }
      );
      expect(returned.id).toBe(ownerRunId);
      const [owner] = await db
        .select({ options: solutionKitInstallRuns.options })
        .from(solutionKitInstallRuns)
        .where(eq(solutionKitInstallRuns.id, returned.id));
      const persistedItems = await db
        .select()
        .from(solutionKitInstallItems)
        .where(eq(solutionKitInstallItems.runId, returned.id));
      expect((owner?.options as Record<string, unknown>).initializationPlanV1).toEqual(
        items.map(({ position, kind, key, operation }) => ({ position, kind, key, operation }))
      );
      expect(persistedItems).toHaveLength(count);
    } finally {
      await cleanup(ownerRunId, actorId);
    }
  },
  360_000
);

test("initializeReservedRun accepts an allowlisted dotted setting key", async () => {
  const ledger = createLegacyInstallLedger();
  const actorId = await createActor();
  const packageKey = `initialize-setting-${randomUUID()}`;
  const options = { request: packageKey };
  let ownerRunId: string | null = null;
  try {
    const returned = await ledger.withPackageLock(
      { intent: "apply", packageKey, actorId, dryRun: false, options },
      async (context) => {
        if (context.intent !== "apply" || context.resumePhase !== "reserved") {
          throw new Error("reserved_context_missing");
        }
        ownerRunId = context.ownerRunId;
        return ledger.initializeReservedRun({
          ownerRunId: context.ownerRunId,
          packageKey,
          actorId,
          dryRun: false,
          options,
          items: [makeDottedSettingItem()],
        });
      }
    );
    expect(await ledger.listItems(returned.id)).toMatchObject([
      { kind: "setting", key: "site.contentRoutes" },
    ]);
  } finally {
    await cleanup(ownerRunId, actorId);
  }
}, 360_000);

test("invalid, hostile, cyclic and 513-item initialization inputs fail before DB I/O", async () => {
  let transactionCalls = 0;
  const noIoDatabase = {
    transaction: async () => {
      transactionCalls += 1;
      throw new Error("transaction_must_not_run");
    },
  } as unknown as InitializationDatabase;
  const initializer = createRunInitialization(noIoDatabase);
  const base: FullSiteReservedRunInitializationInput = {
    ownerRunId: randomUUID(),
    packageKey: "initialize-validation",
    actorId: randomUUID(),
    dryRun: false,
    options: {},
    items: [],
  };
  const accessor = { ...base } as Record<string, unknown>;
  Object.defineProperty(accessor, "items", { enumerable: true, get: () => [] });
  const revoked = Proxy.revocable({ ...base }, {});
  revoked.revoke();
  const cyclicOptions: Record<string, unknown> = {};
  cyclicOptions.self = cyclicOptions;
  const invalidInputs: unknown[] = [
    { ...base, extra: true },
    { ...base, options: cyclicOptions },
    { ...base, items: [{ ...makeItem(0), kind: "unknown" }] },
    { ...base, items: [{ ...makeItem(0), rollbackAction: {} }] },
    accessor,
    revoked.proxy,
  ];
  for (const input of invalidInputs) {
    await expect(
      initializer.initializeReservedRun(input as FullSiteReservedRunInitializationInput)
    ).rejects.toThrow("site_package_invalid");
  }
  await expect(
    initializer.initializeReservedRun({
      ...base,
      items: Array.from({ length: 513 }, (_, index) => makeItem(index)),
    })
  ).rejects.toThrow("site_package_too_large");
  expect(transactionCalls).toBe(0);
});

test("confirmed transaction rollback preserves the reserved owner and exposes the fixed code", async () => {
  const actorId = await createActor();
  const packageKey = `initialize-rollback-${randomUUID()}`;
  const options = { request: packageKey };
  const ledger = createLegacyInstallLedger();
  const failingDatabase = {
    transaction: async () => {
      throw new Error("driver-secret-sentinel");
    },
  } as unknown as InitializationDatabase;
  const initializer = createRunInitialization(failingDatabase);
  let ownerRunId: string | null = null;
  try {
    await ledger.withPackageLock(
      { intent: "apply", packageKey, actorId, dryRun: false, options },
      async (context) => {
        if (context.intent !== "apply") throw new Error("apply_context_missing");
        ownerRunId = context.ownerRunId;
        await expect(
          initializer.initializeReservedRun({
            ownerRunId: context.ownerRunId,
            packageKey,
            actorId,
            dryRun: false,
            options,
            items: [makeItem(0)],
          })
        ).rejects.toThrow("site_package_ledger_initialization_failed");
      }
    );
    const [owner] = await db
      .select({ options: solutionKitInstallRuns.options })
      .from(solutionKitInstallRuns)
      .where(eq(solutionKitInstallRuns.id, ownerRunId!));
    expect(owner?.options).not.toHaveProperty("initializationPlanV1");
  } finally {
    await cleanup(ownerRunId, actorId);
  }
});

test.each(["native_cms_writer_fence_lost", "native_cms_writer_fence_failed"])(
  "preserves exact owner-gate code %s without a reread fallback",
  async (code) => {
    let transactions = 0;
    const database = {
      transaction: async () => {
        transactions += 1;
        throw new Error(code);
      },
    } as unknown as InitializationDatabase;
    const initializer = createRunInitialization(database);
    await expect(
      initializer.initializeReservedRun({
        ownerRunId: randomUUID(),
        packageKey: "initialize-fence-code",
        actorId: randomUUID(),
        dryRun: false,
        options: {},
        items: [],
      })
    ).rejects.toThrow(code);
    expect(transactions).toBe(1);
  }
);
