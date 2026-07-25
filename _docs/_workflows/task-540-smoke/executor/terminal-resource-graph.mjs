// Terminal resource dependency graph authority for the TASK-540 smoke executor.
//
// Owns the task-owned terminal traffic delta projection, its post-append semantic
// registration, the exact final structural/owner dependency graph assertion and the current
// synthetic owner dependency edge refresh that reconciles fresh owner correlations before the
// final cleanup plan is frozen.
import {
  TASK_FIXTURE_ENTRY_SEMANTICS,
  seoDocumentResourceSemantic,
} from "./config.mjs";
import {
  canonicalJson,
  deepFreezeExact,
  exactOwnKeys,
  hashBytes,
  invariant,
} from "./foundation.mjs";
import {
  TERMINAL_RESOURCE_KINDS,
  deepEqualJson,
} from "./resource-contracts.mjs";
import {
  createResourceCore,
  destructiveResourceEdge,
} from "./resource-ledger.mjs";

export function terminalResourceDelta(state, delta) {
  const cores = [];
  const dependencyEdges = [];
  const keyByTerminal = new Map();
  const append = (kind, row, ownerSubjectIdentifier) => {
    invariant(
      row && typeof row.id === "string" && /^[0-9a-f-]{36}$/u.test(row.id),
      "terminal row identity is invalid"
    );
    const core = createResourceCore({
      kind,
      identifier: [row.id],
      ownerSubjectIdentifier,
      acquisitionSourceId: "terminal-task-ua-discovery",
      sourceActionOrdinal: null,
      acquisitionChannel: "terminal-db-delta",
    });
    cores.push(core);
    keyByTerminal.set(kind + ":" + row.id, core.resourceKey);
    return core;
  };
  for (const row of delta.audit) append("audit-log-task-ua", row, row.actorId ?? null);
  for (const row of delta.access)
    append("access-log-task-ua", row, row.sessionId ?? row.userId ?? null);
  for (const row of delta.session) append("session-task", row, row.userId);
  const taskUsers = new Map([
    [state.ids.userA, state.resourceKeys.get("user-a")],
    [state.ids.userB, state.resourceKeys.get("user-b")],
  ]);
  for (const row of delta.audit) {
    const userKey = taskUsers.get(row.actorId);
    if (userKey)
      dependencyEdges.push(
        destructiveResourceEdge(userKey, keyByTerminal.get("audit-log-task-ua:" + row.id))
      );
  }
  for (const row of delta.session) {
    const userKey = taskUsers.get(row.userId);
    if (userKey)
      dependencyEdges.push(
        destructiveResourceEdge(userKey, keyByTerminal.get("session-task:" + row.id))
      );
  }
  for (const row of delta.access) {
    const accessKey = keyByTerminal.get("access-log-task-ua:" + row.id);
    if (row.sessionId !== null) {
      const sessionKey = keyByTerminal.get("session-task:" + row.sessionId);
      invariant(sessionKey !== undefined, "terminal access row references a non-task session");
      dependencyEdges.push(destructiveResourceEdge(sessionKey, accessKey));
    } else {
      const userKey = taskUsers.get(row.userId);
      if (userKey) dependencyEdges.push(destructiveResourceEdge(userKey, accessKey));
    }
  }
  return deepFreezeExact({
    cores: deepFreezeExact(cores),
    dependencyEdges: deepFreezeExact(dependencyEdges),
  });
}

export function registerTerminalResourcesAfterLedgerAppend(state, delta) {
  for (const core of delta.cores) {
    invariant(TERMINAL_RESOURCE_KINDS.has(core.kind), "post-append terminal core kind drift");
    const semantic = core.kind + ":" + core.identifier[0];
    invariant(
      !state.resourceKeys.has(semantic),
      "post-append terminal semantic was already assigned"
    );
    state.resourceKeys.set(semantic, core.resourceKey);
  }
}

export function assertExactFinalResourceDependencyGraph(state, finalLedger, dependencyGraph) {
  invariant(
    Array.isArray(finalLedger) && finalLedger.length > 0,
    "final dependency ledger is absent"
  );
  const records = new Map(finalLedger.map((record) => [record.resourceKey, record]));
  invariant(records.size === finalLedger.length, "final dependency ledger repeats a key");
  exactOwnKeys(
    dependencyGraph,
    finalLedger.map(({ resourceKey }) => resourceKey),
    "final dependency graph",
    { plain: true }
  );
  const expected = new Map(finalLedger.map(({ resourceKey }) => [resourceKey, new Set()]));
  const semanticByResourceKey = new Map(
    [...state.resourceKeys.entries()].map(([semantic, resourceKey]) => [resourceKey, semantic])
  );
  const freshOwnerBySemantic = new Map(
    (state.currentResourceOwnerProof ?? []).map(({ semantic, owner }) => [semantic, owner])
  );
  const addKeys = (parentKey, childKey, label) => {
    invariant(
      typeof parentKey === "string" &&
        typeof childKey === "string" &&
        expected.has(parentKey) &&
        expected.has(childKey) &&
        parentKey !== childKey,
      label + " dependency endpoint drift"
    );
    expected.get(parentKey).add(childKey);
  };
  const addSemanticsWhenPresent = (parentSemantic, childSemantic, label) => {
    const parentKey = state.resourceKeys.get(parentSemantic);
    const childKey = state.resourceKeys.get(childSemantic);
    if (parentKey === undefined || childKey === undefined) return;
    addKeys(parentKey, childKey, label);
  };
  for (const [parentSemantic, childSemantic] of [
    ["content-type-editable", "screen"],
    ["content-type-editable", "retry-screen"],
    ["content-type-editable", "editable-entry"],
    ["content-type-related-a", "related-entry-a1"],
    ["content-type-related-a", "related-entry-a2"],
    ["content-type-related-b", "related-entry-b1"],
    ["content-type-related-b", "related-entry-b2"],
    ["content-type-related-failure", "related-entry-failure1"],
    ...TASK_FIXTURE_ENTRY_SEMANTICS.map((entrySemantic) => [
      entrySemantic,
      seoDocumentResourceSemantic(entrySemantic),
    ]),
    ["screen", "presentation-override"],
    ["editable-entry", "presentation-override"],
    ["media", "presentation-override"],
    ["user-a", "setting-user-a"],
    ["user-b", "setting-user-b"],
  ]) {
    addSemanticsWhenPresent(parentSemantic, childSemantic, "structural");
  }
  const taskUserKeyById = new Map();
  for (const [idKey, semantic] of [
    ["userA", "user-a"],
    ["userB", "user-b"],
  ]) {
    const id = state.ids[idKey];
    const key = state.resourceKeys.get(semantic);
    if (typeof id === "string" && typeof key === "string") taskUserKeyById.set(id, key);
  }
  const taskSessionKeyById = new Map(
    finalLedger
      .filter(({ kind }) => kind === "session-task")
      .map((record) => [record.identifier[0], record.resourceKey])
  );
  const nullableOwnerKinds = new Set([
    "entry-editable",
    "entry-related",
    "media-row-key",
    "presentation-override",
    "session-task",
    "audit-log-task-ua",
    "access-log-task-ua",
  ]);
  for (const record of finalLedger) {
    if (record.kind === "setting-user-a" || record.kind === "setting-user-b") {
      invariant(
        record.ownerSubjectIdentifier === record.identifier[0],
        "setting owner correlation drift"
      );
      continue;
    }
    invariant(
      nullableOwnerKinds.has(record.kind) || record.ownerSubjectIdentifier === null,
      "non-owner resource carries an owner correlation"
    );
    const semantic = semanticByResourceKey.get(record.resourceKey);
    const authoritativeOwner = freshOwnerBySemantic.has(semantic)
      ? freshOwnerBySemantic.get(semantic)
      : record.ownerSubjectIdentifier;
    let parentKey = null;
    if (record.kind === "access-log-task-ua") {
      parentKey =
        taskSessionKeyById.get(authoritativeOwner) ??
        taskUserKeyById.get(authoritativeOwner) ??
        null;
    } else if (
      record.kind === "entry-editable" ||
      record.kind === "entry-related" ||
      record.kind === "media-row-key" ||
      record.kind === "presentation-override" ||
      record.kind === "session-task" ||
      record.kind === "audit-log-task-ua"
    ) {
      parentKey = taskUserKeyById.get(authoritativeOwner) ?? null;
    }
    if (parentKey !== null) addKeys(parentKey, record.resourceKey, "owner-correlated");
  }
  for (const record of finalLedger) {
    const expectedChildren = [...expected.get(record.resourceKey)].sort();
    invariant(
      deepEqualJson(dependencyGraph[record.resourceKey], expectedChildren) &&
        deepEqualJson(record.dependsOn, expectedChildren),
      "final dependency graph is not the exact structural/owner graph"
    );
  }
  return true;
}

export function createSyntheticOwnerDependencyRefresh(dependencies) {
  // The intentional presentation-override absence authority and the Bun bridge operation runner
  // belong to authorities the facade composes, so they arrive as injected dependencies and the
  // declaration below closes over those exact values instead of a rebindable module slot.
  exactOwnKeys(
    dependencies,
    ["completeIntentionalPresentationOverrideAbsenceAuthority", "runBunBridgeOperation"],
    "synthetic owner dependency refresh dependencies",
    { plain: true }
  );
  invariant(
    ["completeIntentionalPresentationOverrideAbsenceAuthority", "runBunBridgeOperation"].every(
      (key) => typeof dependencies[key] === "function"
    ),
    "synthetic owner dependency refresh dependencies are not callable"
  );
  const { completeIntentionalPresentationOverrideAbsenceAuthority, runBunBridgeOperation } =
    dependencies;

  async function refreshCurrentSyntheticOwnerDependencyEdges(state, resourceLedger) {
    const entryKinds = TASK_FIXTURE_ENTRY_SEMANTICS;
    const entryIds = entryKinds.map((kind) => state.fixtureIds.get(kind));
    invariant(
      entryIds.every((id) => typeof id === "string"),
      "owner refresh entry inventory is incomplete"
    );
    const input = {
      entryIds,
      mediaId: state.fixtureIds.get("media"),
      override: {
        screenId: state.fixtureIds.get("screen"),
        entryId: state.fixtureIds.get("editable-entry"),
        blockId: state.plan.fixtureBlueprint.screen.blockIds.raceImage,
        propPath: "mediaAssetId",
      },
      overrideExpectedPresent:
        completeIntentionalPresentationOverrideAbsenceAuthority(state) === null,
    };
    const proof = await runBunBridgeOperation(state, "resource/current-owner-exact", input);
    exactOwnKeys(
      proof,
      ["entries", "media", "override", "overrideAbsent"],
      "current resource owner proof",
      { plain: true }
    );
    invariant(
      Array.isArray(proof.entries) && proof.entries.length === 6,
      "current entry owner proof drift"
    );
    const absenceAuthority = completeIntentionalPresentationOverrideAbsenceAuthority(state);
    invariant(
      proof.overrideAbsent === (absenceAuthority !== null) &&
        (absenceAuthority === null ? proof.override !== null : proof.override === null),
      "current override owner/absence expectation drift"
    );
    if (absenceAuthority !== null) {
      invariant(
        state.intentionalPresentationOverrideCleanupProof === null,
        "intentional override cleanup proof was assigned twice"
      );
      state.intentionalPresentationOverrideCleanupProof = deepFreezeExact({
        absenceOutputSha256: hashBytes(Buffer.from(canonicalJson(proof))),
        identifier: absenceAuthority.acquisition.identifier,
        operationDescriptor: "resource/current-owner-exact",
        proofActionReceiptSha256: absenceAuthority.proof.receiptEvidenceSha256,
        resetActionReceiptSha256: absenceAuthority.reset.receiptEvidenceSha256,
      });
    }
    const semanticById = new Map(entryKinds.map((kind) => [state.fixtureIds.get(kind), kind]));
    const owned = [
      ...proof.entries.map((row) => ({
        semantic: semanticById.get(row.id),
        owner: row.ownerSubjectIdentifier,
      })),
      { semantic: "media", owner: proof.media.ownerSubjectIdentifier },
      {
        semantic: "presentation-override",
        owner:
          absenceAuthority === null
            ? proof.override.ownerSubjectIdentifier
            : absenceAuthority.acquisition.ownerSubjectIdentifier,
      },
    ];
    const dependencyEdges = [];
    const appendedCorrelations = [];
    for (const row of owned) {
      invariant(
        typeof row.semantic === "string" && (row.owner === null || typeof row.owner === "string"),
        "current owner correlation drift"
      );
      const userSemantic =
        row.owner === state.ids.userA ? "user-a" : row.owner === state.ids.userB ? "user-b" : null;
      if (userSemantic === null) continue;
      const correlation = userSemantic + "\0" + row.semantic;
      if (state.syntheticOwnerEdgeKeys.has(correlation)) continue;
      const parentKey = state.resourceKeys.get(userSemantic);
      const childKey = state.resourceKeys.get(row.semantic);
      invariant(parentKey && childKey, "current owner dependency endpoint is absent");
      dependencyEdges.push(destructiveResourceEdge(parentKey, childKey));
      appendedCorrelations.push(correlation);
    }
    resourceLedger.appendValidatedDelta(
      deepFreezeExact({
        cores: deepFreezeExact([]),
        dependencyEdges: deepFreezeExact(dependencyEdges),
      })
    );
    for (const correlation of appendedCorrelations) state.syntheticOwnerEdgeKeys.add(correlation);
    invariant(
      state.currentResourceOwnerProof === null,
      "current resource owner proof was assigned twice"
    );
    state.currentResourceOwnerProof = deepFreezeExact(owned);
    return deepFreezeExact(owned);
  }

  return Object.freeze({
    refreshCurrentSyntheticOwnerDependencyEdges,
  });
}
