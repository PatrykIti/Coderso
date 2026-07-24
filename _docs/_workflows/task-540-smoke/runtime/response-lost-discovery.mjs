import path from "node:path";

import {
  MAX_STREAM_BYTES,
} from "../executor/config.mjs";
import {
  deepEqualJson,
} from "../executor/resource-contracts.mjs";
import {
  createResourceCore,
  destructiveResourceEdge,
  emptyResourceDelta,
  lengthPrefixedTuple,
} from "../executor/resource-ledger.mjs";
import {
  canonicalJson,
  deepFreezeExact,
  exactOwnKeys,
  hashBytes,
  invariant,
} from "../executor/foundation.mjs";

export function createResponseLostDiscovery({
  assertPlainJsonValue,
  captureCanonicalMediaStorageOwnership,
  readOwnedRegularFileNoFollow,
  registry,
}) {
  const {
    RESPONSE_LOST_CONTENT_TYPE_ACTIONS,
    RESPONSE_LOST_CREATE_DESCRIPTORS,
    RESPONSE_LOST_ENTRY_ACTIONS,
    queryResponseLostNaturalCandidates,
    responseLostStorageRoot,
  } = registry;

  function responseLostCandidateIdentity(actionId, candidate) {
    if (actionId === "set-039-override-create") {
      return lengthPrefixedTuple([
        candidate.screenId,
        candidate.entryId,
        candidate.blockId,
        candidate.propPath,
      ]);
    }
    if (actionId === "set-041-preference-a" || actionId === "set-043-preference-b") {
      return lengthPrefixedTuple([candidate.userId, candidate.key]);
    }
    invariant(
      typeof candidate.id === "string" && /^[0-9a-f-]{36}$/u.test(candidate.id),
      "response-lost candidate ID is invalid"
    );
    return candidate.id;
  }

  async function responseLostCandidateProjection(state, attempt, candidate) {
    let projection;
    if (
      attempt.actionId === "set-012-user-a-create" ||
      attempt.actionId === "set-014-user-b-create"
    ) {
      exactOwnKeys(
        candidate,
        [
          "adminRoleTupleCount",
          "adminWildcardPermissionCount",
          "id",
          "name",
          "normalizedEmailMatches",
          "passwordHashPresent",
          "status",
        ],
        "user discovery candidate",
        { plain: true }
      );
      const { id: ignoredId, ...rest } = candidate;
      invariant(typeof ignoredId === "string", "user discovery candidate ID drift");
      projection = rest;
    } else if (Object.hasOwn(RESPONSE_LOST_CONTENT_TYPE_ACTIONS, attempt.actionId)) {
      exactOwnKeys(
        candidate,
        ["id", "name", "slug", "schema", "status", "config"],
        "content type discovery candidate",
        { plain: true }
      );
      const { id: ignoredId, ...rest } = candidate;
      invariant(typeof ignoredId === "string", "content type discovery candidate ID drift");
      projection = rest;
    } else if (
      Object.hasOwn(RESPONSE_LOST_ENTRY_ACTIONS, attempt.actionId) ||
      attempt.actionId === "set-033-entry-create"
    ) {
      exactOwnKeys(
        candidate,
        [
          "id",
          "typeId",
          "authorId",
          "title",
          "slug",
          "status",
          "visibility",
          "tags",
          "data",
          "publishedAt",
          "scheduledAt",
          "accessPasswordAbsent",
        ],
        "entry discovery candidate",
        { plain: true }
      );
      projection = {
        typeId: candidate.typeId,
        authorId: candidate.authorId,
        title: candidate.title,
        slug: candidate.slug,
        status: candidate.status,
        visibility: candidate.visibility,
        accessPasswordAbsent: candidate.accessPasswordAbsent,
        tags: candidate.tags,
        data: candidate.data,
        publishedAt: candidate.publishedAt,
        scheduledAt: candidate.scheduledAt,
      };
    } else if (
      attempt.actionId === "set-035-screen-create" ||
      attempt.actionId === "set-037-retry-screen-create"
    ) {
      exactOwnKeys(
        candidate,
        [
          "id",
          "name",
          "contentTypeId",
          "status",
          "collectionRole",
          "compositionKey",
          "showInSidebar",
          "sidebarLabel",
          "schemaVersion",
          "definition",
        ],
        "Screen discovery candidate",
        { plain: true }
      );
      const { id: ignoredId, ...rest } = candidate;
      invariant(typeof ignoredId === "string", "Screen discovery candidate ID drift");
      projection = rest;
    } else if (attempt.actionId === "set-030-media-upload") {
      exactOwnKeys(
        candidate,
        [
          "id",
          "key",
          "url",
          "originalName",
          "type",
          "mimeType",
          "size",
          "width",
          "height",
          "alt",
          "title",
          "caption",
          "folderId",
          "tags",
          "focalX",
          "focalY",
          "description",
          "credit",
          "createdBy",
        ],
        "media discovery candidate",
        { plain: true }
      );
      invariant(
        typeof candidate.key === "string" &&
          candidate.key.length > 0 &&
          candidate.key.length <= 1024 &&
          !candidate.key.includes("\\") &&
          !candidate.key.startsWith("/") &&
          candidate.key.split("/").every((part) => part.length > 0 && part !== "." && part !== ".."),
        "media discovery storage key is not canonical"
      );
      const storageRoot = responseLostStorageRoot(state);
      const absolute = path.resolve(storageRoot, candidate.key);
      invariant(
        absolute.startsWith(storageRoot + path.sep),
        "media discovery storage key escaped its root"
      );
      const identity = await captureCanonicalMediaStorageOwnership(state, candidate.key);
      const bytes = await readOwnedRegularFileNoFollow(absolute, identity, MAX_STREAM_BYTES);
      projection = {
        originalName: candidate.originalName,
        type: candidate.type,
        mimeType: candidate.mimeType,
        size: candidate.size,
        width: candidate.width,
        height: candidate.height,
        alt: candidate.alt,
        title: candidate.title,
        caption: candidate.caption,
        folderId: candidate.folderId,
        tags: candidate.tags,
        focalX: candidate.focalX,
        focalY: candidate.focalY,
        description: candidate.description,
        credit: candidate.credit,
        createdBy: candidate.createdBy,
        fileSha256: hashBytes(bytes),
      };
    } else if (attempt.actionId === "set-039-override-create") {
      exactOwnKeys(
        candidate,
        ["screenId", "entryId", "blockId", "propPath", "value", "updatedBy"],
        "override discovery candidate",
        { plain: true }
      );
      projection = { ...candidate };
    } else if (
      attempt.actionId === "set-041-preference-a" ||
      attempt.actionId === "set-043-preference-b"
    ) {
      exactOwnKeys(candidate, ["userId", "key", "value"], "setting discovery candidate", {
        plain: true,
      });
      projection = { ...candidate };
    } else {
      invariant(false, "response-lost candidate projection action is not registered");
    }
    assertPlainJsonValue(projection, "response-lost candidate authored projection");
    return deepFreezeExact(projection);
  }

  function failureDiscoveryDeltaForCandidate(state, attempt, candidate) {
    const descriptor = RESPONSE_LOST_CREATE_DESCRIPTORS[attempt.actionId];
    invariant(
      descriptor !== undefined &&
        descriptor.kind === attempt.kind &&
        descriptor.semantic === attempt.semantic,
      "failure discovery descriptor drift"
    );
    let identifier;
    let ownerSubjectIdentifier = null;
    if (descriptor.kind === "presentation-override") {
      identifier = [candidate.screenId, candidate.entryId, candidate.blockId, candidate.propPath];
      ownerSubjectIdentifier = candidate.updatedBy ?? null;
    } else if (descriptor.kind === "setting-user-a" || descriptor.kind === "setting-user-b") {
      identifier = [candidate.userId, candidate.key];
      ownerSubjectIdentifier = candidate.userId;
    } else if (descriptor.kind === "media-row-key") {
      identifier = [candidate.id, candidate.key];
      ownerSubjectIdentifier = candidate.createdBy ?? null;
    } else {
      identifier = [candidate.id];
      if (descriptor.kind === "entry-editable" || descriptor.kind === "entry-related") {
        ownerSubjectIdentifier = candidate.authorId ?? null;
      }
    }
    const core = createResourceCore({
      kind: descriptor.kind,
      identifier,
      ownerSubjectIdentifier,
      acquisitionSourceId: attempt.actionId,
      sourceActionOrdinal: attempt.actionOrdinal,
      acquisitionChannel: "failure-discovery",
    });
    invariant(
      !state.resourceKeys.has(descriptor.semantic),
      "failure discovery semantic was already acquired"
    );
    const dependencyEdges = [];
    const addEdge = (parentSemantic) => {
      const parentKey = state.resourceKeys.get(parentSemantic);
      invariant(parentKey, "failure discovery dependency parent endpoint is absent");
      dependencyEdges.push(destructiveResourceEdge(parentKey, core.resourceKey));
    };
    if (descriptor.parent) addEdge(descriptor.parent);
    if (descriptor.kind === "presentation-override") {
      addEdge("screen");
      addEdge("editable-entry");
      addEdge("media");
    }
    if (descriptor.kind === "setting-user-a") addEdge("user-a");
    if (descriptor.kind === "setting-user-b") addEdge("user-b");
    const taskUserSemantic =
      ownerSubjectIdentifier === state.ids.userA
        ? "user-a"
        : ownerSubjectIdentifier === state.ids.userB
          ? "user-b"
          : null;
    if (
      taskUserSemantic !== null &&
      ["entry-editable", "entry-related", "media-row-key", "presentation-override"].includes(
        descriptor.kind
      )
    ) {
      addEdge(taskUserSemantic);
    }
    return deepFreezeExact({
      cores: deepFreezeExact([core]),
      dependencyEdges: deepFreezeExact(dependencyEdges),
    });
  }

  function registerFailureDiscoveredResourceAfterLedgerAppend(state, attempt, safeDelta) {
    if (safeDelta.cores.length === 0) return;
    invariant(
      safeDelta.cores.length === 1 && safeDelta.cores[0].kind === attempt.kind,
      "failure discovery post-append core drift"
    );
    const descriptor = RESPONSE_LOST_CREATE_DESCRIPTORS[attempt.actionId];
    const core = safeDelta.cores[0];
    invariant(
      descriptor !== undefined &&
        descriptor.semantic === attempt.semantic &&
        !state.resourceKeys.has(descriptor.semantic),
      "failure discovery post-append semantic drift"
    );
    state.resourceKeys.set(descriptor.semantic, core.resourceKey);
    state.resourceOwners.set(descriptor.semantic, core.ownerSubjectIdentifier);
    if (descriptor.kind === "user-a" || descriptor.kind === "user-b") {
      const idKey = descriptor.kind === "user-a" ? "userA" : "userB";
      invariant(
        state.ids[idKey] === undefined || state.ids[idKey] === core.identifier[0],
        "failure discovery user identity drift"
      );
      state.ids[idKey] = core.identifier[0];
    }
    if (
      descriptor.kind !== "presentation-override" &&
      descriptor.kind !== "setting-user-a" &&
      descriptor.kind !== "setting-user-b"
    ) {
      const existingFixtureId = state.fixtureIds.get(descriptor.semantic);
      invariant(
        existingFixtureId === undefined || existingFixtureId === core.identifier[0],
        "failure discovery fixture identity drift"
      );
      state.fixtureIds.set(descriptor.semantic, core.identifier[0]);
    }
    for (const userSemantic of ["user-a", "user-b"]) {
      const userKey = state.resourceKeys.get(userSemantic);
      if (
        userKey &&
        safeDelta.dependencyEdges.some(
          ({ parentKey, childKey }) => parentKey === userKey && childKey === core.resourceKey
        )
      ) {
        state.syntheticOwnerEdgeKeys.add(userSemantic + "\0" + descriptor.semantic);
      }
    }
  }

  async function discoverOneResponseLostCreate(
    state,
    attempt,
    naturalQuery = (actionId, naturalKey) =>
      queryResponseLostNaturalCandidates(state, actionId, naturalKey)
  ) {
    invariant(typeof naturalQuery === "function", "response-lost natural query authority is absent");
    const intent = state.responseLostIntents.get(attempt.actionId);
    invariant(intent !== undefined, "response-lost authored intent is absent");
    invariant(
      deepEqualJson(intent.naturalKey, attempt.naturalKey) &&
        intent.authoredRequestSha256 === attempt.authoredRequestSha256 &&
        hashBytes(Buffer.from(canonicalJson(intent.authoredProjection))) ===
          attempt.authoredRequestSha256,
      "response-lost authored intent digest drift"
    );
    const current = await naturalQuery(attempt.actionId, attempt.naturalKey);
    const baselineByIdentity = new Map(
      attempt.baseline.candidates.map((candidate) => [
        responseLostCandidateIdentity(attempt.actionId, candidate),
        candidate,
      ])
    );
    invariant(
      baselineByIdentity.size === attempt.baseline.candidates.length,
      "response-lost baseline contains duplicate identities"
    );
    const currentByIdentity = new Map(
      current.candidates.map((candidate) => [
        responseLostCandidateIdentity(attempt.actionId, candidate),
        candidate,
      ])
    );
    invariant(
      currentByIdentity.size === current.candidates.length,
      "response-lost query contains duplicate identities"
    );
    for (const [identity, baselineCandidate] of baselineByIdentity) {
      const currentCandidate = currentByIdentity.get(identity);
      invariant(
        currentCandidate !== undefined && deepEqualJson(currentCandidate, baselineCandidate),
        "response-lost natural-key baseline changed"
      );
    }
    const candidates = current.candidates.filter(
      (candidate) =>
        !baselineByIdentity.has(responseLostCandidateIdentity(attempt.actionId, candidate))
    );
    if (candidates.length === 0) {
      return deepFreezeExact({
        pendingAttemptKey: attempt.pendingAttemptKey,
        safeDelta: emptyResourceDelta(),
        failure: null,
        intendedParentBlockerKeys: deepFreezeExact([]),
      });
    }
    invariant(candidates.length === 1, "response-lost natural-key query is ambiguous");
    const candidate = candidates[0];
    const projection = await responseLostCandidateProjection(state, attempt, candidate);
    invariant(
      deepEqualJson(projection, intent.authoredProjection) &&
        hashBytes(Buffer.from(canonicalJson(projection))) === attempt.authoredRequestSha256,
      "response-lost candidate does not match the authored request"
    );
    return deepFreezeExact({
      pendingAttemptKey: attempt.pendingAttemptKey,
      safeDelta: failureDiscoveryDeltaForCandidate(state, attempt, candidate),
      failure: null,
      intendedParentBlockerKeys: deepFreezeExact([]),
    });
  }

  return Object.freeze({
    discoverOneResponseLostCreate,
    registerFailureDiscoveredResourceAfterLedgerAppend,
  });
}
