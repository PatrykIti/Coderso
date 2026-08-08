import { expect, test } from "bun:test";

import {
  buildRollbackDependencyGraph,
  collectTransitiveRollbackDependencies,
  preflightPriorRollbackSuccessOutcomes,
  preflightRollbackEvidence,
  reverseSettingsBatch,
  type RefinedRollbackItem,
} from "../../../core/services/kits/fullSiteInstall/compensation";
import {
  buildFullSiteRollbackActionV1,
  readFullSiteRollbackActionV1,
  type FullSiteInstallLedgerItem,
  type RawFullSiteInstallLedgerItem,
} from "../../../core/services/kits/fullSiteInstallTypes";
import { buildFullSiteDurableAfterSnapshotV1 } from "../../../core/services/kits/fullSiteInstall/staging";

const snapshot = (id: string, marker: string) => ({ id, desired: { marker } });

const rawItem = (
  input: Readonly<{
    position: number;
    kind?: "page" | "setting";
    key: string;
    operation: "create" | "update" | "noop";
    status?: "planned" | "success";
    beforeSnapshot: ReturnType<typeof snapshot> | null;
    complete: ReturnType<typeof snapshot>;
    staged?: ReturnType<typeof snapshot> | null;
    phase?: "prepared" | "staged" | "publish_prepared" | "complete";
    dependencies?: readonly string[];
  }>
): RawFullSiteInstallLedgerItem => ({
  position: input.position,
  kind: input.kind ?? "page",
  key: input.key,
  operation: input.operation,
  status: input.status ?? "planned",
  beforeSnapshot: input.beforeSnapshot,
  afterSnapshot: buildFullSiteDurableAfterSnapshotV1({
    complete: input.complete,
    staged: input.staged ?? null,
    phase: input.phase ?? "prepared",
  }),
  rollbackAction: {
    schemaVersion: 1,
    dependencies: [...(input.dependencies ?? [])],
  },
  error: null,
});

test("strictly parses every durable source row and enforces the initialization manifest", () => {
  const created = rawItem({
    position: 0,
    key: "home",
    operation: "create",
    beforeSnapshot: null,
    complete: snapshot("page-id", "final"),
    staged: snapshot("page-id", "draft"),
    phase: "staged",
    status: "success",
  });
  const noopBefore = snapshot("setting-id", "same");
  const noop = rawItem({
    position: 1,
    kind: "setting",
    key: "site.name",
    operation: "noop",
    beforeSnapshot: noopBefore,
    complete: noopBefore,
  });
  const parsed = preflightRollbackEvidence({
    items: [created, noop],
    initializationPlanV1: [
      { position: 0, kind: "page", key: "home", operation: "create" },
      { position: 1, kind: "setting", key: "site.name", operation: "noop" },
    ],
  });
  expect(parsed.map(({ operation, phase }) => [operation, phase])).toEqual([
    ["create", "staged"],
    ["noop", "prepared"],
  ]);
  expect(() =>
    preflightRollbackEvidence({
      items: [created, noop],
      initializationPlanV1: [{ position: 0, kind: "page", key: "home", operation: "create" }],
    })
  ).toThrow("site_package_rollback_invalid_source");
});

test("builds V1 rollback dependencies and returns their complete transitive closure", () => {
  const items = preflightRollbackEvidence({
    items: [
      rawItem({
        position: 0,
        key: "base",
        operation: "create",
        beforeSnapshot: null,
        complete: snapshot("base-id", "base"),
      }),
      rawItem({
        position: 1,
        key: "middle",
        operation: "create",
        beforeSnapshot: null,
        complete: snapshot("middle-id", "middle"),
        dependencies: ["page:base"],
      }),
      rawItem({
        position: 2,
        key: "top",
        operation: "create",
        beforeSnapshot: null,
        complete: snapshot("top-id", "top"),
        dependencies: ["page:middle"],
      }),
    ],
    initializationPlanV1: undefined,
  }).map(({ persistedSourceItem }) => persistedSourceItem);
  const graph = buildRollbackDependencyGraph({ items, declaredVersion: 1 });
  expect([...collectTransitiveRollbackDependencies({ graph, identity: "page:top" })]).toEqual([
    "page:middle",
    "page:base",
  ]);
  const cyclic = items.map((item, index) =>
    index === 0
      ? { ...item, rollbackAction: { schemaVersion: 1, dependencies: ["page:top"] } }
      : item
  );
  expect(() => buildRollbackDependencyGraph({ items: cyclic, declaredVersion: 1 })).toThrow(
    "site_package_rollback_dependency_invalid"
  );
});

test("round-trips allowed dotted setting identities in V1 rollback actions", () => {
  const action = buildFullSiteRollbackActionV1({
    identity: "setting:site.contentRoutes",
    dependencies: ["content_type:house-project", "detail_page:project-detail"],
  });

  expect(readFullSiteRollbackActionV1(action)).toEqual({
    schemaVersion: 1,
    dependencies: ["content_type:house-project", "detail_page:project-detail"],
  });
});

test("accepts only source-faithful prior success outcomes", () => {
  const source = rawItem({
    position: 0,
    key: "home",
    operation: "create",
    beforeSnapshot: null,
    complete: snapshot("page-id", "final"),
  });
  const outcome: RawFullSiteInstallLedgerItem = {
    ...source,
    status: "success",
    beforeSnapshot: source.afterSnapshot,
    afterSnapshot: source.beforeSnapshot,
  };
  expect(
    preflightPriorRollbackSuccessOutcomes({
      sourceItems: [source],
      priorOutcomes: [outcome],
    })
  ).toEqual(new Set(["page:home"]));
  expect(() =>
    preflightPriorRollbackSuccessOutcomes({
      sourceItems: [source],
      priorOutcomes: [{ ...outcome, afterSnapshot: snapshot("other", "wrong") }],
    })
  ).toThrow("site_package_rollback_invalid_source");
});

test("reverses a sorted settings frontier through one required atomic batch", async () => {
  const calls: string[][] = [];
  const makeRefined = (position: number, key: string): RefinedRollbackItem => {
    const complete = { id: key, desired: { present: true, value: key } };
    const persistedSourceItem = {
      position,
      kind: "setting",
      key,
      operation: "create",
      status: "success",
      beforeSnapshot: null,
      afterSnapshot: buildFullSiteDurableAfterSnapshotV1({
        complete,
        staged: null,
        phase: "complete",
      }),
      rollbackAction: { schemaVersion: 1, dependencies: [] },
      error: null,
    } satisfies FullSiteInstallLedgerItem;
    const evidence = {
      identity: `setting:${key}` as const,
      operation: "create" as const,
      persistedSourceItem: {
        ...persistedSourceItem,
        rollbackAction: persistedSourceItem.rollbackAction,
      },
      durableAfter: persistedSourceItem.afterSnapshot,
      finalTarget: complete,
      stagedTarget: null,
      phase: "complete" as const,
      before: null,
    };
    return {
      state: "applied",
      evidence,
      classification: {
        identity: evidence.identity,
        item: evidence.persistedSourceItem,
        hint: "applied",
      },
      reversal: { operation: "create", id: key, expectedCurrent: complete, target: null },
    };
  };
  const items = [makeRefined(2, "site.name"), makeRefined(1, "site.locale")];
  const results = await reverseSettingsBatch({
    items,
    actorId: "00000000-0000-4000-8000-000000000547",
    adapter: {
      captureSnapshotByIdOrNull: async () => null,
      deleteSnapshotAtomic: async () => undefined,
      restoreSnapshotAtomic: async () => undefined,
      reverseSettingsBatch: async ({ items: reversals }) => {
        calls.push(reversals.map(({ id }) => id));
      },
    },
  });
  expect(calls).toEqual([["site.name", "site.locale"]]);
  expect(results.map(({ outcome }) => outcome)).toEqual(["reversed", "reversed"]);
});
