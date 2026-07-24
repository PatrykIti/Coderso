import {
  canonicalJson,
  deepFreezeExact,
  hashBytes,
  invariant,
} from "../executor/foundation.mjs";

export function createResponseLostBaselines({
  assertPlainJsonValue,
  contentSchemaFromFields,
  materializeScreenBody,
  registry,
  resolveFixtureValue,
  runBunBridgeOperation,
}) {
  const {
    RESPONSE_LOST_CONTENT_TYPE_ACTIONS,
    RESPONSE_LOST_CREATE_ACTION_IDS,
    RESPONSE_LOST_CREATE_DESCRIPTORS,
    RESPONSE_LOST_ENTRY_ACTIONS,
    RESPONSE_LOST_QUERY_OPERATION_BINDINGS,
    intendedParentBlockerKeysForCreate,
    validateBoundedNaturalCandidateResult,
  } = registry;

  async function captureAllResponseLostNaturalBaselinesBeforeFirstWrite(
    state,
    bridgeQuery = (operationId, input) => runBunBridgeOperation(state, operationId, input)
  ) {
    invariant(
      state.responseLostBaselines.size === 0 && state.responseLostIntents.size === 0,
      "response-lost preflight baseline was assigned twice"
    );
    invariant(typeof bridgeQuery === "function", "response-lost preflight query authority is absent");
    const plan = state.plan;
    const entryPreflight = {
      "set-022-related-a1-create": [
        plan.fixtureBlueprint.contentTypes.relatedA.slug,
        plan.fixtureBlueprint.relatedEntries.a1.slug,
      ],
      "set-024-related-a2-create": [
        plan.fixtureBlueprint.contentTypes.relatedA.slug,
        plan.fixtureBlueprint.relatedEntries.a2.slug,
      ],
      "set-026-related-b1-create": [
        plan.fixtureBlueprint.contentTypes.relatedB.slug,
        plan.fixtureBlueprint.relatedEntries.b1.slug,
      ],
      "set-028-related-b2-create": [
        plan.fixtureBlueprint.contentTypes.relatedB.slug,
        plan.fixtureBlueprint.relatedEntries.b2.slug,
      ],
      "set-029a-related-failure1-create": [
        plan.fixtureBlueprint.contentTypes.relatedFailure.slug,
        plan.fixtureBlueprint.relatedEntries.failure1.slug,
      ],
      "set-033-entry-create": [
        plan.fixtureBlueprint.contentTypes.editable.slug,
        plan.fixtureBlueprint.entry.slug,
      ],
    };
    for (const actionId of RESPONSE_LOST_CREATE_ACTION_IDS) {
      const binding = RESPONSE_LOST_QUERY_OPERATION_BINDINGS[actionId];
      invariant(binding !== undefined, "response-lost preflight operation binding is absent");
      let input;
      if (actionId === "set-012-user-a-create" || actionId === "set-014-user-b-create") {
        const user = plan.fixtureBlueprint.users[actionId === "set-012-user-a-create" ? "a" : "b"];
        input = { email: user.email };
      } else if (Object.hasOwn(RESPONSE_LOST_CONTENT_TYPE_ACTIONS, actionId)) {
        input = {
          slug: plan.fixtureBlueprint.contentTypes[RESPONSE_LOST_CONTENT_TYPE_ACTIONS[actionId]].slug,
        };
      } else if (Object.hasOwn(entryPreflight, actionId)) {
        const [typeSlug, entrySlug] = entryPreflight[actionId];
        input = { entrySlug, typeSlug };
      } else if (actionId === "set-030-media-upload") {
        const media = plan.fixtureBlueprint.media;
        input = {
          originalName: media.originalName,
          mimeType: media.mimeType,
          size: media.uploadFixture.decodedSizeBytes,
        };
      } else if (actionId === "set-035-screen-create" || actionId === "set-037-retry-screen-create") {
        input = {
          contentTypeSlug: plan.fixtureBlueprint.contentTypes.editable.slug,
          name:
            actionId === "set-035-screen-create"
              ? plan.fixtureBlueprint.screen.name
              : plan.fixtureBlueprint.retryScreen.name,
        };
      } else if (actionId === "set-039-override-create") {
        input = {
          blockId: plan.fixtureBlueprint.screen.blockIds.raceImage,
          contentTypeSlug: plan.fixtureBlueprint.contentTypes.editable.slug,
          entrySlug: plan.fixtureBlueprint.entry.slug,
          propPath: "mediaAssetId",
          screenName: plan.fixtureBlueprint.screen.name,
        };
      } else if (actionId === "set-041-preference-a" || actionId === "set-043-preference-b") {
        input = {
          email: plan.fixtureBlueprint.users[actionId === "set-041-preference-a" ? "a" : "b"].email,
        };
      } else {
        invariant(false, "response-lost preflight action is not registered");
      }
      const output = await bridgeQuery(binding.baselineOperationId, input);
      const baseline = validateBoundedNaturalCandidateResult(output, "response-lost preflight query");
      if (
        actionId === "set-039-override-create" ||
        actionId === "set-041-preference-a" ||
        actionId === "set-043-preference-b"
      ) {
        invariant(
          baseline.candidates.length === 0,
          "delete-not-restore natural key exists at preflight"
        );
      }
      state.responseLostBaselines.set(actionId, baseline);
    }
    invariant(
      state.responseLostBaselines.size === RESPONSE_LOST_CREATE_ACTION_IDS.length,
      "response-lost preflight baseline cardinality drift"
    );
  }

  async function buildResponseLostAuthoredIntent(state, action, captures) {
    const plan = state.plan;
    let naturalKey;
    let authoredProjection;
    let preparedBody = null;
    if (action.id === "set-012-user-a-create" || action.id === "set-014-user-b-create") {
      const key = action.id === "set-012-user-a-create" ? "a" : "b";
      const user = plan.fixtureBlueprint.users[key];
      naturalKey = { email: user.email };
      authoredProjection = {
        normalizedEmailMatches: true,
        name: user.displayName,
        status: "active",
        passwordHashPresent: true,
        adminWildcardPermissionCount: 1,
        adminRoleTupleCount: 1,
      };
    } else if (Object.hasOwn(RESPONSE_LOST_CONTENT_TYPE_ACTIONS, action.id)) {
      const contentType =
        plan.fixtureBlueprint.contentTypes[RESPONSE_LOST_CONTENT_TYPE_ACTIONS[action.id]];
      preparedBody = {
        name: contentType.name,
        slug: contentType.slug,
        schema: contentSchemaFromFields(contentType.fields),
      };
      naturalKey = { slug: preparedBody.slug };
      authoredProjection = { ...preparedBody, status: "draft", config: {} };
    } else if (Object.hasOwn(RESPONSE_LOST_ENTRY_ACTIONS, action.id)) {
      const [entryKey, typeKey] = RESPONSE_LOST_ENTRY_ACTIONS[action.id];
      const entry = plan.fixtureBlueprint.relatedEntries[entryKey];
      const typeId = captures.get(
        "content-type-" + typeKey.replace(/[A-Z]/gu, (letter) => "-" + letter.toLowerCase()) + ".id"
      );
      preparedBody = { title: entry.title, slug: entry.slug, data: entry.data };
      naturalKey = { typeId, slug: entry.slug };
      authoredProjection = {
        typeId,
        authorId: state.bootstrapBaseline.id,
        ...preparedBody,
        status: "draft",
        visibility: "public",
        accessPasswordAbsent: true,
        tags: [],
        publishedAt: null,
        scheduledAt: null,
      };
    } else if (action.id === "set-033-entry-create") {
      const typeId = captures.get("content-type-editable.id");
      preparedBody = {
        title: plan.fixtureBlueprint.entry.title,
        slug: plan.fixtureBlueprint.entry.slug,
        data: resolveFixtureValue(plan.fixtureBlueprint.entry.baseline, captures),
      };
      naturalKey = { typeId, slug: preparedBody.slug };
      authoredProjection = {
        typeId,
        authorId: state.bootstrapBaseline.id,
        ...preparedBody,
        status: "draft",
        visibility: "public",
        accessPasswordAbsent: true,
        tags: [],
        publishedAt: null,
        scheduledAt: null,
      };
    } else if (action.id === "set-030-media-upload") {
      const media = plan.fixtureBlueprint.media;
      naturalKey = {
        originalName: media.originalName,
        mimeType: media.mimeType,
        size: media.uploadFixture.decodedSizeBytes,
      };
      authoredProjection = {
        originalName: media.originalName,
        type: "image",
        mimeType: media.mimeType,
        size: media.uploadFixture.decodedSizeBytes,
        width: 1,
        height: 1,
        alt: null,
        title: media.title,
        caption: null,
        folderId: null,
        tags: [],
        focalX: null,
        focalY: null,
        description: null,
        credit: null,
        createdBy: state.bootstrapBaseline.id,
        fileSha256: media.uploadFixture.sha256,
      };
    } else if (action.id === "set-035-screen-create" || action.id === "set-037-retry-screen-create") {
      const key = action.id === "set-035-screen-create" ? "main" : "retry";
      const blueprint =
        key === "main" ? plan.fixtureBlueprint.screen : plan.fixtureBlueprint.retryScreen;
      preparedBody = await materializeScreenBody(
        state,
        blueprint,
        captures,
        action.id === "set-035-screen-create"
          ? "runtime/set-035-screen-create"
          : "runtime/set-037-retry-screen-create"
      );
      naturalKey = { name: preparedBody.name, contentTypeId: preparedBody.contentTypeId };
      authoredProjection = { ...preparedBody, collectionRole: null, compositionKey: null };
    } else if (action.id === "set-039-override-create") {
      naturalKey = {
        screenId: captures.get("screen.id"),
        entryId: captures.get("entry.id"),
        blockId: plan.fixtureBlueprint.screen.blockIds.raceImage,
        propPath: "mediaAssetId",
      };
      authoredProjection = {
        ...naturalKey,
        value: captures.get("media.id"),
        updatedBy: state.bootstrapBaseline.id,
      };
    } else if (action.id === "set-041-preference-a" || action.id === "set-043-preference-b") {
      const userId = state.ids[action.id === "set-041-preference-a" ? "userA" : "userB"];
      naturalKey = { userId };
      authoredProjection = {
        userId,
        key: "customScreens.entry.preferences",
        value: { version: 1, showFieldMetadata: false },
      };
    } else {
      invariant(false, "response-lost authored intent action is not registered");
    }
    assertPlainJsonValue(naturalKey, "response-lost natural key");
    assertPlainJsonValue(authoredProjection, "response-lost authored projection");
    return deepFreezeExact({
      naturalKey: deepFreezeExact(naturalKey),
      authoredProjection: deepFreezeExact(authoredProjection),
      authoredRequestSha256: hashBytes(Buffer.from(canonicalJson(authoredProjection))),
      preparedBody: preparedBody === null ? null : deepFreezeExact(preparedBody),
    });
  }

  async function armResponseLostCreateBeforeWrite(state, action, captures) {
    if (RESPONSE_LOST_CREATE_DESCRIPTORS[action.id] === undefined) return;
    invariant(
      !state.responseLostIntents.has(action.id),
      "response-lost authored intent was assigned twice"
    );
    const intent = await buildResponseLostAuthoredIntent(state, action, captures);
    const baseline = state.responseLostBaselines.get(action.id);
    invariant(baseline !== undefined, "response-lost preflight baseline is absent");
    state.responseLostIntents.set(action.id, intent);
    if (intent.preparedBody !== null) {
      invariant(
        !state.preparedCreateBodies.has(action.id),
        "prepared create body was assigned twice"
      );
      state.preparedCreateBodies.set(action.id, intent.preparedBody);
    }
    state.pendingFailureAttempts.arm(
      action,
      intendedParentBlockerKeysForCreate(state, action),
      deepFreezeExact({
        naturalKey: intent.naturalKey,
        baseline,
        authoredRequestSha256: intent.authoredRequestSha256,
      })
    );
  }

  return Object.freeze({
    armResponseLostCreateBeforeWrite,
    captureAllResponseLostNaturalBaselinesBeforeFirstWrite,
  });
}
