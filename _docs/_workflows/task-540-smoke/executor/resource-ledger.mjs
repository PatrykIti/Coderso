import {
  CLEANUP_OPERATION_KINDS,
  RESOURCE_DELTA_KEYS,
  RESOURCE_EDGE_KEYS,
  RESOURCE_KIND_CONTRACTS,
  RESOURCE_RECORD_INPUT_KEYS,
  RESOURCE_RECORD_KEYS,
  TERMINAL_RESOURCE_KINDS,
  deepEqualJson,
} from "./resource-contracts.mjs";
import {
  canonicalJson,
  deepFreezeExact,
  exactOwnKeys,
  hashBytes,
  invariant,
} from "./foundation.mjs";

const PRIVATE_RESOURCE_LEDGER = new WeakMap();
const PRIVATE_CLEANUP_PLANNER = new WeakMap();

export const RESOURCE_IDENTIFIER_TYPES = deepFreezeExact({
  "db-id": 1,
  "db-composite": 4,
  "seo-document-target": 3,
  "media-id-and-storage-key": 2,
  "setting-row": 2,
  "filesystem-path": 1,
  "browser-session-name": 1,
  "api-context-name": 1,
  "process-group-id": 1,
  "proof-key": 1,
});

function resourceOperationPair(slot, resourceKey, required) {
  if (!required) return { op: null, schema: null };
  const digest = hashBytes(Buffer.from(slot + "\0" + resourceKey)).slice(0, 24);
  return { op: slot + "-" + digest, schema: slot + "-schema-v1-" + digest };
}

function validateResourceCoreInput(core, expectedOrdinal) {
  exactOwnKeys(core, RESOURCE_RECORD_INPUT_KEYS, "resource acquisition core", { plain: true });
  invariant(core.schemaVersion === 1, "resource core schema drift");
  invariant(
    typeof core.resourceKey === "string" &&
      core.resourceKey.length > 0 &&
      core.resourceKey.length <= 512,
    "resource key is invalid"
  );
  const contract = RESOURCE_KIND_CONTRACTS[core.kind];
  invariant(contract !== undefined, "resource kind is not registered");
  invariant(
    core.class === contract.class && core.identifierType === contract.identifierType,
    "resource kind shape drift"
  );
  invariant(
    Array.isArray(core.identifier) &&
      Object.isFrozen(core.identifier) &&
      core.identifier.length === contract.identifierArity &&
      core.identifier.every(
        (value) =>
          typeof value === "string" &&
          value.length > 0 &&
          value.length <= 4096 &&
          !value.includes("\0")
      ),
    "resource identifier tuple is invalid"
  );
  invariant(
    RESOURCE_IDENTIFIER_TYPES[core.identifierType] === core.identifier.length,
    "resource identifier arity drift"
  );
  invariant(
    core.ownerSubjectIdentifier === null ||
      (typeof core.ownerSubjectIdentifier === "string" &&
        core.ownerSubjectIdentifier.length > 0 &&
        core.ownerSubjectIdentifier.length <= 128),
    "resource owner correlation is invalid"
  );
  invariant(
    typeof core.acquisitionSourceId === "string" &&
      core.acquisitionSourceId.length > 0 &&
      core.acquisitionSourceId.length <= 128,
    "resource acquisition source is invalid"
  );
  invariant(
    core.sourceActionOrdinal === null ||
      (Number.isSafeInteger(core.sourceActionOrdinal) &&
        core.sourceActionOrdinal > 0 &&
        core.sourceActionOrdinal <= 496),
    "resource source ordinal is invalid"
  );
  invariant(
    contract.acquisitions[core.acquisitionChannel] === core.provenanceAdapterId,
    "resource acquisition provenance drift"
  );
  invariant(
    core.cleanupAdapterId === contract.cleanupAdapterId &&
      core.absenceAdapterId === contract.absenceAdapterId,
    "resource cleanup adapter drift"
  );
  invariant(
    deepEqualJson(core.cleanupPhase, contract.cleanupPhase),
    "resource cleanup phase drift"
  );
  invariant(
    core.cleanupPolicy === contract.cleanupPolicy &&
      core.deleteAuthority === contract.deleteAuthority &&
      core.restoreAuthority === contract.restoreAuthority,
    "resource authority drift"
  );
  const slots = [
    ["P", core.provenanceOpId, core.provenanceSchemaId],
    ["C", core.cleanupOpId, core.cleanupSchemaId],
    ["A", core.absenceOpId, core.absenceSchemaId],
  ];
  for (const [slot, op, schema] of slots) {
    const required = contract.operationSlots.includes(slot);
    invariant((op === null) === (schema === null), "resource operation/schema pair drift");
    invariant(
      required
        ? typeof op === "string" && typeof schema === "string"
        : op === null && schema === null,
      "resource operation slot drift"
    );
    const expected = resourceOperationPair(slot.toLowerCase(), core.resourceKey, required);
    invariant(
      op === expected.op && schema === expected.schema,
      "resource operation identifier drift"
    );
  }
  invariant(
    Number.isSafeInteger(expectedOrdinal) && expectedOrdinal > 0,
    "resource acquisition ordinal is invalid"
  );
}

function validateResourceEdge(edge) {
  exactOwnKeys(edge, RESOURCE_EDGE_KEYS, "resource dependency edge", { plain: true });
  invariant(
    typeof edge.parentKey === "string" &&
      edge.parentKey.length > 0 &&
      typeof edge.childKey === "string" &&
      edge.childKey.length > 0 &&
      edge.parentKey !== edge.childKey &&
      edge.relation === "destructive-parent-depends-on-child",
    "resource dependency edge is invalid"
  );
}

export class ResourceLedgerBuilder {
  constructor(contracts = RESOURCE_KIND_CONTRACTS) {
    invariant(
      contracts === RESOURCE_KIND_CONTRACTS,
      "resource contract registry substitution is forbidden"
    );
    PRIVATE_RESOURCE_LEDGER.set(this, {
      cores: [],
      edges: [],
      keys: new Set(),
      edgeKeys: new Set(),
      persistentProjection: null,
      terminalProjection: null,
      finalProjection: null,
      finalFrozen: false,
    });
  }

  appendValidatedDelta(delta) {
    const state = PRIVATE_RESOURCE_LEDGER.get(this);
    invariant(state && !state.finalFrozen, "resource ledger is frozen");
    exactOwnKeys(delta, RESOURCE_DELTA_KEYS, "resource acquisition delta", { plain: true });
    invariant(
      Array.isArray(delta.cores) && Array.isArray(delta.dependencyEdges),
      "resource delta arrays are invalid"
    );
    const pendingKeys = new Set();
    const cores = delta.cores.map((core, index) => {
      const ordinal = state.cores.length + index + 1;
      validateResourceCoreInput(core, ordinal);
      invariant(
        !state.keys.has(core.resourceKey) && !pendingKeys.has(core.resourceKey),
        "resource key was acquired twice"
      );
      pendingKeys.add(core.resourceKey);
      return deepFreezeExact({
        ...core,
        acquisitionOrdinal: ordinal,
      });
    });
    const allKeys = new Set([...state.keys, ...pendingKeys]);
    const edges = delta.dependencyEdges.map((edge) => {
      validateResourceEdge(edge);
      invariant(
        allKeys.has(edge.parentKey) && allKeys.has(edge.childKey),
        "resource edge endpoint is not acquired"
      );
      const encoded = lengthPrefixedTuple([edge.parentKey, edge.childKey, edge.relation]);
      invariant(!state.edgeKeys.has(encoded), "resource dependency edge was appended twice");
      return { edge: deepFreezeExact({ ...edge }), encoded };
    });
    for (const core of cores) {
      state.cores.push(core);
      state.keys.add(core.resourceKey);
    }
    for (const { edge, encoded } of edges) {
      state.edges.push(edge);
      state.edgeKeys.add(encoded);
    }
    return deepFreezeExact({ appendedCores: cores.length, appendedEdges: edges.length });
  }

  compileResourceRecords(stage) {
    const state = PRIVATE_RESOURCE_LEDGER.get(this);
    invariant(
      ["persistent", "terminal", "final"].includes(stage),
      "resource compile stage is invalid"
    );
    const existingSlot =
      stage === "persistent"
        ? state.persistentProjection
        : stage === "terminal"
          ? state.terminalProjection
          : state.finalProjection;
    if (existingSlot !== null) return existingSlot;
    if (stage === "terminal")
      invariant(
        state.persistentProjection !== null,
        "terminal ledger compiled before persistent ledger"
      );
    if (stage === "final")
      invariant(
        state.persistentProjection !== null && state.terminalProjection !== null,
        "final ledger compiled before stage ledgers"
      );
    const selected = state.cores.filter(
      (core) =>
        stage === "final" || (stage === "terminal") === TERMINAL_RESOURCE_KINDS.has(core.kind)
    );
    const selectedKeys = new Set(selected.map(({ resourceKey }) => resourceKey));
    const dependsOnByKey = new Map(selected.map(({ resourceKey }) => [resourceKey, []]));
    for (const edge of state.edges) {
      const parentSelected = selectedKeys.has(edge.parentKey);
      const childSelected = selectedKeys.has(edge.childKey);
      if (stage === "final")
        invariant(parentSelected && childSelected, "final resource graph has a missing endpoint");
      if (parentSelected && childSelected) dependsOnByKey.get(edge.parentKey).push(edge.childKey);
    }
    const records = selected.map((core) => {
      const dependsOn = [...new Set(dependsOnByKey.get(core.resourceKey))].sort();
      invariant(
        dependsOn.length === dependsOnByKey.get(core.resourceKey).length,
        "resource dependency list contains duplicates"
      );
      const { acquisitionOrdinal, ...input } = core;
      const record = {
        ...input,
        acquisitionOrdinal,
        dependsOn: deepFreezeExact(dependsOn),
      };
      exactOwnKeys(record, RESOURCE_RECORD_KEYS, "compiled resource record", { plain: true });
      return deepFreezeExact(record);
    });
    assertAcyclicResourceGraph(records);
    const projection = deepFreezeExact(records);
    if (stage === "persistent") state.persistentProjection = projection;
    else if (stage === "terminal") state.terminalProjection = projection;
    else {
      state.finalProjection = projection;
      state.finalFrozen = true;
    }
    return projection;
  }
}

function assertAcyclicResourceGraph(records) {
  const byKey = new Map(records.map((record) => [record.resourceKey, record]));
  const visiting = new Set();
  const visited = new Set();
  const visit = (key) => {
    if (visited.has(key)) return;
    invariant(!visiting.has(key), "resource dependency graph contains a cycle");
    visiting.add(key);
    const record = byKey.get(key);
    invariant(record !== undefined, "resource graph references an unknown key");
    for (const childKey of record.dependsOn) visit(childKey);
    visiting.delete(key);
    visited.add(key);
  };
  for (const key of byKey.keys()) visit(key);
}

export function lengthPrefixedTuple(values) {
  invariant(
    Array.isArray(values) && values.every((value) => typeof value === "string"),
    "tuple values are invalid"
  );
  return values.map((value) => Buffer.byteLength(value) + ":" + value).join("|");
}

export function cartesianCleanupTuples(resourceKeys) {
  return resourceKeys.flatMap((resourceKey) =>
    CLEANUP_OPERATION_KINDS.map((operationKind) => deepFreezeExact([resourceKey, operationKind]))
  );
}

export function assertExactCleanupTupleSet(actual, resourceKeys, label) {
  const expected = cartesianCleanupTuples(resourceKeys);
  const encode = (tuple) => {
    invariant(Array.isArray(tuple) && tuple.length === 2, label + " cleanup tuple shape drift");
    return lengthPrefixedTuple(tuple);
  };
  const actualKeys = actual.map(encode);
  const expectedKeys = expected.map(encode);
  invariant(
    new Set(actualKeys).size === actualKeys.length,
    label + " cleanup tuples contain duplicates"
  );
  invariant(
    actualKeys.length === expectedKeys.length &&
      actualKeys.every((key) => expectedKeys.includes(key)),
    label + " cleanup tuple set drift"
  );
}

function createCleanupActionPlan(records, stage) {
  const priority = {
    "presentation-override": 0,
    "seo-document-entry": 1,
    "setting-user-a": 2,
    "setting-user-b": 3,
    "screen-main": 4,
    "screen-retry": 5,
    "entry-editable": 6,
    "entry-related": 7,
    "media-row-key": 8,
    "content-type": 9,
    "audit-log-task-ua": 10,
    "access-log-task-ua": 11,
    "session-task": 12,
    "user-a": 13,
    "user-b": 14,
  };
  const resourceKeys = records
    .filter(
      (record) =>
        record.class === "delete" &&
        (stage === "terminal") === TERMINAL_RESOURCE_KINDS.has(record.kind)
    )
    .sort(
      (left, right) =>
        (priority[left.kind] ?? 100) - (priority[right.kind] ?? 100) ||
        left.acquisitionOrdinal - right.acquisitionOrdinal
    )
    .map(({ resourceKey }) => resourceKey);
  const tuples = cartesianCleanupTuples(resourceKeys);
  assertExactCleanupTupleSet(tuples, resourceKeys, stage);
  return deepFreezeExact({
    stage,
    resourceKeys: deepFreezeExact(resourceKeys),
    tuples: deepFreezeExact(tuples),
  });
}

export class ResourceCleanupPlanner {
  constructor() {
    PRIVATE_CLEANUP_PLANNER.set(this, {
      persistentPlan: null,
      terminalPlan: null,
      finalPlan: null,
      blockerRoots: null,
    });
  }

  freezePersistent(records, blockerRoots = []) {
    const state = PRIVATE_CLEANUP_PLANNER.get(this);
    invariant(
      state.persistentPlan === null && state.finalPlan === null,
      "persistent cleanup plan was assigned twice"
    );
    invariant(
      Array.isArray(blockerRoots) && new Set(blockerRoots).size === blockerRoots.length,
      "failure-discovery blocker roots are invalid"
    );
    state.blockerRoots = deepFreezeExact([...blockerRoots].sort());
    state.persistentPlan = createCleanupActionPlan(records, "persistent");
    return state.persistentPlan;
  }

  freezeTerminal(records) {
    const state = PRIVATE_CLEANUP_PLANNER.get(this);
    invariant(
      state.persistentPlan !== null && state.terminalPlan === null && state.finalPlan === null,
      "terminal cleanup plan assignment drift"
    );
    state.terminalPlan = createCleanupActionPlan(records, "terminal");
    invariant(
      state.persistentPlan.resourceKeys.every(
        (key) => !state.terminalPlan.resourceKeys.includes(key)
      ),
      "persistent and terminal cleanup plans overlap"
    );
    return state.terminalPlan;
  }

  freezeFinal(finalLedger) {
    const state = PRIVATE_CLEANUP_PLANNER.get(this);
    invariant(
      state.persistentPlan !== null && state.terminalPlan !== null && state.finalPlan === null,
      "final cleanup plan assignment drift"
    );
    const dependencyGraph = deepFreezeExact(
      Object.fromEntries(finalLedger.map(({ resourceKey, dependsOn }) => [resourceKey, dependsOn]))
    );
    const blocked = compileBlockedParentClosure(dependencyGraph, state.blockerRoots);
    const kindByKey = new Map(finalLedger.map(({ resourceKey, kind }) => [resourceKey, kind]));
    const persistentUserKeys = new Set(
      state.persistentPlan.resourceKeys.filter(
        (key) => kindByKey.get(key) === "user-a" || kindByKey.get(key) === "user-b"
      )
    );
    const actionTuples = deepFreezeExact([
      ...state.persistentPlan.tuples.filter(
        ([resourceKey]) => !persistentUserKeys.has(resourceKey)
      ),
      ...state.terminalPlan.tuples,
      ...state.persistentPlan.tuples.filter(([resourceKey]) => persistentUserKeys.has(resourceKey)),
    ]);
    const resourceKeys = deepFreezeExact(
      [...state.persistentPlan.resourceKeys, ...state.terminalPlan.resourceKeys].sort()
    );
    assertExactCleanupTupleSet(actionTuples, resourceKeys, "final");
    state.finalPlan = deepFreezeExact({
      ledger: finalLedger,
      dependencyGraph,
      persistentActionPlan: state.persistentPlan,
      terminalActionPlan: state.terminalPlan,
      failureDiscoveryBlockedParentKeys: blocked,
      resourceKeys,
      actionTuples,
    });
    invariant(
      state.finalPlan.persistentActionPlan === state.persistentPlan &&
        state.finalPlan.terminalActionPlan === state.terminalPlan,
      "final cleanup plan cloned a stage plan"
    );
    return state.finalPlan;
  }
}

export function compileBlockedParentClosure(graph, roots) {
  const blocked = new Set(roots);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [parentKey, childKeys] of Object.entries(graph)) {
      if (!blocked.has(parentKey) && childKeys.some((childKey) => blocked.has(childKey))) {
        blocked.add(parentKey);
        changed = true;
      }
    }
  }
  return deepFreezeExact([...blocked].sort());
}

export function createResourceCore({
  kind,
  identifier,
  ownerSubjectIdentifier = null,
  acquisitionSourceId,
  sourceActionOrdinal,
  acquisitionChannel,
}) {
  const contract = RESOURCE_KIND_CONTRACTS[kind];
  invariant(contract !== undefined, "resource core kind is not registered");
  const frozenIdentifier = deepFreezeExact([...identifier]);
  const resourceKey =
    kind + ":" + hashBytes(Buffer.from(canonicalJson(frozenIdentifier))).slice(0, 32);
  const provenance = resourceOperationPair("p", resourceKey, contract.operationSlots.includes("P"));
  const cleanup = resourceOperationPair("c", resourceKey, contract.operationSlots.includes("C"));
  const absence = resourceOperationPair("a", resourceKey, contract.operationSlots.includes("A"));
  return deepFreezeExact({
    schemaVersion: 1,
    resourceKey,
    class: contract.class,
    kind,
    identifierType: contract.identifierType,
    identifier: frozenIdentifier,
    ownerSubjectIdentifier,
    acquisitionSourceId,
    sourceActionOrdinal,
    acquisitionChannel,
    provenanceAdapterId: contract.acquisitions[acquisitionChannel],
    cleanupAdapterId: contract.cleanupAdapterId,
    absenceAdapterId: contract.absenceAdapterId,
    cleanupPhase: contract.cleanupPhase,
    cleanupPolicy: contract.cleanupPolicy,
    deleteAuthority: contract.deleteAuthority,
    restoreAuthority: contract.restoreAuthority,
    provenanceOpId: provenance.op,
    cleanupOpId: cleanup.op,
    absenceOpId: absence.op,
    provenanceSchemaId: provenance.schema,
    cleanupSchemaId: cleanup.schema,
    absenceSchemaId: absence.schema,
  });
}

export function emptyResourceDelta() {
  return deepFreezeExact({ cores: [], dependencyEdges: [] });
}

export function destructiveResourceEdge(parentKey, childKey) {
  return deepFreezeExact({
    parentKey,
    childKey,
    relation: "destructive-parent-depends-on-child",
  });
}

export function actionOrdinal(plan, actionId) {
  const action = plan.actionManifest.find(({ id }) => id === actionId);
  invariant(action !== undefined, "resource origin action is absent: " + actionId);
  return action.ordinal;
}
