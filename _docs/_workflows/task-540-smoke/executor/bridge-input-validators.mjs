import { MAX_STREAM_BYTES } from "./config.mjs";
import { deepFreezeExact, exactOwnKeys, invariant } from "./foundation.mjs";
import {
  isNullableIsoTimestamp,
  validateBootstrapPrivateBaseline,
} from "./bootstrap-contracts.mjs";
import { assertPlainJsonValue } from "./json-schema.mjs";
import { deepEqualJson } from "./resource-contracts.mjs";
import {
  requireBoundedBridgeString,
  requireBridgeUuid,
  validateBridgeJsonObject,
} from "./bun-bridge-validation-primitives.mjs";
import {
  CONTENT_ENTRY_PROVENANCE_BRIDGE_SOURCE,
  CONTENT_TYPE_PROVENANCE_BRIDGE_SOURCE,
  CUSTOM_SCREEN_PROVENANCE_BRIDGE_SOURCE,
  MEDIA_EXACT_BRIDGE_SOURCES,
  PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES,
  SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES,
  TASK_TRAFFIC_EXACT_BRIDGE_SOURCES,
  USER_EXACT_BRIDGE_SOURCES,
  USER_SETTING_EXACT_BRIDGE_SOURCES,
} from "./bun-bridge-resource-sources.mjs";

function bunBridgeInputSchema(inputKeys, validator) {
  invariant(
    Array.isArray(inputKeys) && typeof validator === "function",
    "Bun bridge input schema declaration drift"
  );
  return deepFreezeExact({ inputKeys: [...inputKeys].sort(), validator });
}

function validateBridgeIdentifierTuple(input, length, label) {
  invariant(
    Array.isArray(input.identifier) && input.identifier.length === length,
    label + " tuple bound drift"
  );
  input.identifier.forEach((value, index) =>
    requireBoundedBridgeString(value, label + "[" + index + "]", 1024)
  );
  return input.identifier;
}

const BUN_BRIDGE_INPUT_VALIDATORS = deepFreezeExact({
  "bootstrap-restore-input-v1": bunBridgeInputSchema(
    ["baseline", "newestOwnedPair", "userId"],
    (_state, _descriptor, input) => {
      validateBootstrapPrivateBaseline(input.baseline, "Bun bootstrap restore baseline");
      exactOwnKeys(
        input.newestOwnedPair,
        ["lastLoginAt", "updatedAt"],
        "Bun bootstrap newest pair",
        { plain: true }
      );
      invariant(
        input.userId === input.baseline.id &&
          isNullableIsoTimestamp(input.newestOwnedPair.lastLoginAt) &&
          isNullableIsoTimestamp(input.newestOwnedPair.updatedAt),
        "Bun bootstrap restore identity/timestamp drift"
      );
    }
  ),
  "email-input-v1": bunBridgeInputSchema(["email"], (_state, _descriptor, input) => {
    requireBoundedBridgeString(input.email, "Bun email", 320);
    invariant(
      input.email === input.email.toLowerCase() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(input.email),
      "Bun email normalization drift"
    );
  }),
  "empty-input-v1": bunBridgeInputSchema([], () => {}),
  "entry-discovery-input-v1": bunBridgeInputSchema(
    ["slug", "typeId"],
    (_state, _descriptor, input) => {
      requireBridgeUuid(input.typeId, "Bun entry type ID");
      requireBoundedBridgeString(input.slug, "Bun entry slug", 256);
    }
  ),
  "entry-preflight-input-v1": bunBridgeInputSchema(
    ["entrySlug", "typeSlug"],
    (_state, _descriptor, input) => {
      requireBoundedBridgeString(input.entrySlug, "Bun entry preflight slug", 256);
      requireBoundedBridgeString(input.typeSlug, "Bun type preflight slug", 256);
    }
  ),
  "identifier-media-input-v1": bunBridgeInputSchema(
    ["identifier"],
    (_state, _descriptor, input) => {
      const [mediaId, storageKey] = validateBridgeIdentifierTuple(input, 2, "Bun media identifier");
      requireBridgeUuid(mediaId, "Bun media identifier ID");
      invariant(
        /^\d{4}\/(?:0[1-9]|1[0-2])\/[0-9a-f-]{36}\.png$/u.test(storageKey),
        "Bun media storage-key drift"
      );
    }
  ),
  "identifier-override-input-v1": bunBridgeInputSchema(
    ["identifier"],
    (_state, _descriptor, input) => {
      const [screenId, entryId, blockId, propPath] = validateBridgeIdentifierTuple(
        input,
        4,
        "Bun override identifier"
      );
      requireBridgeUuid(screenId, "Bun override Screen ID");
      requireBridgeUuid(entryId, "Bun override entry ID");
      requireBoundedBridgeString(blockId, "Bun override block ID", 256);
      invariant(propPath === "mediaAssetId", "Bun override propPath drift");
    }
  ),
  "identifier-setting-input-v1": bunBridgeInputSchema(
    ["identifier"],
    (_state, _descriptor, input) => {
      const [userId, key] = validateBridgeIdentifierTuple(input, 2, "Bun setting identifier");
      requireBridgeUuid(userId, "Bun setting user ID");
      invariant(key === "customScreens.entry.preferences", "Bun setting key drift");
    }
  ),
  "identifier-uuid-input-v1": bunBridgeInputSchema(["identifier"], (_state, _descriptor, input) => {
    const [id] = validateBridgeIdentifierTuple(input, 1, "Bun UUID identifier");
    requireBridgeUuid(id, "Bun UUID identifier");
  }),
  "media-id-input-v1": bunBridgeInputSchema(["mediaId"], (_state, _descriptor, input) => {
    requireBridgeUuid(input.mediaId, "Bun media ID");
  }),
  "media-natural-input-v1": bunBridgeInputSchema(
    ["mimeType", "originalName", "size"],
    (_state, _descriptor, input) => {
      requireBoundedBridgeString(input.mimeType, "Bun media MIME", 128);
      requireBoundedBridgeString(input.originalName, "Bun media filename", 512);
      invariant(
        Number.isSafeInteger(input.size) && input.size > 0 && input.size <= MAX_STREAM_BYTES,
        "Bun media size drift"
      );
    }
  ),
  "override-discovery-input-v1": bunBridgeInputSchema(
    ["blockId", "entryId", "propPath", "screenId"],
    (_state, _descriptor, input) => {
      requireBridgeUuid(input.screenId, "Bun override Screen ID");
      requireBridgeUuid(input.entryId, "Bun override entry ID");
      requireBoundedBridgeString(input.blockId, "Bun override block ID", 256);
      invariant(input.propPath === "mediaAssetId", "Bun override propPath drift");
    }
  ),
  "override-preflight-input-v1": bunBridgeInputSchema(
    ["blockId", "contentTypeSlug", "entrySlug", "propPath", "screenName"],
    (_state, _descriptor, input) => {
      for (const key of ["blockId", "contentTypeSlug", "entrySlug", "screenName"])
        requireBoundedBridgeString(input[key], "Bun override " + key, 256);
      invariant(input.propPath === "mediaAssetId", "Bun override preflight propPath drift");
    }
  ),
  "preference-write-input-v1": bunBridgeInputSchema(
    ["showFieldMetadata", "userId"],
    (_state, _descriptor, input) => {
      requireBridgeUuid(input.userId, "Bun preference user ID");
      invariant(typeof input.showFieldMetadata === "boolean", "Bun preference boolean drift");
    }
  ),
  "resource-owner-input-v2": bunBridgeInputSchema(
    ["entryIds", "mediaId", "override", "overrideExpectedPresent"],
    (_state, _descriptor, input) => {
      invariant(
        Array.isArray(input.entryIds) &&
          input.entryIds.length === 6 &&
          new Set(input.entryIds).size === 6,
        "Bun owner entry tuple drift"
      );
      input.entryIds.forEach((id) => requireBridgeUuid(id, "Bun owner entry ID"));
      requireBridgeUuid(input.mediaId, "Bun owner media ID");
      exactOwnKeys(
        input.override,
        ["blockId", "entryId", "propPath", "screenId"],
        "Bun owner override",
        { plain: true }
      );
      requireBridgeUuid(input.override.entryId, "Bun owner override entry ID");
      requireBridgeUuid(input.override.screenId, "Bun owner override Screen ID");
      requireBoundedBridgeString(input.override.blockId, "Bun owner override block ID", 256);
      invariant(
        input.override.propPath === "mediaAssetId" &&
          typeof input.overrideExpectedPresent === "boolean",
        "Bun owner override expectation drift"
      );
    }
  ),
  "seo-entry-targets-input-v1": bunBridgeInputSchema(
    ["targetIds"],
    (_state, _descriptor, input) => {
      invariant(
        Array.isArray(input.targetIds) &&
          input.targetIds.length === 6 &&
          new Set(input.targetIds).size === 6,
        "Bun SEO entry target tuple drift"
      );
      input.targetIds.forEach((targetId) => requireBridgeUuid(targetId, "Bun SEO entry target ID"));
    }
  ),
  "identifier-seo-entry-input-v1": bunBridgeInputSchema(
    ["identifier"],
    (_state, _descriptor, input) => {
      const [id, targetType, targetId] = validateBridgeIdentifierTuple(
        input,
        3,
        "Bun SEO entry identifier"
      );
      requireBridgeUuid(id, "Bun SEO document ID");
      invariant(targetType === "entry", "Bun SEO target type drift");
      requireBridgeUuid(targetId, "Bun SEO target ID");
    }
  ),
  "screen-discovery-input-v1": bunBridgeInputSchema(
    ["contentTypeId", "name"],
    (_state, _descriptor, input) => {
      requireBridgeUuid(input.contentTypeId, "Bun Screen content-type ID");
      requireBoundedBridgeString(input.name, "Bun Screen name", 256);
    }
  ),
  "screen-materialize-input-v1": bunBridgeInputSchema(
    ["bodyWithoutDefinition", "contentType", "definitionWithoutListView"],
    (state, descriptor, input) => {
      exactOwnKeys(
        input.bodyWithoutDefinition,
        ["contentTypeId", "name", "showInSidebar", "sidebarLabel", "status"],
        "Bun Screen body",
        { plain: true }
      );
      requireBridgeUuid(
        input.bodyWithoutDefinition.contentTypeId,
        "Bun Screen body content-type ID"
      );
      requireBoundedBridgeString(input.bodyWithoutDefinition.name, "Bun Screen body name", 256);
      requireBoundedBridgeString(
        input.bodyWithoutDefinition.sidebarLabel,
        "Bun Screen sidebar label",
        256
      );
      invariant(
        input.bodyWithoutDefinition.status === "active" &&
          typeof input.bodyWithoutDefinition.showInSidebar === "boolean",
        "Bun Screen body scalar drift"
      );
      exactOwnKeys(input.contentType, ["id", "name", "schema", "slug"], "Bun Screen content type", {
        plain: true,
      });
      requireBridgeUuid(input.contentType.id, "Bun Screen content-type ID");
      requireBoundedBridgeString(input.contentType.name, "Bun Screen content-type name", 256);
      requireBoundedBridgeString(input.contentType.slug, "Bun Screen content-type slug", 256);
      validateBridgeJsonObject(input.contentType.schema, "Bun Screen content-type schema");
      exactOwnKeys(
        input.definitionWithoutListView,
        ["editorView", "schemaVersion"],
        "Bun Screen definition",
        { plain: true }
      );
      invariant(
        input.definitionWithoutListView.schemaVersion === 4,
        "Bun Screen definition version drift"
      );
      validateBridgeJsonObject(
        input.definitionWithoutListView.editorView,
        "Bun Screen editor definition"
      );
      if (state?.editableContentTypeDetail)
        invariant(
          deepEqualJson(input.contentType, state.editableContentTypeDetail),
          "Bun Screen content-type authority drift"
        );
      const blueprint =
        descriptor.operationId === "runtime/set-035-screen-create"
          ? state?.plan?.fixtureBlueprint?.screen
          : state?.plan?.fixtureBlueprint?.retryScreen;
      if (blueprint) {
        const { listView: ignoredListView, ...expectedDefinition } = blueprint.definitionTemplate;
        void ignoredListView;
        invariant(
          deepEqualJson(input.definitionWithoutListView, expectedDefinition),
          "Bun Screen definition authority drift"
        );
      }
    }
  ),
  "screen-preflight-input-v1": bunBridgeInputSchema(
    ["contentTypeSlug", "name"],
    (_state, _descriptor, input) => {
      requireBoundedBridgeString(input.contentTypeSlug, "Bun Screen content-type slug", 256);
      requireBoundedBridgeString(input.name, "Bun Screen name", 256);
    }
  ),
  "slug-input-v1": bunBridgeInputSchema(["slug"], (_state, _descriptor, input) => {
    requireBoundedBridgeString(input.slug, "Bun slug", 256);
  }),
  "user-agents-input-v1": bunBridgeInputSchema(["userAgents"], (_state, _descriptor, input) => {
    invariant(
      Array.isArray(input.userAgents) &&
        input.userAgents.length === 4 &&
        new Set(input.userAgents).size === 4,
      "Bun user-agent tuple drift"
    );
    input.userAgents.forEach((value) => requireBoundedBridgeString(value, "Bun user agent", 512));
  }),
  "user-id-input-v1": bunBridgeInputSchema(["userId"], (_state, _descriptor, input) => {
    requireBridgeUuid(input.userId, "Bun user ID");
  }),
  "user-identity-input-v1": bunBridgeInputSchema(
    ["email", "userId"],
    (_state, _descriptor, input) => {
      requireBridgeUuid(input.userId, "Bun identity user ID");
      requireBoundedBridgeString(input.email, "Bun identity email", 320);
      invariant(
        input.email === input.email.toLowerCase() &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(input.email),
        "Bun identity email drift"
      );
    }
  ),
  "user-provision-input-v1": bunBridgeInputSchema(
    ["email", "name"],
    (_state, _descriptor, input) => {
      requireBoundedBridgeString(input.email, "Bun provision email", 320);
      requireBoundedBridgeString(input.name, "Bun provision name", 256);
      invariant(
        input.email === input.email.toLowerCase() &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(input.email),
        "Bun provision email drift"
      );
    }
  ),
  "user-session-observation-input-v1": bunBridgeInputSchema(
    ["userAgent", "userId"],
    (_state, _descriptor, input) => {
      requireBridgeUuid(input.userId, "Bun observed user ID");
      requireBoundedBridgeString(input.userAgent, "Bun observed user agent", 512);
    }
  ),
});

function bunBridgeInputSchemaId(source, inputKeys) {
  const signature = [...inputKeys].sort().join(",");
  const direct = {
    "": "empty-input-v1",
    "baseline,newestOwnedPair,userId": "bootstrap-restore-input-v1",
    "blockId,contentTypeSlug,entrySlug,propPath,screenName": "override-preflight-input-v1",
    "blockId,entryId,propPath,screenId": "override-discovery-input-v1",
    "bodyWithoutDefinition,contentType,definitionWithoutListView": "screen-materialize-input-v1",
    "contentTypeId,name": "screen-discovery-input-v1",
    "contentTypeSlug,name": "screen-preflight-input-v1",
    email: "email-input-v1",
    "email,name": "user-provision-input-v1",
    "email,userId": "user-identity-input-v1",
    "entryIds,mediaId,override,overrideExpectedPresent": "resource-owner-input-v2",
    "entrySlug,typeSlug": "entry-preflight-input-v1",
    mediaId: "media-id-input-v1",
    "mimeType,originalName,size": "media-natural-input-v1",
    "showFieldMetadata,userId": "preference-write-input-v1",
    slug: "slug-input-v1",
    "slug,typeId": "entry-discovery-input-v1",
    "userAgent,userId": "user-session-observation-input-v1",
    userAgents: "user-agents-input-v1",
    userId: "user-id-input-v1",
    targetIds: "seo-entry-targets-input-v1",
  }[signature];
  if (direct) return direct;
  invariant(signature === "identifier", "Bun bridge input signature is unregistered: " + signature);
  if (Object.values(PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES).includes(source))
    return "identifier-override-input-v1";
  if (Object.values(SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES).includes(source))
    return "identifier-seo-entry-input-v1";
  if (Object.values(USER_SETTING_EXACT_BRIDGE_SOURCES).includes(source))
    return "identifier-setting-input-v1";
  if (Object.values(MEDIA_EXACT_BRIDGE_SOURCES).includes(source))
    return "identifier-media-input-v1";
  if (
    [
      ...Object.values(USER_EXACT_BRIDGE_SOURCES),
      ...Object.values(TASK_TRAFFIC_EXACT_BRIDGE_SOURCES).flatMap((sources) =>
        Object.values(sources)
      ),
      CONTENT_TYPE_PROVENANCE_BRIDGE_SOURCE,
      CONTENT_ENTRY_PROVENANCE_BRIDGE_SOURCE,
      CUSTOM_SCREEN_PROVENANCE_BRIDGE_SOURCE,
    ].includes(source)
  )
    return "identifier-uuid-input-v1";
  invariant(false, "Bun bridge identifier input source is unregistered");
}

function validateBunBridgeInput(state, descriptor, input) {
  const schema = BUN_BRIDGE_INPUT_VALIDATORS[descriptor.inputSchemaId];
  invariant(
    schema && typeof schema.validator === "function",
    "Bun bridge input schema is not registered: " + descriptor.inputSchemaId
  );
  exactOwnKeys(input, schema.inputKeys, descriptor.operationId + " Bun bridge input", {
    plain: true,
  });
  assertPlainJsonValue(input, descriptor.operationId + " Bun bridge input");
  schema.validator(state, descriptor, input);
  return input;
}

export {
  BUN_BRIDGE_INPUT_VALIDATORS,
  bunBridgeInputSchema,
  bunBridgeInputSchemaId,
  validateBridgeIdentifierTuple,
  validateBunBridgeInput,
};
