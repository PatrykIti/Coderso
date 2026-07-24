import { SESSION_NAME } from "./config.mjs";
import { deepFreezeExact, invariant } from "./foundation.mjs";
import {
  actionOrdinal,
  createResourceCore,
  destructiveResourceEdge,
} from "./resource-ledger.mjs";

export const PROVEN_RESOURCE_ACTIONS = deepFreezeExact({
  "set-013-user-a-proof": {
    origin: "set-012-user-a-create",
    kind: "user-a",
    capture: "user-a.id",
    semantic: "user-a",
    channel: "service",
  },
  "set-015-user-b-proof": {
    origin: "set-014-user-b-create",
    kind: "user-b",
    capture: "user-b.id",
    semantic: "user-b",
    channel: "service",
  },
  "set-017-editable-type-proof": {
    origin: "set-016-editable-type-create",
    kind: "content-type",
    capture: "content-type-editable.id",
    semantic: "content-type-editable",
    channel: "admin-api",
  },
  "set-019-related-a-type-proof": {
    origin: "set-018-related-a-type-create",
    kind: "content-type",
    capture: "content-type-related-a.id",
    semantic: "content-type-related-a",
    channel: "admin-api",
  },
  "set-021-related-b-type-proof": {
    origin: "set-020-related-b-type-create",
    kind: "content-type",
    capture: "content-type-related-b.id",
    semantic: "content-type-related-b",
    channel: "admin-api",
  },
  "set-021b-related-failure-type-proof": {
    origin: "set-021a-related-failure-type-create",
    kind: "content-type",
    capture: "content-type-related-failure.id",
    semantic: "content-type-related-failure",
    channel: "admin-api",
  },
  "set-023-related-a1-proof": {
    origin: "set-022-related-a1-create",
    kind: "entry-related",
    capture: "related-entry-a1.id",
    semantic: "related-entry-a1",
    channel: "admin-api",
    parent: "content-type-related-a",
  },
  "set-025-related-a2-proof": {
    origin: "set-024-related-a2-create",
    kind: "entry-related",
    capture: "related-entry-a2.id",
    semantic: "related-entry-a2",
    channel: "admin-api",
    parent: "content-type-related-a",
  },
  "set-027-related-b1-proof": {
    origin: "set-026-related-b1-create",
    kind: "entry-related",
    capture: "related-entry-b1.id",
    semantic: "related-entry-b1",
    channel: "admin-api",
    parent: "content-type-related-b",
  },
  "set-029-related-b2-proof": {
    origin: "set-028-related-b2-create",
    kind: "entry-related",
    capture: "related-entry-b2.id",
    semantic: "related-entry-b2",
    channel: "admin-api",
    parent: "content-type-related-b",
  },
  "set-029b-related-failure1-proof": {
    origin: "set-029a-related-failure1-create",
    kind: "entry-related",
    capture: "related-entry-failure1.id",
    semantic: "related-entry-failure1",
    channel: "admin-api",
    parent: "content-type-related-failure",
  },
  "set-031-media-proof": {
    origin: "set-030-media-upload",
    kind: "media-row-key",
    capture: "media.id",
    secondCapture: "media.storage-key",
    semantic: "media",
    channel: "admin-api",
  },
  "set-034-entry-proof": {
    origin: "set-033-entry-create",
    kind: "entry-editable",
    capture: "entry.id",
    semantic: "editable-entry",
    channel: "admin-api",
    parent: "content-type-editable",
  },
  "set-036-screen-proof": {
    origin: "set-035-screen-create",
    kind: "screen-main",
    capture: "screen.id",
    semantic: "screen",
    channel: "admin-api",
    parent: "content-type-editable",
  },
  "set-038-retry-screen-proof": {
    origin: "set-037-retry-screen-create",
    kind: "screen-retry",
    capture: "retry-screen.id",
    semantic: "retry-screen",
    channel: "admin-api",
    parent: "content-type-editable",
  },
  "set-040-override-proof": {
    origin: "set-039-override-create",
    kind: "presentation-override",
    semantic: "presentation-override",
    channel: "admin-api",
  },
  "set-042-preference-a-proof": {
    origin: "set-041-preference-a",
    kind: "setting-user-a",
    semantic: "setting-user-a",
    channel: "service",
    owner: "user-a",
  },
  "set-044-preference-b-proof": {
    origin: "set-043-preference-b",
    kind: "setting-user-b",
    semantic: "setting-user-b",
    channel: "service",
    owner: "user-b",
  },
});

function captureFromCurrentResult(captures, captureBindings, name) {
  if (Object.hasOwn(captureBindings, name)) return captureBindings[name];
  return captures.get(name);
}

export function deriveActionResourceDelta(state, action, result, captures) {
  const cores = [];
  const dependencyEdges = [];
  const pendingResourceKeys = new Map();
  const addCore = (semantic, core) => {
    invariant(
      !state.resourceKeys.has(semantic) && !pendingResourceKeys.has(semantic),
      "resource semantic key was acquired twice: " + semantic
    );
    pendingResourceKeys.set(semantic, core.resourceKey);
    cores.push(core);
    return core.resourceKey;
  };
  const edge = (parentSemantic, childSemantic) => {
    const parentKey =
      pendingResourceKeys.get(parentSemantic) ?? state.resourceKeys.get(parentSemantic);
    const childKey =
      pendingResourceKeys.get(childSemantic) ?? state.resourceKeys.get(childSemantic);
    invariant(parentKey && childKey, "resource dependency semantic endpoint is absent");
    dependencyEdges.push(destructiveResourceEdge(parentKey, childKey));
  };
  if (action.id === "set-001-storage-preflight") {
    invariant(state.bootstrapBaseline?.id, "bootstrap baseline is absent after preflight");
    addCore(
      "bootstrap-login",
      createResourceCore({
        kind: "bootstrap-user-login-state",
        identifier: [state.bootstrapBaseline.id],
        acquisitionSourceId: "preflight-baseline",
        sourceActionOrdinal: null,
        acquisitionChannel: "preflight",
      })
    );
    addCore(
      "site-content-routes",
      createResourceCore({
        kind: "site-content-routes-baseline",
        identifier: ["site.contentRoutes"],
        acquisitionSourceId: "preflight-baseline",
        sourceActionOrdinal: null,
        acquisitionChannel: "preflight",
      })
    );
    addCore(
      "storage-baseline",
      createResourceCore({
        kind: "storage-baseline",
        identifier: ["storage-root-baseline"],
        acquisitionSourceId: "preflight-baseline",
        sourceActionOrdinal: null,
        acquisitionChannel: "preflight",
      })
    );
    addCore(
      "missing-media-baseline",
      createResourceCore({
        kind: "missing-media-baseline",
        identifier: [state.plan.fixtureBlueprint.media.missingBoundMediaId],
        acquisitionSourceId: "preflight-baseline",
        sourceActionOrdinal: null,
        acquisitionChannel: "preflight",
      })
    );
  } else if (action.id === "set-002-helper-launch") {
    invariant(state.host?.identity?.pgid, "host process group is absent after launch");
    addCore(
      "host-process-group",
      createResourceCore({
        kind: "host-process-group",
        identifier: [String(state.host.identity.pgid)],
        acquisitionSourceId: action.id,
        sourceActionOrdinal: action.ordinal,
        acquisitionChannel: "process",
      })
    );
  } else if (action.id === "set-005-open") {
    addCore(
      "browser-private-root",
      createResourceCore({
        kind: "browser-private-root",
        identifier: [state.browserWorkspace.root],
        acquisitionSourceId: "preflight-baseline",
        sourceActionOrdinal: null,
        acquisitionChannel: "filesystem",
      })
    );
    addCore(
      "browser-session",
      createResourceCore({
        kind: "browser-session",
        identifier: [SESSION_NAME],
        acquisitionSourceId: action.id,
        sourceActionOrdinal: action.ordinal,
        acquisitionChannel: "browser",
      })
    );
  } else if (action.id === "set-006-logger") {
    addCore(
      "route-registry",
      createResourceCore({
        kind: "route-registry",
        identifier: ["wf540-context-route-registry"],
        acquisitionSourceId: action.id,
        sourceActionOrdinal: action.ordinal,
        acquisitionChannel: "browser",
      })
    );
  } else if (action.id === "set-011b-bootstrap-api-login") {
    addCore(
      "api-context-bootstrap",
      createResourceCore({
        kind: "api-context-bootstrap",
        identifier: ["bootstrap"],
        acquisitionSourceId: action.id,
        sourceActionOrdinal: action.ordinal,
        acquisitionChannel: "service",
      })
    );
  } else if (action.id === "ru-043b-a-api-login") {
    addCore(
      "api-context-user-a",
      createResourceCore({
        kind: "api-context-user-a",
        identifier: ["user-a"],
        acquisitionSourceId: action.id,
        sourceActionOrdinal: action.ordinal,
        acquisitionChannel: "service",
      })
    );
  } else if (action.executable.type === "browser-screenshot") {
    const relative = state.plan.registries.screenshotPaths[action.executable.screenshotId];
    addCore(
      "screenshot:" + relative,
      createResourceCore({
        kind: "screenshot",
        identifier: [relative],
        acquisitionSourceId: action.id,
        sourceActionOrdinal: action.ordinal,
        acquisitionChannel: "filesystem",
      })
    );
  } else {
    const descriptor = PROVEN_RESOURCE_ACTIONS[action.id];
    if (descriptor !== undefined) {
      let identifier;
      let ownerSubjectIdentifier = null;
      if (descriptor.kind === "presentation-override") {
        identifier = [
          captures.get("screen.id"),
          captures.get("entry.id"),
          state.plan.fixtureBlueprint.screen.blockIds.raceImage,
          "mediaAssetId",
        ];
        ownerSubjectIdentifier = state.resourceOwners?.get(descriptor.semantic) ?? null;
      } else if (descriptor.kind === "setting-user-a" || descriptor.kind === "setting-user-b") {
        ownerSubjectIdentifier = captures.get(descriptor.owner + ".id");
        identifier = [ownerSubjectIdentifier, "customScreens.entry.preferences"];
      } else {
        identifier = [
          captureFromCurrentResult(captures, result.captureBindings, descriptor.capture),
        ];
        if (descriptor.secondCapture)
          identifier.push(
            captureFromCurrentResult(captures, result.captureBindings, descriptor.secondCapture)
          );
        ownerSubjectIdentifier = state.resourceOwners?.get(descriptor.semantic) ?? null;
      }
      const resourceKey = addCore(
        descriptor.semantic,
        createResourceCore({
          kind: descriptor.kind,
          identifier,
          ownerSubjectIdentifier,
          acquisitionSourceId: descriptor.origin,
          sourceActionOrdinal: actionOrdinal(state.plan, descriptor.origin),
          acquisitionChannel: descriptor.channel,
        })
      );
      invariant(typeof resourceKey === "string", "resource key derivation failed");
      if (descriptor.parent) edge(descriptor.parent, descriptor.semantic);
      if (descriptor.kind === "presentation-override") {
        edge("screen", descriptor.semantic);
        edge("editable-entry", descriptor.semantic);
        edge("media", descriptor.semantic);
      }
      if (descriptor.kind === "setting-user-a") edge("user-a", descriptor.semantic);
      if (descriptor.kind === "setting-user-b") edge("user-b", descriptor.semantic);
      const ownerUserSemantic =
        ownerSubjectIdentifier === state.ids?.userA
          ? "user-a"
          : ownerSubjectIdentifier === state.ids?.userB
            ? "user-b"
            : null;
      if (
        ownerUserSemantic !== null &&
        ["entry-editable", "entry-related", "media-row-key", "presentation-override"].includes(
          descriptor.kind
        )
      ) {
        edge(ownerUserSemantic, descriptor.semantic);
      }
    }
  }
  return deepFreezeExact({
    cores: deepFreezeExact(cores),
    dependencyEdges: deepFreezeExact(dependencyEdges),
  });
}

export function registerSuccessfulActionResourcesAfterLedgerAppend(state, action, delta) {
  const assignments = [];
  const assignByKind = (semantic, kind) => {
    const matches = delta.cores.filter((core) => core.kind === kind);
    invariant(matches.length === 1, action.id + " post-append core assignment drift");
    assignments.push([semantic, matches[0]]);
  };
  if (action.id === "set-001-storage-preflight") {
    assignByKind("bootstrap-login", "bootstrap-user-login-state");
    assignByKind("site-content-routes", "site-content-routes-baseline");
    assignByKind("storage-baseline", "storage-baseline");
    assignByKind("missing-media-baseline", "missing-media-baseline");
  } else if (action.id === "set-002-helper-launch") {
    assignByKind("host-process-group", "host-process-group");
  } else if (action.id === "set-005-open") {
    assignByKind("browser-private-root", "browser-private-root");
    assignByKind("browser-session", "browser-session");
  } else if (action.id === "set-006-logger") {
    assignByKind("route-registry", "route-registry");
  } else if (action.id === "set-011b-bootstrap-api-login") {
    assignByKind("api-context-bootstrap", "api-context-bootstrap");
  } else if (action.id === "ru-043b-a-api-login") {
    assignByKind("api-context-user-a", "api-context-user-a");
  } else if (action.executable.type === "browser-screenshot") {
    const relative = state.plan.registries.screenshotPaths[action.executable.screenshotId];
    assignByKind("screenshot:" + relative, "screenshot");
  } else {
    const descriptor = PROVEN_RESOURCE_ACTIONS[action.id];
    if (descriptor !== undefined) assignByKind(descriptor.semantic, descriptor.kind);
  }
  invariant(
    assignments.length === delta.cores.length,
    action.id + " post-append acquisition set drift"
  );
  for (const [semantic, core] of assignments) {
    invariant(
      !state.resourceKeys.has(semantic),
      action.id + " post-append semantic was already assigned"
    );
    state.resourceKeys.set(semantic, core.resourceKey);
  }
  const descriptor = PROVEN_RESOURCE_ACTIONS[action.id];
  if (descriptor !== undefined) {
    for (const userSemantic of ["user-a", "user-b"]) {
      const userKey = state.resourceKeys.get(userSemantic);
      const childKey = state.resourceKeys.get(descriptor.semantic);
      if (
        userKey &&
        childKey &&
        delta.dependencyEdges.some(
          ({ parentKey, childKey: edgeChildKey }) =>
            parentKey === userKey && edgeChildKey === childKey
        )
      ) {
        state.syntheticOwnerEdgeKeys.add(userSemantic + "\0" + descriptor.semantic);
      }
    }
  }
}
