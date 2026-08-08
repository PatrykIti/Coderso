import type { PlainJsonObject, PlainJsonValue } from "../../../../workers/contracts";
import {
  TASK540_CLEANUP_API_NODE_OPERATIONS,
  assertTask540SeoBatchBudget,
  buildTask540CleanupDispatches,
  preserveTask540CanonicalCleanupReceipts,
  task540CleanupCardinality,
  type Task540DbCleanupOperation,
} from "../executor/cleanup-receipts";
import { dispatchTask540Operation } from "../executor/operation-dispatch";
import { TASK540_PRODUCTION_HANDLER_ARTIFACT } from "../../production-handlers";
import type { Task540CleanupBatchOutput, Task540CleanupResult } from "../../worker-operations";
import type { Task540NativeCleanupReceipt } from "../composition/contracts";
import type { Task540RuntimeState } from "./contracts";
import { restoreTask540BootstrapBaseline } from "./bootstrap-restoration";
import {
  capture,
  fixtureObject,
  runtimeInvariant,
  runtimeObject,
  runtimeString,
  runtimeUuid,
  task540Sha256,
} from "./native-utils";

type CleanupSlot = "provenance" | "delete" | "absence";

interface CanonicalCleanupReceipt extends Task540NativeCleanupReceipt {
  readonly ordinal: number;
  readonly resourceKey: string;
  readonly slot: CleanupSlot;
}

export interface Task540SeoCleanupCandidate extends PlainJsonObject {
  readonly id: string;
  readonly targetId: string;
  readonly targetType: "entry";
}

interface CleanupResource {
  readonly resourceKey: string;
  readonly kind: string;
  readonly identifier: readonly string[];
  readonly mode: "api" | "db" | "parent";
  readonly route?: string;
  readonly wave: number;
}

const SLOTS: readonly CleanupSlot[] = Object.freeze(["provenance", "delete", "absence"]);

export function assertTask540SeoCleanupCandidate(
  value: unknown,
  expected: Readonly<{ id: string; targetId: string; targetType: "entry" }>
): Task540SeoCleanupCandidate {
  const candidate = runtimeObject(value, "TASK-540 SEO cleanup candidate");
  runtimeInvariant(
    Object.keys(candidate).join(",") === "id,targetId,targetType" &&
      candidate.id === expected.id &&
      candidate.targetId === expected.targetId &&
      candidate.targetType === expected.targetType,
    "TASK-540 SEO cleanup identity drifted"
  );
  runtimeUuid(candidate.id, "TASK-540 SEO cleanup document ID");
  runtimeUuid(candidate.targetId, "TASK-540 SEO cleanup target ID");
  return candidate as Task540SeoCleanupCandidate;
}

function cleanupReceipt(
  resourceKey: string,
  slot: CleanupSlot,
  ordinal: number
): CanonicalCleanupReceipt {
  return Object.freeze({
    logicalId: `cleanup/${String(ordinal).padStart(2, "0")}-${resourceKey.replaceAll("/", "-")}-${slot}`,
    ordinal,
    pass: true,
    resourceKey,
    slot,
  });
}

function resource(
  resourceKey: string,
  kind: string,
  identifier: readonly string[],
  mode: CleanupResource["mode"],
  wave: number,
  route?: string
): CleanupResource {
  runtimeInvariant(
    identifier.length > 0 &&
      identifier.every((part) => typeof part === "string" && part.length > 0),
    "TASK-540 cleanup identifier is invalid"
  );
  return Object.freeze({
    resourceKey,
    kind,
    identifier: Object.freeze(identifier),
    mode,
    wave,
    ...(route === undefined ? {} : { route }),
  });
}

async function discoverSeo(
  state: Task540RuntimeState
): Promise<readonly Task540SeoCleanupCandidate[]> {
  const targetIds = [
    "entry.id",
    "related-entry-a1.id",
    "related-entry-a2.id",
    "related-entry-b1.id",
    "related-entry-b2.id",
    "related-entry-failure1.id",
  ].map((name) => capture(state.memory.captures, name));
  const readCandidates = async (): Promise<readonly Task540SeoCleanupCandidate[]> => {
    const output = runtimeObject(
      await dispatchTask540Operation(state.pool, {
        operationId: "resource/seo-entry-discovery",
        input: { targetIds },
      }),
      "TASK-540 SEO discovery"
    );
    runtimeInvariant(Array.isArray(output.candidates), "TASK-540 SEO candidates are invalid");
    runtimeInvariant(
      output.candidates.length <= targetIds.length,
      "TASK-540 SEO candidate cardinality drifted"
    );
    const remaining = new Set(targetIds);
    const ids = new Set<string>();
    const candidates = output.candidates.map((value) => {
      const raw = runtimeObject(value, "TASK-540 SEO candidate");
      const expected = {
        id: runtimeUuid(raw.id, "TASK-540 SEO document ID"),
        targetId: runtimeUuid(raw.targetId, "TASK-540 SEO target ID"),
        targetType: "entry" as const,
      };
      const candidate = assertTask540SeoCleanupCandidate(raw, expected);
      runtimeInvariant(
        remaining.delete(candidate.targetId) && !ids.has(candidate.id),
        "TASK-540 SEO candidate correlation drifted"
      );
      ids.add(candidate.id);
      return candidate;
    });
    runtimeInvariant(
      remaining.size + ids.size === targetIds.length,
      "TASK-540 SEO target set drifted"
    );
    return Object.freeze(candidates);
  };
  const first = await readCandidates();
  await new Promise<void>((resolveWait) => setTimeout(resolveWait, 40));
  const second = await readCandidates();
  runtimeInvariant(
    JSON.stringify(first) === JSON.stringify(second),
    "TASK-540 SEO discovery did not reach a stable boundary"
  );
  return second;
}

function apiResources(state: Task540RuntimeState): readonly CleanupResource[] {
  const captures = state.memory.captures;
  const editableSlug = runtimeString(
    fixtureObject(
      state.plan.fixtureBlueprint,
      ["contentTypes", "editable"],
      "TASK-540 editable type"
    ).slug,
    "TASK-540 editable type slug"
  );
  const relatedASlug = runtimeString(
    fixtureObject(
      state.plan.fixtureBlueprint,
      ["contentTypes", "relatedA"],
      "TASK-540 related-A type"
    ).slug,
    "TASK-540 related-A type slug"
  );
  const relatedBSlug = runtimeString(
    fixtureObject(
      state.plan.fixtureBlueprint,
      ["contentTypes", "relatedB"],
      "TASK-540 related-B type"
    ).slug,
    "TASK-540 related-B type slug"
  );
  const relatedFailureSlug = runtimeString(
    fixtureObject(
      state.plan.fixtureBlueprint,
      ["contentTypes", "relatedFailure"],
      "TASK-540 related-failure type"
    ).slug,
    "TASK-540 related-failure type slug"
  );
  return Object.freeze([
    resource(
      "screen/main",
      "screen-main",
      [capture(captures, "screen.id")],
      "api",
      0,
      `/custom-screens/${encodeURIComponent(capture(captures, "screen.id"))}`
    ),
    resource(
      "screen/retry",
      "screen-retry",
      [capture(captures, "retry-screen.id")],
      "api",
      0,
      `/custom-screens/${encodeURIComponent(capture(captures, "retry-screen.id"))}`
    ),
    resource(
      "entry/editable",
      "entry-editable",
      [capture(captures, "entry.id")],
      "api",
      0,
      `/content/${encodeURIComponent(editableSlug)}/entries/${encodeURIComponent(capture(captures, "entry.id"))}`
    ),
    resource(
      "entry/related-a1",
      "entry-related-a1",
      [capture(captures, "related-entry-a1.id")],
      "api",
      0,
      `/content/${encodeURIComponent(relatedASlug)}/entries/${encodeURIComponent(capture(captures, "related-entry-a1.id"))}`
    ),
    resource(
      "entry/related-a2",
      "entry-related-a2",
      [capture(captures, "related-entry-a2.id")],
      "api",
      0,
      `/content/${encodeURIComponent(relatedASlug)}/entries/${encodeURIComponent(capture(captures, "related-entry-a2.id"))}`
    ),
    resource(
      "entry/related-b1",
      "entry-related-b1",
      [capture(captures, "related-entry-b1.id")],
      "api",
      0,
      `/content/${encodeURIComponent(relatedBSlug)}/entries/${encodeURIComponent(capture(captures, "related-entry-b1.id"))}`
    ),
    resource(
      "entry/related-b2",
      "entry-related-b2",
      [capture(captures, "related-entry-b2.id")],
      "api",
      0,
      `/content/${encodeURIComponent(relatedBSlug)}/entries/${encodeURIComponent(capture(captures, "related-entry-b2.id"))}`
    ),
    resource(
      "entry/related-failure1",
      "entry-related-failure1",
      [capture(captures, "related-entry-failure1.id")],
      "api",
      0,
      `/content/${encodeURIComponent(relatedFailureSlug)}/entries/${encodeURIComponent(capture(captures, "related-entry-failure1.id"))}`
    ),
    resource(
      "content-type/editable",
      "content-type-editable",
      [capture(captures, "content-type-editable.id")],
      "api",
      0,
      `/content-types/${encodeURIComponent(capture(captures, "content-type-editable.id"))}`
    ),
    resource(
      "content-type/related-a",
      "content-type-related-a",
      [capture(captures, "content-type-related-a.id")],
      "api",
      0,
      `/content-types/${encodeURIComponent(capture(captures, "content-type-related-a.id"))}`
    ),
    resource(
      "content-type/related-b",
      "content-type-related-b",
      [capture(captures, "content-type-related-b.id")],
      "api",
      0,
      `/content-types/${encodeURIComponent(capture(captures, "content-type-related-b.id"))}`
    ),
    resource(
      "content-type/related-failure",
      "content-type-related-failure",
      [capture(captures, "content-type-related-failure.id")],
      "api",
      0,
      `/content-types/${encodeURIComponent(capture(captures, "content-type-related-failure.id"))}`
    ),
  ]);
}

function dbResources(
  state: Task540RuntimeState,
  seo: readonly Task540SeoCleanupCandidate[]
): readonly CleanupResource[] {
  const captures = state.memory.captures;
  const blockId = runtimeString(
    fixtureObject(state.plan.fixtureBlueprint, ["screen", "blockIds"], "TASK-540 Screen blocks")
      .raceImage,
    "TASK-540 override block"
  );
  return Object.freeze([
    resource(
      "override/main",
      "presentation-override",
      [capture(captures, "screen.id"), capture(captures, "entry.id"), blockId, "mediaAssetId"],
      "db",
      0
    ),
    ...seo.map((candidate, index) =>
      resource(
        `seo/${index + 1}`,
        "seo-document-entry",
        [candidate.id, candidate.targetType, candidate.targetId],
        "db",
        0
      )
    ),
    resource(
      "setting/user-a",
      "setting-user-a",
      [capture(captures, "user-a.id"), "customScreens.entry.preferences"],
      "db",
      0
    ),
    resource(
      "setting/user-b",
      "setting-user-b",
      [capture(captures, "user-b.id"), "customScreens.entry.preferences"],
      "db",
      0
    ),
    resource(
      "media/main",
      "media-row-key",
      [capture(captures, "media.id"), capture(captures, "media.storage-key")],
      "db",
      1
    ),
    resource("user/a", "user-a", [capture(captures, "user-a.id")], "db", 2),
    resource("user/b", "user-b", [capture(captures, "user-b.id")], "db", 2),
  ]);
}

function canonicalReceipts(
  resources: readonly CleanupResource[]
): readonly CanonicalCleanupReceipt[] {
  const receipts: CanonicalCleanupReceipt[] = [];
  for (const resourceValue of resources) {
    for (const slot of SLOTS)
      receipts.push(cleanupReceipt(resourceValue.resourceKey, slot, receipts.length));
  }
  return Object.freeze(receipts);
}

function dbOperations(
  resources: readonly CleanupResource[],
  receipts: readonly CanonicalCleanupReceipt[]
): readonly Task540DbCleanupOperation[] {
  const operations: Task540DbCleanupOperation[] = [];
  for (const resourceValue of resources.filter(({ mode }) => mode === "db")) {
    const slots: readonly CleanupSlot[] =
      resourceValue.kind === "setting-user-a" ||
      resourceValue.kind === "setting-user-b" ||
      resourceValue.kind === "user-a" ||
      resourceValue.kind === "user-b"
        ? Object.freeze(["delete", "absence"])
        : SLOTS;
    for (const slot of slots) {
      const receipt = receipts.find(
        ({ resourceKey, slot: candidate }) =>
          resourceKey === resourceValue.resourceKey && candidate === slot
      );
      runtimeInvariant(receipt !== undefined, "TASK-540 DB cleanup receipt is absent");
      operations.push(
        Object.freeze({
          logicalId: receipt.logicalId,
          resourceKey: resourceValue.resourceKey,
          kind: resourceValue.kind,
          operation: slot,
          identifier: resourceValue.identifier,
          ownershipSha256: task540Sha256(
            JSON.stringify([resourceValue.resourceKey, resourceValue.identifier])
          ),
          profileId: "database",
          wave:
            resourceValue.kind === "media-row-key" && slot === "provenance"
              ? 0
              : resourceValue.wave,
          ordinal: receipt.ordinal,
        })
      );
    }
  }
  return Object.freeze(operations);
}

async function executeApiResource(
  state: Task540RuntimeState,
  resourceValue: CleanupResource
): Promise<number> {
  runtimeInvariant(resourceValue.route !== undefined, "TASK-540 API cleanup route is absent");
  const session = state.sessions.require("bootstrap");
  const before = await session.request("GET", resourceValue.route, { csrf: false });
  runtimeInvariant(
    runtimeObject(before.value, "TASK-540 API cleanup provenance").id ===
      resourceValue.identifier[0],
    "TASK-540 API cleanup provenance drifted"
  );
  await session.request("DELETE", resourceValue.route);
  const after = await session.request("GET", resourceValue.route, {
    csrf: false,
    allowNotFound: true,
  });
  runtimeInvariant(after.status === 404, "TASK-540 API cleanup absence drifted");
  return 3;
}

async function dispatchCleanupWave(
  state: Task540RuntimeState,
  dispatches: ReturnType<typeof buildTask540CleanupDispatches>,
  wave: number,
  outputs: Task540CleanupBatchOutput[]
): Promise<void> {
  for (const dispatch of dispatches.filter((candidate) => candidate.wave === wave)) {
    const output = (await state.pool.dispatch(
      dispatch.descriptor,
      dispatch.input
    )) as Task540CleanupBatchOutput;
    assertTask540SeoBatchBudget(dispatch, output.statements);
    outputs.push(output);
  }
}

function mergeDbReceipt(
  receipt: CanonicalCleanupReceipt,
  result: Task540CleanupResult
): CanonicalCleanupReceipt {
  runtimeInvariant(
    receipt.logicalId === result.logicalId &&
      receipt.resourceKey === result.resourceKey &&
      receipt.slot === result.operation &&
      isCleanupResultOutput(result.output),
    "TASK-540 DB cleanup result drifted"
  );
  return receipt;
}

function isCleanupResultOutput(value: PlainJsonValue): boolean {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function finalizeTask540NativeCleanup(
  state: Task540RuntimeState
): Promise<readonly Task540NativeCleanupReceipt[]> {
  const seo = await discoverSeo(state);
  const api = apiResources(state);
  const db = dbResources(state, seo);
  const dbByKey = new Map(db.map((item) => [item.resourceKey, item]));
  const requireDb = (resourceKey: string): CleanupResource => {
    const item = dbByKey.get(resourceKey);
    runtimeInvariant(item !== undefined, "TASK-540 DB cleanup resource is absent");
    return item;
  };
  const orderedResources = Object.freeze([
    requireDb("override/main"),
    ...seo.map((_, index) => requireDb(`seo/${index + 1}`)),
    requireDb("setting/user-a"),
    requireDb("setting/user-b"),
    ...api.slice(0, 2),
    ...api.slice(2, 8),
    requireDb("media/main"),
    ...api.slice(8),
    requireDb("user/a"),
    requireDb("user/b"),
  ]);
  const cardinality = task540CleanupCardinality(seo.length);
  runtimeInvariant(
    orderedResources.length * 3 === cardinality.logicalReceipts,
    "TASK-540 cleanup resource cardinality drifted"
  );
  const receipts = canonicalReceipts(orderedResources);
  const operations = dbOperations(orderedResources, receipts);
  const dispatches = buildTask540CleanupDispatches(operations, TASK540_PRODUCTION_HANDLER_ARTIFACT);
  const outputs: Task540CleanupBatchOutput[] = [];
  let parentOperations = 4;
  await dispatchCleanupWave(state, dispatches, 0, outputs);
  for (const resourceValue of api)
    parentOperations += await executeApiResource(state, resourceValue);
  await state.sessions
    .require("bootstrap")
    .request("DELETE", `/media/${encodeURIComponent(capture(state.memory.captures, "media.id"))}`);
  await dispatchCleanupWave(state, dispatches, 1, outputs);
  await state.sessions.close();
  runtimeInvariant(
    state.bootstrapLoginAttempted &&
      state.bootstrapBaseline !== null &&
      state.bootstrapNewestOwnedPair !== null &&
      !state.bootstrapRestored,
    "TASK-540 bootstrap restoration authority is incomplete"
  );
  await restoreTask540BootstrapBaseline(state.pool, {
    baseline: state.bootstrapBaseline,
    newestOwnedPair: state.bootstrapNewestOwnedPair,
  });
  state.bootstrapRestored = true;
  await dispatchCleanupWave(state, dispatches, 2, outputs);
  runtimeInvariant(
    parentOperations === TASK540_CLEANUP_API_NODE_OPERATIONS,
    "TASK-540 parent cleanup operation cardinality drifted"
  );
  const preserved = preserveTask540CanonicalCleanupReceipts(
    receipts,
    outputs,
    (receipt) => receipt.logicalId,
    mergeDbReceipt
  );
  runtimeInvariant(
    preserved.length === cardinality.logicalReceipts,
    "TASK-540 cleanup projection cardinality drifted"
  );
  return Object.freeze(preserved.map(({ logicalId }) => Object.freeze({ logicalId, pass: true })));
}
