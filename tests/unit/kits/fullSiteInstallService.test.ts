import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { isDeepStrictEqual } from "node:util";

import { db } from "../../../core/db/client";
import { contentTypes, settings } from "../../../core/db/schema";
import {
  compensateItems as compensateItemsCurrent,
  type CompensateItemsInput,
} from "../../../core/services/kits/fullSiteInstall/compensation";
import {
  FULL_SITE_ROLLBACK_ADAPTERS,
  type FullSiteNativeSnapshot,
  type FullSiteRollbackAdapters,
} from "../../../core/services/kits/fullSiteInstall/adapters";
import { rollbackFullSiteInstall } from "../../../core/services/kits/fullSiteInstall/rollback";
import type {
  FullSiteInstallLedgerPort,
  FullSiteInstallResourceKind,
  FullSiteInstallRun,
  PersistedFullSiteInstallLedgerItem,
} from "../../../core/services/kits/fullSiteInstallTypes";
import type { JsonObject } from "../../../core/services/kits/fullSitePackage/types";
import { buildFullSiteDurableAfterSnapshotV1 } from "../../../core/services/kits/fullSiteInstall/staging";

const ACTOR_ID = "123e4567-e89b-42d3-a456-426614174000";

type SnapshotState = Map<string, FullSiteNativeSnapshot>;

const snapshotState = (...snapshots: FullSiteNativeSnapshot[]): SnapshotState =>
  new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));

const adapters = (
  calls: string[],
  state: SnapshotState = snapshotState({ id: "page-id", desired: { marker: "after" } })
): FullSiteRollbackAdapters => {
  const adapterFor = (kind: FullSiteInstallResourceKind): FullSiteRollbackAdapters["page"] => ({
    captureSnapshotByIdOrNull: async (id: string) => state.get(id) ?? null,
    deleteSnapshotAtomic: async (input) => {
      if (!isDeepStrictEqual(state.get(input.id), input.expectedCurrent)) {
        throw new Error("site_package_state_changed");
      }
      state.delete(input.id);
      calls.push(`delete:${kind}:${input.id}`);
    },
    restoreSnapshotAtomic: async (input) => {
      if (!isDeepStrictEqual(state.get(input.id), input.expectedCurrent)) {
        throw new Error("site_package_state_changed");
      }
      state.set(input.id, input.target);
      calls.push(
        `restore:${kind}:${input.id}:${String(
          input.target.desired.marker ?? input.target.desired.value
        )}`
      );
    },
  });
  const setting = adapterFor("setting");
  return {
    content_type: adapterFor("content_type"),
    form: adapterFor("form"),
    page_template: adapterFor("page_template"),
    listing_template: adapterFor("listing_template"),
    content_entry: adapterFor("content_entry"),
    listing_query: adapterFor("listing_query"),
    detail_page: adapterFor("detail_page"),
    page: adapterFor("page"),
    menu: adapterFor("menu"),
    setting: {
      ...setting,
      reverseSettingsBatch: async ({ items }) => {
        for (const item of items) {
          if (!isDeepStrictEqual(state.get(item.id), item.expectedCurrent)) {
            throw new Error("site_package_state_changed");
          }
        }
        for (const item of items) {
          if (item.target) {
            state.set(item.id, item.target);
            calls.push(
              `restore:setting:${item.id}:${String(
                item.target.desired.marker ?? item.target.desired.value
              )}`
            );
          } else {
            state.delete(item.id);
            calls.push(`delete:setting:${item.id}`);
          }
        }
      },
    },
  };
};

const item = (
  overrides: Partial<PersistedFullSiteInstallLedgerItem> = {}
): PersistedFullSiteInstallLedgerItem => {
  const candidate =
    overrides.afterSnapshot === undefined
      ? { id: "page-id", desired: { marker: "after" } }
      : overrides.afterSnapshot;
  const afterSnapshot =
    candidate &&
    typeof candidate.id === "string" &&
    candidate.desired &&
    !Array.isArray(candidate.desired) &&
    typeof candidate.desired === "object" &&
    Reflect.get(candidate, "recovery") === undefined
      ? buildFullSiteDurableAfterSnapshotV1({
          complete: { id: candidate.id, desired: candidate.desired as JsonObject },
          staged: null,
          phase: "complete",
        })
      : candidate;
  return {
    position: 0,
    kind: "page",
    key: "home",
    operation: "create",
    status: "success",
    beforeSnapshot: null,
    error: null,
    ...overrides,
    afterSnapshot,
    rollbackAction:
      overrides.rollbackAction === undefined
        ? { schemaVersion: 1, dependencies: [] }
        : overrides.rollbackAction,
  };
};

const ledger = (source: FullSiteInstallRun | null, items: PersistedFullSiteInstallLedgerItem[]) => {
  const events: string[] = [];
  let rollbackOwnerId = "rollback-id";
  const port: FullSiteInstallLedgerPort = {
    withPackageLock: async (reservation, execute) => {
      if (reservation.intent === "apply") {
        return execute({ intent: "apply", ownerRunId: "run-id", resumePhase: "reserved" });
      }
      const claim = port.claimRollbackRun
        ? await port.claimRollbackRun({
            sourceRunId: reservation.sourceRunId,
            packageKey: reservation.packageKey,
            actorId: reservation.actorId,
            options: reservation.options,
            resumeOnly: reservation.options.automaticCompensation === true,
          })
        : { id: rollbackOwnerId, state: "created" as const };
      rollbackOwnerId = claim.id;
      return execute({ intent: "explicit_rollback", ownerRunId: claim.id });
    },
    createRun: async () => ({ id: "unused" }),
    recordItem: async (input) => {
      events.push(`item:${input.kind}:${input.status}`);
    },
    finalizeRun: async (input) => {
      events.push(`final:${input.runId}:${input.status}`);
    },
    getRun: async (runId) =>
      runId === rollbackOwnerId && source
        ? {
            id: rollbackOwnerId,
            packageKey: source.packageKey,
            mode: "rollback",
            status: "running",
            rollbackOfRunId: source.id,
            options: { fullSitePackage: true },
          }
        : source,
    listItems: async (runId) => (runId === rollbackOwnerId ? [] : items),
    listRawItems: async (runId) =>
      (await port.listItems(runId)).map((entry) => ({
        ...entry,
        rollbackAction: entry.rollbackAction ?? null,
        error: entry.error ?? null,
      })),
    initializeReservedRun: async () => ({ id: "run-id" }),
    finalizeOwnedRun: async (input) => {
      events.push(`final:${input.ownerRunId}:${input.status}`);
      if (input.interruptedApplySource) {
        events.push(
          `final:${input.interruptedApplySource.runId}:${input.interruptedApplySource.status}`
        );
      }
      return { outcome: "desired_terminal" };
    },
    createRollbackRun: async () => ({ id: "rollback-id" }),
    hasSuccessfulRollback: async () => false,
    findManagedResourceEvidence: async () => null,
  };
  return { port, events };
};

type TestCompensationInput = Pick<CompensateItemsInput, "actorId" | "adapters"> & {
  items: readonly PersistedFullSiteInstallLedgerItem[];
  priorOutcomes?: readonly PersistedFullSiteInstallLedgerItem[];
  currentSource?: FullSiteInstallRun;
  ledger?: FullSiteInstallLedgerPort;
  rollbackRunId?: string;
  resolveCurrentResource?: CompensateItemsInput["resolveCurrentResource"];
};

const compensateItems = (input: TestCompensationInput): Promise<void> => {
  const toRaw = (entry: PersistedFullSiteInstallLedgerItem) => ({
    ...entry,
    rollbackAction: entry.rollbackAction ?? null,
    error: entry.error ?? null,
  });
  const fallbackLedger = ledger(null, []).port;
  return compensateItemsCurrent({
    ...input,
    items: input.items.map(toRaw),
    priorOutcomes: (input.priorOutcomes ?? []).map(toRaw),
    currentSource: input.currentSource ?? {
      id: "source-id",
      packageKey: "package",
      mode: "apply",
      status: "failed",
      rollbackOfRunId: null,
      options: { fullSitePackage: true, rollbackDependencySchemaVersion: 1 },
    },
    ledger: input.ledger ?? fallbackLedger,
    rollbackRunId: input.rollbackRunId ?? "rollback-id",
    resolveCurrentResource:
      input.resolveCurrentResource ??
      (async (kind, _seed, expectedId) =>
        expectedId ? input.adapters[kind].captureSnapshotByIdOrNull(expectedId) : null),
  });
};

describe("full-site install compensation", () => {
  test("compensates successful mutations in strict reverse order using snapshot ids", async () => {
    const calls: string[] = [];
    const rollbackAdapters = adapters(
      calls,
      snapshotState(
        { id: "page-id", desired: { marker: "after" } },
        { id: "site.name", desired: { present: true, value: "after-shell" } }
      )
    );
    await compensateItems({
      actorId: ACTOR_ID,
      adapters: rollbackAdapters,
      items: [
        item(),
        item({
          position: 1,
          kind: "setting",
          key: "site.name",
          operation: "update",
          beforeSnapshot: {
            id: "site.name",
            desired: { present: true, value: "before-shell" },
          },
          afterSnapshot: {
            id: "site.name",
            desired: { present: true, value: "after-shell" },
          },
        }),
      ],
    });
    expect(calls).toEqual(["restore:setting:site.name:before-shell", "delete:page:page-id"]);
  });

  test("never falls back to a natural key when created id proof is missing", async () => {
    const calls: string[] = [];
    await expect(
      compensateItems({
        actorId: ACTOR_ID,
        adapters: adapters(calls),
        items: [item({ afterSnapshot: { desired: { marker: "after" } } })],
      })
    ).rejects.toThrow("site_package_rollback_invalid_source");
    expect(calls).toEqual([]);
  });

  test("rejects mismatched ids instead of restoring another resource", async () => {
    await expect(
      compensateItems({
        actorId: ACTOR_ID,
        adapters: adapters([]),
        items: [
          item({
            operation: "update",
            beforeSnapshot: { id: "owned-id", desired: {} },
            afterSnapshot: { id: "other-id", desired: {} },
          }),
        ],
      })
    ).rejects.toThrow("site_package_rollback_invalid_source");
  });

  test("records a failed reversal and continues compensating independent items", async () => {
    const calls: string[] = [];
    const rollbackAdapters = adapters(
      calls,
      snapshotState(
        { id: "content-type-id", desired: { marker: "after-type" } },
        { id: "page-id", desired: { marker: "after" } }
      )
    );
    rollbackAdapters.page.deleteSnapshotAtomic = async () => {
      calls.push("delete:page:page-id");
      throw new Error("page_delete_failed");
    };
    const state = ledger(null, []);
    await expect(
      compensateItems({
        actorId: ACTOR_ID,
        adapters: rollbackAdapters,
        ledger: state.port,
        rollbackRunId: "rollback-id",
        items: [
          item({
            position: 0,
            kind: "content_type",
            key: "type",
            afterSnapshot: { id: "content-type-id", desired: { marker: "after-type" } },
          }),
          item({ position: 1, kind: "page", key: "home" }),
        ],
      })
    ).rejects.toThrow("site_package_rollback_failed");
    expect(calls).toEqual(["delete:page:page-id", "delete:content_type:content-type-id"]);
    expect(state.events).toEqual(["item:page:failed", "item:content_type:success"]);
  });

  test("restores all settings through one batch compensation stage", async () => {
    const rollbackAdapters = adapters(
      [],
      snapshotState(
        { id: "site.name", desired: { present: true, value: "After" } },
        { id: "site.locale", desired: { present: true, value: "pl" } }
      )
    );
    const batches: string[][] = [];
    rollbackAdapters.setting.reverseSettingsBatch = async ({ items }) => {
      batches.push(items.map((entry) => entry.id));
    };
    await compensateItems({
      actorId: ACTOR_ID,
      adapters: rollbackAdapters,
      items: [
        item({
          position: 0,
          kind: "setting",
          key: "site.name",
          operation: "update",
          beforeSnapshot: { id: "site.name", desired: { present: true, value: "Before" } },
          afterSnapshot: { id: "site.name", desired: { present: true, value: "After" } },
        }),
        item({
          position: 1,
          kind: "setting",
          key: "site.locale",
          operation: "create",
          afterSnapshot: { id: "site.locale", desired: { present: true, value: "pl" } },
        }),
      ],
    });
    expect(batches).toEqual([["site.locale", "site.name"]]);
  });

  test("stops before deleting referenced resources when settings restore fails", async () => {
    const calls: string[] = [];
    const rollbackAdapters = adapters(
      calls,
      snapshotState(
        { id: "page-id", desired: { marker: "after" } },
        { id: "site.homepageId", desired: { present: true, value: "page-id" } }
      )
    );
    rollbackAdapters.setting.reverseSettingsBatch = async () => {
      calls.push("restore:settings:batch");
      throw new Error("settings_restore_failed");
    };
    const state = ledger(null, []);
    await expect(
      compensateItems({
        actorId: ACTOR_ID,
        adapters: rollbackAdapters,
        ledger: state.port,
        rollbackRunId: "rollback-id",
        items: [
          item({ position: 0 }),
          item({
            position: 1,
            kind: "setting",
            key: "site.homepageId",
            operation: "update",
            beforeSnapshot: {
              id: "site.homepageId",
              desired: { present: true, value: "page-before" },
            },
            afterSnapshot: {
              id: "site.homepageId",
              desired: { present: true, value: "page-id" },
            },
            rollbackAction: { schemaVersion: 1, dependencies: ["page:home"] },
          }),
        ],
      })
    ).rejects.toThrow("site_package_rollback_failed");
    expect(calls).toEqual(["restore:settings:batch"]);
    expect(state.events).toEqual(["item:setting:failed", "item:page:skipped"]);
  });

  test("native settings compensation restores the raw snapshot value exactly", async () => {
    const key = "site.contentRoutes";
    const contentTypeId = randomUUID();
    const contentTypeSlug = `task-547-legacy-route-${contentTypeId}`;
    const currentValue = [
      {
        type: contentTypeSlug,
        listPath: "/projects",
        detailPath: "/projects/:slug",
        enabled: true,
      },
    ];
    const legacyRawValue = [
      {
        type: contentTypeSlug,
        listPath: "/legacy-projects",
        detailPath: "/legacy-projects/:legacy",
        enabled: true,
      },
    ];
    const [before] = await db.select().from(settings).where(eq(settings.key, key));
    try {
      await db.insert(contentTypes).values({
        id: contentTypeId,
        name: "TASK-547 legacy route",
        slug: contentTypeSlug,
        schema: { type: "object", additionalProperties: false, properties: {} },
        status: "published",
        config: {},
      });
      await db
        .insert(settings)
        .values({ key, value: currentValue, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: currentValue, updatedAt: new Date() },
        });
      await compensateItems({
        actorId: ACTOR_ID,
        adapters: FULL_SITE_ROLLBACK_ADAPTERS,
        items: [
          item({
            kind: "setting",
            key,
            operation: "update",
            beforeSnapshot: { id: key, desired: { present: true, value: legacyRawValue } },
            afterSnapshot: { id: key, desired: { present: true, value: currentValue } },
          }),
        ],
      });
      const [restored] = await db
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, key));
      expect(restored?.value).toEqual(legacyRawValue);
    } finally {
      if (before) {
        await db
          .insert(settings)
          .values(before)
          .onConflictDoUpdate({
            target: settings.key,
            set: { value: before.value, updatedAt: before.updatedAt },
          });
      } else {
        await db.delete(settings).where(eq(settings.key, key));
      }
      await db.delete(contentTypes).where(eq(contentTypes.id, contentTypeId));
    }
  });
});

describe("full-site explicit rollback lifecycle", () => {
  const source: FullSiteInstallRun = {
    id: "source-id",
    packageKey: "portfolio",
    mode: "apply",
    status: "success",
    rollbackOfRunId: null,
    options: { fullSitePackage: true, rollbackDependencySchemaVersion: 1 },
  };

  test("rolls back only an exact successful apply and finalizes its ledger run", async () => {
    const calls: string[] = [];
    const state = ledger(source, [item()]);
    state.port.findManagedResourceEvidence = async () => ({
      runId: source.id,
      resourceId: "page-id",
      desired: { marker: "after" },
      successful: true,
      rolledBack: false,
    });
    const result = await rollbackFullSiteInstall({
      sourceRunId: source.id,
      actorId: ACTOR_ID,
      ledger: state.port,
      adapters: adapters(calls),
      resolveCurrentResource: async () => ({
        id: "page-id",
        desired: { marker: "after" },
      }),
    });
    expect(result).toEqual({ runId: "rollback-id" });
    expect(calls).toEqual(["delete:page:page-id"]);
    expect(state.events).toEqual(["item:page:success", "final:rollback-id:success"]);
  });

  test("validates actor UUID before any ledger access", async () => {
    let accessed = false;
    const state = ledger(source, []);
    state.port.getRun = async () => {
      accessed = true;
      return source;
    };
    await expect(
      rollbackFullSiteInstall({
        sourceRunId: source.id,
        actorId: "not-an-actor",
        ledger: state.port,
        adapters: adapters([]),
      })
    ).rejects.toThrow("site_package_actor_invalid");
    expect(accessed).toBe(false);
  });

  test.each([
    null,
    { ...source, mode: "dry_run" as const },
    { ...source, mode: "rollback" as const, rollbackOfRunId: "other" },
  ])("rejects missing, dry-run, and rollback sources", async (invalidSource) => {
    const state = ledger(invalidSource, []);
    await expect(
      rollbackFullSiteInstall({
        sourceRunId: source.id,
        actorId: ACTOR_ID,
        ledger: state.port,
        adapters: adapters([]),
      })
    ).rejects.toThrow(
      invalidSource ? "site_package_rollback_invalid_source" : "site_package_run_not_found"
    );
  });

  test("rejects a failed apply without durable automatic-compensation evidence", async () => {
    const failedSource = { ...source, status: "failed" as const };
    const state = ledger(failedSource, []);
    await expect(
      rollbackFullSiteInstall({
        sourceRunId: failedSource.id,
        actorId: ACTOR_ID,
        ledger: state.port,
        adapters: adapters([]),
      })
    ).rejects.toThrow("site_package_rollback_invalid_source");
  });

  test("resumes a failed automatic compensation through the source apply run", async () => {
    const failedSource = { ...source, status: "failed" as const };
    const automaticRun: FullSiteInstallRun = {
      id: "automatic-rollback-id",
      packageKey: source.packageKey,
      mode: "rollback",
      status: "failed",
      rollbackOfRunId: source.id,
      options: { automaticCompensation: true, fullSitePackage: true },
    };
    const sourceItem = item();
    const rollbackItem = item({
      status: "failed",
      beforeSnapshot: sourceItem.afterSnapshot,
      afterSnapshot: null,
      rollbackAction: sourceItem.rollbackAction,
      error: "page_delete_failed",
    });
    const state = ledger(failedSource, [sourceItem]);
    state.port.findAutomaticCompensationRun = async () => automaticRun;
    state.port.claimRollbackRun = async (input) => {
      expect(input).toMatchObject({
        sourceRunId: source.id,
        options: { automaticCompensation: true, fullSitePackage: true },
        resumeOnly: true,
      });
      return { id: automaticRun.id, state: "resumed" };
    };
    state.port.listItems = async (runId) =>
      runId === automaticRun.id ? [rollbackItem] : runId === source.id ? [sourceItem] : [];
    state.port.findManagedResourceEvidence = async () => {
      throw new Error("failed_apply_must_not_require_success_evidence");
    };
    const calls: string[] = [];
    const result = await rollbackFullSiteInstall({
      sourceRunId: source.id,
      actorId: ACTOR_ID,
      ledger: state.port,
      adapters: adapters(calls, snapshotState({ id: "page-id", desired: { marker: "after" } })),
      resolveCurrentResource: async () => ({
        id: "page-id",
        desired: { marker: "after" },
      }),
    });
    expect(result).toEqual({ runId: automaticRun.id });
    expect(calls).toEqual(["delete:page:page-id"]);
    expect(state.events).toEqual(["item:page:success", `final:${automaticRun.id}:success`]);
  });

  test("holds the package lifecycle lock around explicit rollback mutations", async () => {
    const state = ledger(source, [item()]);
    const order: string[] = [];
    const withPackageLock = state.port.withPackageLock;
    state.port.withPackageLock = async (reservation, execute) => {
      order.push(`lock:${reservation.packageKey}:start`);
      const result = await withPackageLock(reservation, execute);
      order.push(`lock:${reservation.packageKey}:end`);
      return result;
    };
    state.port.findManagedResourceEvidence = async () => ({
      runId: source.id,
      resourceId: "page-id",
      desired: { marker: "after" },
      successful: true,
      rolledBack: false,
    });
    const rollbackAdapters = adapters(order);
    await rollbackFullSiteInstall({
      sourceRunId: source.id,
      actorId: ACTOR_ID,
      ledger: state.port,
      adapters: rollbackAdapters,
      resolveCurrentResource: async () => ({
        id: "page-id",
        desired: { marker: "after" },
      }),
    });
    expect(order).toEqual([
      `lock:${source.packageKey}:start`,
      "delete:page:page-id",
      `lock:${source.packageKey}:end`,
    ]);
  });

  test("rejects a source already proven rolled back", async () => {
    const state = ledger(source, []);
    state.port.findAutomaticCompensationRun = async () => ({
      id: "completed-rollback",
      packageKey: source.packageKey,
      mode: "rollback",
      status: "success",
      rollbackOfRunId: source.id,
    });
    await expect(
      rollbackFullSiteInstall({
        sourceRunId: source.id,
        actorId: ACTOR_ID,
        ledger: state.port,
        adapters: adapters([]),
      })
    ).rejects.toThrow("site_package_already_rolled_back");
  });

  test("resumes a partial rollback and retries only unfinished items", async () => {
    const sourceItems = [
      item({ position: 0, kind: "page", key: "home" }),
      item({
        position: 1,
        kind: "form",
        key: "brief",
        afterSnapshot: { id: "form-id", desired: { marker: "after" } },
      }),
    ];
    const state = ledger(source, sourceItems);
    state.port.claimRollbackRun = async () => ({
      id: "rollback-id",
      state: "resumed",
    });
    const completedFormRollback = item({
      position: 1,
      kind: "form",
      key: "brief",
      beforeSnapshot: sourceItems[1]!.afterSnapshot,
      afterSnapshot: sourceItems[1]!.beforeSnapshot,
      rollbackAction: sourceItems[1]!.rollbackAction,
    });
    state.port.listItems = async (runId) =>
      runId === source.id ? sourceItems : [completedFormRollback];
    state.port.findManagedResourceEvidence = async ({ kind }) =>
      kind === "page"
        ? {
            runId: source.id,
            resourceId: "page-id",
            desired: { marker: "after" },
            successful: true,
            rolledBack: false,
          }
        : null;
    const calls: string[] = [];
    await rollbackFullSiteInstall({
      sourceRunId: source.id,
      actorId: ACTOR_ID,
      ledger: state.port,
      adapters: adapters(calls),
      resolveCurrentResource: async () => ({
        id: "page-id",
        desired: { marker: "after" },
      }),
    });
    expect(calls).toEqual(["delete:page:page-id"]);
    expect(state.events).toEqual(["item:page:success", "final:rollback-id:success"]);
  });

  test("resumes after a native reversal succeeded but its outcome was not persisted", async () => {
    const sourceItems = [item({ position: 0, kind: "page", key: "home" })];
    const state = ledger(source, sourceItems);
    state.port.claimRollbackRun = async () => ({
      id: "rollback-id",
      state: "resumed",
    });
    const unpersistedReversal = item({
      status: "failed",
      beforeSnapshot: sourceItems[0]!.afterSnapshot,
      afterSnapshot: sourceItems[0]!.beforeSnapshot,
      rollbackAction: sourceItems[0]!.rollbackAction,
      error: "ledger_record_failed",
    });
    state.port.listItems = async (runId) =>
      runId === source.id ? sourceItems : [unpersistedReversal];
    const calls: string[] = [];
    await rollbackFullSiteInstall({
      sourceRunId: source.id,
      actorId: ACTOR_ID,
      ledger: state.port,
      adapters: adapters(calls, snapshotState()),
      resolveCurrentResource: async () => null,
    });
    expect(calls).toEqual([]);
    expect(state.events).toEqual(["item:page:success", "final:rollback-id:success"]);
  });

  test("rolls back an interrupted running apply from its exact prepared create intent", async () => {
    const interrupted: FullSiteInstallRun = {
      ...source,
      status: "running",
      options: {
        fullSitePackage: true,
        packageFingerprint: "a".repeat(64),
        rollbackDependencySchemaVersion: 1,
        initializationPlanV1: [{ position: 0, kind: "page", key: "home", operation: "create" }],
      },
    };
    const prepared = item({
      status: "planned",
      afterSnapshot: buildFullSiteDurableAfterSnapshotV1({
        complete: { id: "created-page-id", desired: { marker: "after" } },
        staged: null,
        phase: "prepared",
      }),
    });
    const state = ledger(interrupted, [prepared]);
    const calls: string[] = [];
    const result = await rollbackFullSiteInstall({
      sourceRunId: interrupted.id,
      actorId: ACTOR_ID,
      ledger: state.port,
      adapters: adapters(
        calls,
        snapshotState({ id: "created-page-id", desired: { marker: "after" } })
      ),
      resolveCurrentResource: async () => ({
        id: "created-page-id",
        desired: { marker: "after" },
      }),
    });
    expect(result).toEqual({ runId: "rollback-id" });
    expect(calls).toEqual(["delete:page:created-page-id"]);
    expect(state.events).toEqual([
      "item:page:success",
      "final:rollback-id:success",
      `final:${interrupted.id}:failed`,
    ]);
  });

  test.each([
    ["later managed run", "later-run", { marker: "after" }],
    ["native drift", source.id, { marker: "changed" }],
    ["user setting mutation", source.id, { present: true, value: "user-change" }],
  ] as const)(
    "rejects rollback on %s before destructive writes",
    async (_label, evidenceRunId, currentDesired) => {
      const calls: string[] = [];
      const sourceItem =
        "value" in currentDesired
          ? item({
              kind: "setting",
              key: "site.name",
              afterSnapshot: {
                id: "site.name",
                desired: { present: true, value: "installed" },
              },
            })
          : item();
      const state = ledger(source, [sourceItem]);
      state.port.findManagedResourceEvidence = async () => ({
        runId: evidenceRunId,
        resourceId: sourceItem.kind === "setting" ? "site.name" : "page-id",
        desired: sourceItem.afterSnapshot!.desired as JsonObject,
        successful: true,
        rolledBack: false,
      });
      await expect(
        rollbackFullSiteInstall({
          sourceRunId: source.id,
          actorId: ACTOR_ID,
          ledger: state.port,
          adapters: adapters(
            calls,
            snapshotState({
              id: sourceItem.kind === "setting" ? "site.name" : "page-id",
              desired: currentDesired,
            })
          ),
          resolveCurrentResource: async () => ({
            id: sourceItem.kind === "setting" ? "site.name" : "page-id",
            desired: currentDesired,
          }),
        })
      ).rejects.toThrow("site_package_rollback_conflict");
      expect(calls).toEqual([]);
      expect(state.events).toEqual([`item:${sourceItem.kind}:failed`]);
    }
  );
});
