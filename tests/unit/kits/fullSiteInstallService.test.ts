import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  contentEntries,
  contentTypes,
  forms,
  settings,
  solutionKitInstallRuns,
  users,
} from "../../../core/db/schema";
import {
  compensateItems,
  FULL_SITE_ROLLBACK_ADAPTERS,
  type FullSiteRollbackAdapters,
} from "../../../core/services/kits/fullSiteInstall/compensation";
import { rollbackFullSiteInstall } from "../../../core/services/kits/fullSiteInstall/rollback";
import type {
  FullSiteInstallLedgerItem,
  FullSiteInstallLedgerPort,
  FullSiteInstallResourceKind,
  FullSiteInstallRun,
} from "../../../core/services/kits/fullSiteInstallTypes";
import type { JsonObject } from "../../../core/services/kits/fullSitePackage/types";
import { createLegacyInstallLedger } from "../../../core/services/kits/legacyInstallRunPersistence";
import { createFullSiteCurrentResourceResolver } from "../../../core/services/kits/fullSiteInstall/currentResourceResolver";
import { makeSagaSnapshot } from "../../../core/services/kits/fullSiteInstall/staging";

const ACTOR_ID = "123e4567-e89b-42d3-a456-426614174000";
const kinds: FullSiteInstallResourceKind[] = [
  "content_type",
  "listing_query",
  "page_template",
  "form",
  "content_entry",
  "listing_template",
  "detail_page",
  "page",
  "menu",
  "setting",
];

const adapters = (calls: string[]): FullSiteRollbackAdapters => {
  const adapterFor = (kind: FullSiteInstallResourceKind) => ({
    deleteById: async (id: string) => {
      calls.push(`delete:${kind}:${id}`);
    },
    restoreById: async (id: string, desired: JsonObject) => {
      calls.push(`restore:${kind}:${id}:${String(desired.marker)}`);
    },
  });
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
    setting: adapterFor("setting"),
  };
};

const item = (overrides: Partial<FullSiteInstallLedgerItem> = {}): FullSiteInstallLedgerItem => ({
  position: 0,
  kind: "page",
  key: "home",
  operation: "create",
  status: "success",
  beforeSnapshot: null,
  afterSnapshot: { id: "page-id", desired: { marker: "after" } },
  ...overrides,
});

const ledger = (source: FullSiteInstallRun | null, items: FullSiteInstallLedgerItem[]) => {
  const events: string[] = [];
  const port: FullSiteInstallLedgerPort = {
    createRun: async () => ({ id: "unused" }),
    recordItem: async (input) => {
      events.push(`item:${input.kind}:${input.status}`);
    },
    finalizeRun: async (input) => {
      events.push(`final:${input.runId}:${input.status}`);
    },
    getRun: async () => source,
    listItems: async () => items,
    createRollbackRun: async () => ({ id: "rollback-id" }),
    hasSuccessfulRollback: async () => false,
    findManagedResourceEvidence: async () => null,
  };
  return { port, events };
};

describe("full-site install compensation", () => {
  test("compensates successful mutations in strict reverse order using snapshot ids", async () => {
    const calls: string[] = [];
    await compensateItems({
      actorId: ACTOR_ID,
      adapters: adapters(calls),
      items: [
        item(),
        item({
          position: 1,
          kind: "setting",
          key: "site-shell",
          operation: "update",
          beforeSnapshot: { id: "setting-id", desired: { marker: "before-shell" } },
          afterSnapshot: { id: "setting-id", desired: { marker: "after-shell" } },
        }),
      ],
    });
    expect(calls).toEqual(["restore:setting:setting-id:before-shell", "delete:page:page-id"]);
  });

  test("never falls back to a natural key when created id proof is missing", async () => {
    const calls: string[] = [];
    await expect(
      compensateItems({
        actorId: ACTOR_ID,
        adapters: adapters(calls),
        items: [item({ afterSnapshot: { desired: { marker: "after" } } })],
      })
    ).rejects.toThrow("site_package_rollback_missing_after");
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
    ).rejects.toThrow("site_package_rollback_identity_mismatch");
  });

  test("records a failed reversal and continues compensating independent items", async () => {
    const calls: string[] = [];
    const rollbackAdapters = adapters(calls);
    rollbackAdapters.page.deleteById = async () => {
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
          item({ position: 0, kind: "content_type", key: "type" }),
          item({ position: 1, kind: "page", key: "home" }),
        ],
      })
    ).rejects.toThrow("page_delete_failed");
    expect(calls).toEqual(["delete:page:page-id", "delete:content_type:page-id"]);
    expect(state.events).toEqual(["item:page:failed", "item:content_type:success"]);
  });

  test("restores all settings through one batch compensation stage", async () => {
    const rollbackAdapters = adapters([]);
    const batches: string[][] = [];
    rollbackAdapters.setting.applyBatch = async (entries) => {
      batches.push(entries.map((entry) => entry.id));
    };
    await compensateItems({
      actorId: ACTOR_ID,
      adapters: rollbackAdapters,
      items: [
        item({
          position: 1,
          kind: "setting",
          key: "site.name",
          operation: "update",
          beforeSnapshot: { id: "site.name", desired: { value: "Before" } },
          afterSnapshot: { id: "site.name", desired: { value: "After" } },
        }),
        item({
          position: 2,
          kind: "setting",
          key: "site.locale",
          operation: "create",
          afterSnapshot: { id: "site.locale", desired: { value: "pl" } },
        }),
      ],
    });
    expect(batches).toEqual([["site.locale", "site.name"]]);
  });

  test("stops before deleting referenced resources when settings restore fails", async () => {
    const calls: string[] = [];
    const rollbackAdapters = adapters(calls);
    rollbackAdapters.setting.applyBatch = async () => {
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
              desired: { value: "page-before" },
            },
            afterSnapshot: {
              id: "site.homepageId",
              desired: { value: "page-id" },
            },
          }),
        ],
      })
    ).rejects.toThrow("settings_restore_failed");
    expect(calls).toEqual(["restore:settings:batch"]);
    expect(state.events).toEqual(["item:setting:failed"]);
  });

  test("native settings compensation restores the raw snapshot value exactly", async () => {
    const key = "site.locale";
    const [before] = await db.select().from(settings).where(eq(settings.key, key));
    try {
      await db
        .insert(settings)
        .values({ key, value: "pl-PL", updatedAt: new Date() })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: "pl-PL", updatedAt: new Date() },
        });
      await compensateItems({
        actorId: ACTOR_ID,
        adapters: FULL_SITE_ROLLBACK_ADAPTERS,
        items: [
          item({
            kind: "setting",
            key,
            operation: "update",
            beforeSnapshot: { id: key, desired: { value: "PL-pl" } },
            afterSnapshot: { id: key, desired: { value: "pl-PL" } },
          }),
        ],
      });
      const [restored] = await db
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, key));
      expect(restored?.value).toBe("PL-pl");
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
    const rollbackItem = item({
      status: "failed",
      beforeSnapshot: { id: "page-id", desired: { marker: "after" } },
      afterSnapshot: null,
      error: "page_delete_failed",
    });
    const state = ledger(failedSource, []);
    state.port.findAutomaticCompensationRun = async () => automaticRun;
    state.port.claimRollbackRun = async (input) => {
      expect(input).toMatchObject({
        sourceRunId: source.id,
        options: { automaticCompensation: true, fullSitePackage: true },
        resumeOnly: true,
      });
      return { id: automaticRun.id, state: "resumed" };
    };
    state.port.listItems = async (runId) => (runId === automaticRun.id ? [rollbackItem] : []);
    state.port.findManagedResourceEvidence = async () => {
      throw new Error("failed_apply_must_not_require_success_evidence");
    };
    const calls: string[] = [];
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
    expect(result).toEqual({ runId: automaticRun.id });
    expect(calls).toEqual(["delete:page:page-id"]);
    expect(state.events).toEqual(["item:page:success", `final:${automaticRun.id}:success`]);
  });

  test("holds the package lifecycle lock around explicit rollback mutations", async () => {
    const state = ledger(source, [item()]);
    const order: string[] = [];
    state.port.withPackageLock = async (packageKey, execute) => {
      order.push(`lock:${packageKey}:start`);
      const result = await execute();
      order.push(`lock:${packageKey}:end`);
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
    state.port.hasSuccessfulRollback = async () => true;
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
    state.port.listItems = async (runId) =>
      runId === source.id
        ? sourceItems
        : [
            item({
              position: 1,
              kind: "form",
              key: "brief",
              afterSnapshot: null,
            }),
          ];
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
    state.port.listItems = async (runId) =>
      runId === source.id
        ? sourceItems
        : [item({ status: "failed", error: "ledger_record_failed" })];
    const calls: string[] = [];
    await rollbackFullSiteInstall({
      sourceRunId: source.id,
      actorId: ACTOR_ID,
      ledger: state.port,
      adapters: adapters(calls),
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
      },
    };
    const prepared = item({
      status: "planned",
      afterSnapshot: makeSagaSnapshot({
        id: null,
        desired: { marker: "after" },
        phase: "prepared",
        intendedDesired: { marker: "after" },
      }),
    });
    const state = ledger(interrupted, [prepared]);
    const calls: string[] = [];
    const result = await rollbackFullSiteInstall({
      sourceRunId: interrupted.id,
      actorId: ACTOR_ID,
      ledger: state.port,
      adapters: adapters(calls),
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
    ["user setting mutation", source.id, { value: "user-change" }],
  ] as const)(
    "rejects rollback on %s before destructive writes",
    async (_label, evidenceRunId, currentDesired) => {
      const calls: string[] = [];
      const sourceItem =
        "value" in currentDesired
          ? item({
              kind: "setting",
              key: "site.name",
              afterSnapshot: { id: "site.name", desired: { value: "installed" } },
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
          adapters: adapters(calls),
          resolveCurrentResource: async () => ({
            id: sourceItem.kind === "setting" ? "site.name" : "page-id",
            desired: currentDesired,
          }),
        })
      ).rejects.toThrow("site_package_rollback_conflict");
      expect(calls).toEqual([]);
      expect(state.events).toEqual([]);
    }
  );
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
    if (!port.withPackageLock) throw new Error("package_lock_missing");
    const packageKey = `task-547-package-lock-${crypto.randomUUID()}`;
    const order: string[] = [];
    let releaseFirst: () => void = () => undefined;
    let markFirstEntered: () => void = () => undefined;
    const firstEntered = new Promise<void>((resolve) => {
      markFirstEntered = () => resolve();
    });
    const firstRelease = new Promise<void>((resolve) => {
      releaseFirst = () => resolve();
    });
    const first = port.withPackageLock(packageKey, async () => {
      order.push("first:start");
      markFirstEntered();
      await firstRelease;
      order.push("first:end");
    });
    await firstEntered;
    const second = port.withPackageLock(packageKey, async () => {
      order.push("second:start");
      order.push("second:end");
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(order).toEqual(["first:start"]);
    releaseFirst();
    await Promise.all([first, second]);
    expect(order).toEqual(["first:start", "first:end", "second:start", "second:end"]);
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
      const state = ledger(null, []);
      state.port.findManagedResourceEvidence = async ({ kind, key }) =>
        kind === "content_type" && key === "second"
          ? {
              runId: "run-id",
              resourceId: secondType.id,
              desired: {},
              successful: true,
              rolledBack: false,
            }
          : null;
      const resolver = createFullSiteCurrentResourceResolver("package", state.port);
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
      const state = ledger(null, []);
      const resolver = createFullSiteCurrentResourceResolver("package", state.port);
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
      });
      await port.recordItem({
        runId: source.id,
        position: 0,
        kind: "setting",
        key: "site.homepageId",
        operation: "update",
        status: "success",
        beforeSnapshot: { id: "site.homepageId", desired: { marker: "before" } },
        afterSnapshot: { id: "site.homepageId", desired: { marker: "after" } },
      });
      await port.finalizeRun({ runId: source.id, status: "success" });

      const calls: string[] = [];
      const result = await rollbackFullSiteInstall({
        sourceRunId: source.id,
        actorId: actor.id,
        ledger: port,
        adapters: adapters(calls),
        resolveCurrentResource: async () => ({
          id: "site.homepageId",
          desired: { marker: "after" },
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
