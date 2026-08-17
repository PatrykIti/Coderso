import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { db } from "../../../core/db/client";
import {
  contentEntries,
  contentTypes,
  detailPageDocuments,
  formActions,
  forms,
  menuItems,
  menus,
  solutionKitInstallItems,
  solutionKitInstallRuns,
} from "../../../core/db/schema";
import { createFullSiteCurrentResourceResolver } from "../../../core/services/kits/fullSiteInstall/currentResourceResolver";
import type {
  CurrentResourceState,
  FullSiteCurrentResourceResolver,
  FullSiteInstallResourceKind,
} from "../../../core/services/kits/fullSiteInstallTypes";
import { createLegacyInstallLedger } from "../../../core/services/kits/legacyInstallRunPersistence";
import type { JsonObject, ResourceSeed } from "../../../core/services/kits/fullSitePackage/types";
import {
  cleanupOwnedIds,
  createOwnedIds,
  ownId,
  packageFixture,
  persistEvidence,
  planPackage,
  projectPersistedFormActions,
} from "./fullSiteManagedOwnershipSupport";
test("natural-key-only native equality remains an unmanaged planner conflict", async () => {
  const scope = randomUUID();
  const packageKey = `ownership-natural-${scope}`;
  const slug = `ownership-natural-${scope}`;
  const owned = createOwnedIds();
  try {
    const formId = ownId(owned.forms);
    await db.insert(forms).values({
      id: formId,
      name: `Natural ${scope}`,
      slug,
      status: "draft",
      settings: {},
    });
    const ledger = createLegacyInstallLedger();
    const pkg = packageFixture(packageKey, (resources) => {
      resources.forms.push({ key: "brief", desired: { slug } });
    });
    const resolver = createFullSiteCurrentResourceResolver(packageKey, ledger);
    await expect(resolver("form", pkg.resources.forms[0]!)).resolves.toEqual({
      id: formId,
      desired: { slug },
    });
    await expect(planPackage(pkg, ledger, resolver)).rejects.toMatchObject({
      code: "site_package_conflict",
      identity: "form:brief",
    });
  } finally {
    await cleanupOwnedIds(owned);
  }
});
test("dependency-bearing planning uses one batch snapshot and zero direct fallback reads", async () => {
  const scope = randomUUID();
  const packageKey = `ownership-evidence-count-${scope}`;
  const slug = `ownership-evidence-type-${scope}`;
  const owned = createOwnedIds();
  try {
    const contentTypeId = ownId(owned.contentTypes);
    await db.insert(contentTypes).values({
      id: contentTypeId,
      name: `Evidence count ${scope}`,
      slug,
      schema: {},
      config: {},
    });
    const ledger = createLegacyInstallLedger();
    await persistEvidence({
      owned,
      packageKey,
      kind: "content_type",
      key: "project",
      resourceId: contentTypeId,
      desired: { slug },
    });
    const originalFindEvidence = ledger.findManagedResourceEvidence;
    let evidenceCalls = 0;
    ledger.findManagedResourceEvidence = async (input) => {
      evidenceCalls += 1;
      return originalFindEvidence(input);
    };
    const concreteResolver = createFullSiteCurrentResourceResolver(packageKey, ledger);
    let resolverCalls = 0;
    const resolver: FullSiteCurrentResourceResolver = async (
      kind,
      seed,
      expectedId,
      managedEvidence
    ) => {
      resolverCalls += 1;
      return concreteResolver(kind, seed, expectedId, managedEvidence);
    };
    const parentReference = { ref: "content_type" as const, key: "project" };
    const pkg = packageFixture(packageKey, (resources) => {
      resources.contentTypes.push({ key: "project", desired: { slug } });
      resources.entries.push({
        key: "aurora",
        desired: { slug: `aurora-${scope}`, contentTypeId: parentReference },
      });
    });
    let snapshotLoads = 0;
    const plan = await planPackage(pkg, ledger, resolver, undefined, () => {
      snapshotLoads += 1;
    });
    expect(snapshotLoads).toBe(1);
    expect(evidenceCalls).toBe(0);
    expect(resolverCalls).toBe(0);
    expect(plan.operations.map(({ operation }) => operation)).toEqual(["noop", "create"]);
    expect(plan.operations[1]?.desired.contentTypeId).toEqual(parentReference);
  } finally {
    await cleanupOwnedIds(owned);
  }
});
test("direct concrete two-argument form resolution performs one self-evidence lookup", async () => {
  const scope = randomUUID();
  const packageKey = `ownership-direct-resolver-${scope}`;
  const ledger = createLegacyInstallLedger();
  const originalFindEvidence = ledger.findManagedResourceEvidence;
  const evidenceInputs: Array<{
    packageKey: string;
    kind: FullSiteInstallResourceKind;
    key: string;
  }> = [];
  ledger.findManagedResourceEvidence = async (input) => {
    evidenceInputs.push(input);
    return originalFindEvidence(input);
  };
  const resolver = createFullSiteCurrentResourceResolver(packageKey, ledger);
  await expect(
    resolver("form", {
      key: "brief",
      desired: { slug: `missing-form-${scope}` },
    })
  ).resolves.toBeNull();
  expect(evidenceInputs).toEqual([{ packageKey, kind: "form", key: "brief" }]);
});
test("strict expected entry IDs retain both the slug and resolved parent identity", async () => {
  const scope = randomUUID();
  const packageKey = `ownership-entry-${scope}`;
  const slug = `shared-entry-${scope}`;
  const owned = createOwnedIds();
  try {
    const firstTypeId = ownId(owned.contentTypes);
    const secondTypeId = ownId(owned.contentTypes);
    const firstEntryId = ownId(owned.entries);
    const secondEntryId = ownId(owned.entries);
    await db.insert(contentTypes).values([
      { id: firstTypeId, name: `First ${scope}`, slug: `first-${scope}`, schema: {}, config: {} },
      {
        id: secondTypeId,
        name: `Second ${scope}`,
        slug: `second-${scope}`,
        schema: {},
        config: {},
      },
    ]);
    await db.insert(contentEntries).values([
      {
        id: firstEntryId,
        typeId: firstTypeId,
        slug,
        title: "First",
        data: {},
        status: "draft",
      },
      {
        id: secondEntryId,
        typeId: secondTypeId,
        slug,
        title: "Second",
        data: {},
        status: "draft",
      },
    ]);
    const ledger = createLegacyInstallLedger();
    await persistEvidence({
      owned,
      packageKey,
      kind: "content_type",
      key: "second-type",
      resourceId: secondTypeId,
    });
    const seed: ResourceSeed = {
      key: "shared-entry",
      desired: {
        slug,
        contentTypeId: { ref: "content_type", key: "second-type" },
      },
    };
    const resolver = createFullSiteCurrentResourceResolver(packageKey, ledger);
    await expect(resolver("content_entry", seed, firstEntryId)).resolves.toBeNull();
    await expect(resolver("content_entry", seed, randomUUID())).resolves.toBeNull();
    await expect(resolver("content_entry", seed, secondEntryId)).resolves.toMatchObject({
      id: secondEntryId,
      desired: { slug, contentTypeId: secondTypeId },
    });
    await expect(resolver("content_entry", seed)).resolves.toMatchObject({ id: secondEntryId });
  } finally {
    await cleanupOwnedIds(owned);
  }
});
test("JSON-name detail lookup is deterministic and strict expected IDs never fall back", async () => {
  const scope = randomUUID();
  const packageKey = `ownership-detail-${scope}`;
  const naturalName = `Shared detail ${scope}`;
  const orderedIds = [randomUUID(), randomUUID()].sort();
  const lowerId = orderedIds[0]!;
  const higherId = orderedIds[1]!;
  const wrongId = randomUUID();
  const owned = createOwnedIds();
  try {
    const typeId = ownId(owned.contentTypes);
    ownId(owned.detailPages, lowerId);
    ownId(owned.detailPages, higherId);
    ownId(owned.detailPages, wrongId);
    await db.insert(contentTypes).values({
      id: typeId,
      name: `Detail type ${scope}`,
      slug: `detail-type-${scope}`,
      schema: {},
      config: {},
    });
    await db.insert(detailPageDocuments).values([
      {
        id: higherId,
        name: naturalName,
        contentTypeId: typeId,
        status: "draft",
        currentDocument: { schemaVersion: 1, name: naturalName, status: "draft", blocks: [] },
      },
      {
        id: lowerId,
        name: naturalName,
        contentTypeId: typeId,
        status: "draft",
        currentDocument: { schemaVersion: 1, name: naturalName, status: "draft", blocks: [] },
      },
      {
        id: wrongId,
        name: `Wrong ${scope}`,
        contentTypeId: typeId,
        status: "draft",
        currentDocument: {
          schemaVersion: 1,
          name: `Wrong ${scope}`,
          status: "draft",
          blocks: [],
        },
      },
    ]);
    const seed: ResourceSeed = { key: "detail", desired: { name: naturalName } };
    const resolver = createFullSiteCurrentResourceResolver(packageKey, createLegacyInstallLedger());
    await expect(resolver("detail_page", seed)).resolves.toMatchObject({ id: lowerId });
    await expect(resolver("detail_page", seed, higherId)).resolves.toMatchObject({ id: higherId });
    await expect(resolver("detail_page", seed, wrongId)).resolves.toBeNull();
  } finally {
    await cleanupOwnedIds(owned);
  }
});
test("Menu owner projection orders equal positions by stable persisted item ID", async () => {
  const scope = randomUUID();
  const packageKey = `ownership-menu-${scope}`;
  const name = `Ownership menu ${scope}`;
  const itemIds = [randomUUID(), randomUUID()].sort();
  const owned = createOwnedIds();
  try {
    const menuId = ownId(owned.menus);
    for (const itemId of itemIds) ownId(owned.menuItems, itemId);
    await db.insert(menus).values({
      id: menuId,
      name,
      location: null,
      status: "draft",
      settings: null,
    });
    await db.insert(menuItems).values([
      {
        id: itemIds[1]!,
        menuId,
        label: "Second",
        href: "/second",
        orderIndex: 4,
        settings: {},
      },
      {
        id: itemIds[0]!,
        menuId,
        label: "First",
        href: "/first",
        orderIndex: 4,
        settings: {},
      },
    ]);
    const resolver = createFullSiteCurrentResourceResolver(packageKey, createLegacyInstallLedger());
    const current = await resolver("menu", { key: "primary", desired: { name, items: [] } });
    expect(
      (current?.desired.items as Array<{ id: string }> | undefined)?.map(({ id }) => id)
    ).toEqual(itemIds);
  } finally {
    await cleanupOwnedIds(owned);
  }
});
test("mismatched ledger snapshot IDs never manage the natural-key row", async () => {
  const scope = randomUUID();
  const packageKey = `ownership-mismatch-${scope}`;
  const slug = `ownership-mismatch-${scope}`;
  const owned = createOwnedIds();
  try {
    const formId = ownId(owned.forms);
    await db.insert(forms).values({
      id: formId,
      name: `Mismatch ${scope}`,
      slug,
      status: "draft",
      settings: {},
    });
    const ledger = createLegacyInstallLedger();
    await persistEvidence({
      owned,
      packageKey,
      kind: "form",
      key: "brief",
      resourceId: randomUUID(),
      desired: { slug },
    });
    const pkg = packageFixture(packageKey, (resources) => {
      resources.forms.push({ key: "brief", desired: { slug } });
    });
    const resolver = createFullSiteCurrentResourceResolver(packageKey, ledger);
    await expect(resolver("form", pkg.resources.forms[0]!)).resolves.toMatchObject({ id: formId });
    await expect(planPackage(pkg, ledger, resolver)).rejects.toMatchObject({
      code: "site_package_conflict",
      identity: "form:brief",
    });
  } finally {
    await cleanupOwnedIds(owned);
  }
});
test("noop, failed, failed-item, and rolled-back evidence never manages state", async () => {
  const ledger = createLegacyInstallLedger();
  const scope = randomUUID();
  const packageKeys = {
    noop: `ownership-noop-${scope}`,
    failedRun: `ownership-failed-run-${scope}`,
    failedItem: `ownership-failed-item-${scope}`,
    rolledBack: `ownership-rolled-back-${scope}`,
  };
  const key = `resource-${scope}`;
  const owned = createOwnedIds();
  try {
    await persistEvidence({
      owned,
      packageKey: packageKeys.noop,
      kind: "form",
      key,
      resourceId: randomUUID(),
      operation: "noop",
    });
    await persistEvidence({
      owned,
      packageKey: packageKeys.failedRun,
      kind: "form",
      key,
      resourceId: randomUUID(),
      runStatus: "failed",
    });
    await persistEvidence({
      owned,
      packageKey: packageKeys.failedItem,
      kind: "form",
      key,
      resourceId: randomUUID(),
      itemStatus: "failed",
    });
    const source = await persistEvidence({
      owned,
      packageKey: packageKeys.rolledBack,
      kind: "form",
      key,
      resourceId: randomUUID(),
    });
    const rollbackRunId = ownId(owned.installRuns);
    const rollbackItemId = ownId(owned.installItems);
    const timestamp = new Date();
    await db.insert(solutionKitInstallRuns).values({
      id: rollbackRunId,
      kitId: packageKeys.rolledBack,
      mode: "rollback",
      status: "success",
      actorId: null,
      rollbackOfRunId: source.id,
      options: {},
      summary: {},
      error: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      finishedAt: timestamp,
    });
    await db.insert(solutionKitInstallItems).values({
      id: rollbackItemId,
      runId: rollbackRunId,
      position: 0,
      resourceType: "form",
      resourceKey: key,
      operation: "restore",
      status: "success",
      beforeSnapshot: null,
      afterSnapshot: null,
      rollbackAction: null,
      error: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    for (const packageKey of Object.values(packageKeys)) {
      await expect(
        ledger.findManagedResourceEvidence({ packageKey, kind: "form", key })
      ).resolves.toBeNull();
    }
  } finally {
    await cleanupOwnedIds(owned);
  }
});
test("timestamp-tied managed evidence uses the frozen descending run ID tie-break", async () => {
  const scope = randomUUID();
  const packageKey = `ownership-tie-${scope}`;
  const resourceKey = `resource-${scope}`;
  const runIds = [randomUUID(), randomUUID()].sort();
  const lowerRunId = runIds[0]!;
  const higherRunId = runIds[1]!;
  const lowerResourceId = randomUUID();
  const higherResourceId = randomUUID();
  const timestamp = new Date("2026-07-24T12:00:00.000Z");
  const owned = createOwnedIds();
  try {
    for (const runId of runIds) ownId(owned.installRuns, runId);
    const lowerItemId = ownId(owned.installItems);
    const higherItemId = ownId(owned.installItems);
    await db.insert(solutionKitInstallRuns).values(
      runIds.map((id) => ({
        id,
        kitId: packageKey,
        mode: "apply",
        status: "success",
        actorId: null,
        rollbackOfRunId: null,
        options: { fullSitePackage: true },
        summary: {},
        error: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        finishedAt: timestamp,
      }))
    );
    await db.insert(solutionKitInstallItems).values([
      {
        id: lowerItemId,
        runId: lowerRunId,
        position: 0,
        resourceType: "form",
        resourceKey,
        operation: "create",
        status: "success",
        beforeSnapshot: null,
        afterSnapshot: { id: lowerResourceId, desired: { winner: "lower" } },
        rollbackAction: null,
        error: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: higherItemId,
        runId: higherRunId,
        position: 0,
        resourceType: "form",
        resourceKey,
        operation: "create",
        status: "success",
        beforeSnapshot: null,
        afterSnapshot: { id: higherResourceId, desired: { winner: "higher" } },
        rollbackAction: null,
        error: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ]);
    await expect(
      createLegacyInstallLedger().findManagedResourceEvidence({
        packageKey,
        kind: "form",
        key: resourceKey,
      })
    ).resolves.toMatchObject({
      runId: higherRunId,
      resourceId: higherResourceId,
      desired: { winner: "higher" },
    });
  } finally {
    await cleanupOwnedIds(owned);
  }
});
test("bounded mixed rollback history returns the exact eligible managed winner", async () => {
  const scope = randomUUID();
  const packageKey = `ownership-history-${scope}`;
  const resourceKey = `resource-${scope}`;
  const candidateRunIds = Array.from({ length: 16 }, () => randomUUID());
  const candidateItemIds = Array.from({ length: 16 }, () => randomUUID());
  const resourceIds = Array.from({ length: 16 }, () => randomUUID());
  const rollbackRunIds = Array.from({ length: 8 }, () => randomUUID());
  const rollbackItemIds = Array.from({ length: 6 }, () => randomUUID());
  const baseTime = Date.parse("2026-07-24T12:00:00.000Z");
  const owned = createOwnedIds();
  try {
    for (const id of candidateRunIds) ownId(owned.installRuns, id);
    for (const id of rollbackRunIds) ownId(owned.installRuns, id);
    for (const id of candidateItemIds) ownId(owned.installItems, id);
    for (const id of rollbackItemIds) ownId(owned.installItems, id);
    const candidateTime = (index: number) => new Date(baseTime + (16 - index) * 1_000);
    await db.insert(solutionKitInstallRuns).values(
      candidateRunIds.map((id, index) => ({
        id,
        kitId: packageKey,
        mode: "apply",
        status: "success",
        actorId: null,
        rollbackOfRunId: null,
        options: { fullSitePackage: true },
        summary: {},
        error: null,
        createdAt: candidateTime(index),
        updatedAt: candidateTime(index),
        finishedAt: candidateTime(index),
      }))
    );
    await db.insert(solutionKitInstallItems).values(
      candidateItemIds.map((id, index) => ({
        id,
        runId: candidateRunIds[index]!,
        position: 0,
        resourceType: "form",
        resourceKey,
        operation: index % 2 === 0 ? "create" : "update",
        status: "success",
        beforeSnapshot: null,
        afterSnapshot: { id: resourceIds[index], desired: { candidate: index } },
        rollbackAction: null,
        error: null,
        createdAt: candidateTime(index),
        updatedAt: candidateTime(index),
      }))
    );
    await db.insert(solutionKitInstallRuns).values(
      rollbackRunIds.map((id, index) => {
        const group = Math.floor(index / 2);
        const status =
          group === 0
            ? "success"
            : group === 1
              ? "failed"
              : group === 2
                ? "running"
                : index % 2 === 0
                  ? "failed"
                  : "running";
        return {
          id,
          kitId: packageKey,
          mode: "rollback",
          status,
          actorId: null,
          rollbackOfRunId: candidateRunIds[index]!,
          options: {},
          summary: {},
          error: status === "failed" ? "site_package_rollback_failed" : null,
          createdAt: new Date(baseTime + index * 10),
          updatedAt: new Date(baseTime + index * 10),
          finishedAt: status === "running" ? null : new Date(baseTime + index * 10),
        };
      })
    );
    await db.insert(solutionKitInstallItems).values(
      rollbackItemIds.map((id, itemIndex) => {
        const rollbackIndex = 2 + itemIndex;
        return {
          id,
          runId: rollbackRunIds[rollbackIndex]!,
          position: 0,
          resourceType: "form",
          resourceKey,
          operation: "update",
          status: rollbackIndex < 6 ? "success" : "failed",
          beforeSnapshot: null,
          afterSnapshot: null,
          rollbackAction: null,
          error: null,
          createdAt: new Date(baseTime + rollbackIndex * 10),
          updatedAt: new Date(baseTime + rollbackIndex * 10),
        };
      })
    );
    await expect(
      createLegacyInstallLedger().findManagedResourceEvidence({
        packageKey,
        kind: "form",
        key: resourceKey,
      })
    ).resolves.toMatchObject({
      runId: candidateRunIds[6],
      resourceId: resourceIds[6],
      desired: { candidate: 6 },
    });
  } finally {
    await cleanupOwnedIds(owned);
  }
});
test("canonical full Form projection yields noop, then an intended managed update", async () => {
  const scope = randomUUID();
  const packageKey = `ownership-form-${scope}`;
  const slug = `ownership-form-${scope}`;
  const actionIds = [randomUUID(), randomUUID()].sort();
  const owned = createOwnedIds();
  try {
    const formId = ownId(owned.forms);
    for (const actionId of actionIds) ownId(owned.formActions, actionId);
    const rawActions = [
      {
        id: actionIds[1]!,
        type: "success_message" as const,
        label: "Second",
        enabled: true,
        continueOnError: true,
        condition: { operator: "always" as const },
        config: { message: "Second" },
        orderIndex: 5,
      },
      {
        id: actionIds[0]!,
        type: "success_message" as const,
        label: "First",
        enabled: true,
        continueOnError: true,
        condition: { operator: "always" as const },
        config: { message: "First" },
        orderIndex: 5,
      },
    ];
    const actions = projectPersistedFormActions(rawActions);
    await db.insert(forms).values({
      id: formId,
      name: `Managed ${scope}`,
      slug,
      status: "draft",
      description: null,
      successMessage: null,
      successRedirectUrl: null,
      submissionAccess: "public",
      settings: {},
    });
    await db.insert(formActions).values(
      rawActions.map((action) => ({
        ...action,
        formId,
      }))
    );
    const desired: JsonObject = {
      name: `Managed ${scope}`,
      slug,
      status: "draft",
      description: null,
      successMessage: null,
      successRedirectUrl: null,
      submissionAccess: "public",
      settings: {},
      fields: [],
      actions,
    };
    const ledger = createLegacyInstallLedger();
    await persistEvidence({
      owned,
      packageKey,
      kind: "form",
      key: "brief",
      resourceId: formId,
      desired,
    });
    const resolver = createFullSiteCurrentResourceResolver(packageKey, ledger);
    const current: CurrentResourceState | null = await resolver("form", {
      key: "brief",
      desired,
    });
    expect(current).toEqual({ id: formId, desired });
    expect(
      (current?.desired.actions as Array<{ id: string; orderIndex: number }>).map((item) => [
        item.id,
        item.orderIndex,
      ])
    ).toEqual([
      [actionIds[0], 0],
      [actionIds[1], 1],
    ]);
    const noopPackage = packageFixture(packageKey, (resources) => {
      resources.forms.push({ key: "brief", desired });
    });
    const noopPlan = await planPackage(noopPackage, ledger, resolver);
    expect(noopPlan.operations[0]).toMatchObject({
      operation: "noop",
      currentId: formId,
      managedRunId: expect.any(String),
    });
    const updateDesired = { ...desired, name: `Managed updated ${scope}` } as JsonObject;
    const updatePackage = packageFixture(packageKey, (resources) => {
      resources.forms.push({ key: "brief", desired: updateDesired });
    });
    const updatePlan = await planPackage(updatePackage, ledger, resolver);
    expect(updatePlan.operations[0]).toMatchObject({
      operation: "update",
      currentId: formId,
      managedRunId: expect.any(String),
    });
  } finally {
    await cleanupOwnedIds(owned);
  }
});
