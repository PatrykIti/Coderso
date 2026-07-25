import {
  MAX_NATURAL_KEY_CANDIDATES,
  MAX_STREAM_BYTES,
} from "../config.mjs";
import {
  assertRecursivelyFrozen,
  deepFreezeExact,
  exactOwnKeys,
  invariant,
} from "../foundation.mjs";
import { isNullableIsoTimestamp } from "../bootstrap-contracts.mjs";
import { deepEqualJson } from "../resource-contracts.mjs";
import {
  requireBoundedBridgeString,
  requireBridgeUuid,
  validateBridgeJsonObject,
  validateBridgeNullableString,
  validateBridgeNullableUuid,
  validateBridgeStringArray,
  validateExactBridgeKeys,
} from "../bun-bridge-validation-primitives.mjs";
import {
  RESPONSE_LOST_CONTENT_TYPE_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_ENTRY_PREFLIGHT_BRIDGE_SOURCE,
  RESPONSE_LOST_ENTRY_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_MEDIA_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_OVERRIDE_PREFLIGHT_BRIDGE_SOURCE,
  RESPONSE_LOST_OVERRIDE_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_SCREEN_PREFLIGHT_BRIDGE_SOURCE,
  RESPONSE_LOST_SCREEN_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_SETTING_PREFLIGHT_BRIDGE_SOURCE,
  RESPONSE_LOST_SETTING_QUERY_BRIDGE_SOURCE,
  RESPONSE_LOST_USER_QUERY_BRIDGE_SOURCE,
} from "../bridge-sources/response-lost.mjs";

// The query-operation binding table is owned by the response-lost registry, which
// only exists once its Bun bridge authority is constructed. The facade binds the
// frozen table into this module exactly once, before any validator can run.
let RESPONSE_LOST_QUERY_OPERATION_BINDINGS = null;

function bindResponseLostQueryOperationBindings(bindings) {
  invariant(
    RESPONSE_LOST_QUERY_OPERATION_BINDINGS === null,
    "response-lost query operation bindings are already bound"
  );
  invariant(
    typeof bindings === "object" && bindings !== null,
    "response-lost query operation bindings are absent"
  );
  assertRecursivelyFrozen(bindings);
  RESPONSE_LOST_QUERY_OPERATION_BINDINGS = bindings;
}

function validateBooleanBridgeProjection(value, key, label) {
  validateExactBridgeKeys(value, [key], label);
  invariant(typeof value[key] === "boolean", label + " boolean drift");
  return value;
}

function validateContentRoutesBridgeProjection(value, label) {
  validateExactBridgeKeys(value, ["exists", "updatedAt", "value"], label);
  invariant(
    typeof value.exists === "boolean" &&
      (value.updatedAt === null || isNullableIsoTimestamp(value.updatedAt)) &&
      (value.exists ? value.updatedAt !== null : value.updatedAt === null && value.value === null),
    label + " projection drift"
  );
  return value;
}

function responseLostCandidateFamilyForDescriptor(descriptor) {
  const source = descriptor.source;
  if (source === RESPONSE_LOST_USER_QUERY_BRIDGE_SOURCE) return "user";
  if (source === RESPONSE_LOST_CONTENT_TYPE_QUERY_BRIDGE_SOURCE) return "contentType";
  if (
    source === RESPONSE_LOST_ENTRY_QUERY_BRIDGE_SOURCE ||
    source === RESPONSE_LOST_ENTRY_PREFLIGHT_BRIDGE_SOURCE
  ) {
    return "entry";
  }
  if (
    source === RESPONSE_LOST_SCREEN_QUERY_BRIDGE_SOURCE ||
    source === RESPONSE_LOST_SCREEN_PREFLIGHT_BRIDGE_SOURCE
  ) {
    return "screen";
  }
  if (source === RESPONSE_LOST_MEDIA_QUERY_BRIDGE_SOURCE) return "media";
  if (
    source === RESPONSE_LOST_OVERRIDE_QUERY_BRIDGE_SOURCE ||
    source === RESPONSE_LOST_OVERRIDE_PREFLIGHT_BRIDGE_SOURCE
  ) {
    return "override";
  }
  if (
    source === RESPONSE_LOST_SETTING_QUERY_BRIDGE_SOURCE ||
    source === RESPONSE_LOST_SETTING_PREFLIGHT_BRIDGE_SOURCE
  ) {
    return "setting";
  }
  invariant(false, "bounded candidate descriptor source is not registered");
}

const RESPONSE_LOST_CANDIDATE_KEYS_BY_FAMILY = deepFreezeExact({
  user: [
    "adminRoleTupleCount",
    "adminWildcardPermissionCount",
    "id",
    "name",
    "normalizedEmailMatches",
    "passwordHashPresent",
    "status",
  ],
  contentType: ["config", "id", "name", "schema", "slug", "status"],
  entry: [
    "accessPasswordAbsent",
    "authorId",
    "data",
    "id",
    "publishedAt",
    "scheduledAt",
    "slug",
    "status",
    "tags",
    "title",
    "typeId",
    "visibility",
  ],
  screen: [
    "collectionRole",
    "compositionKey",
    "contentTypeId",
    "definition",
    "id",
    "name",
    "schemaVersion",
    "showInSidebar",
    "sidebarLabel",
    "status",
  ],
  media: [
    "alt",
    "caption",
    "createdBy",
    "credit",
    "description",
    "focalX",
    "focalY",
    "folderId",
    "height",
    "id",
    "key",
    "mimeType",
    "originalName",
    "size",
    "tags",
    "title",
    "type",
    "url",
    "width",
  ],
  override: ["blockId", "entryId", "propPath", "screenId", "updatedBy", "value"],
  setting: ["key", "userId", "value"],
});

function validateResponseLostContentSchema(schema, label) {
  exactOwnKeys(schema, ["additionalProperties", "properties", "type"], label, { plain: true });
  invariant(
    schema.type === "object" && schema.additionalProperties === false,
    label + " root drift"
  );
  validateBridgeJsonObject(schema.properties, label + " properties");
  const fieldOrders = [];
  invariant(
    Object.keys(schema.properties).length <= MAX_NATURAL_KEY_CANDIDATES,
    label + " property bound drift"
  );
  for (const [field, property] of Object.entries(schema.properties)) {
    requireBoundedBridgeString(field, label + " field name", 128);
    validateBridgeJsonObject(property, label + " property " + field);
    requireBoundedBridgeString(property.title, label + " title " + field, 256);
    invariant(
      ["media", "relation", "text"].includes(property.xFieldType),
      label + " field discriminator drift: " + field
    );
    validateBridgeJsonObject(property.xFieldConfig, label + " field config " + field);
    invariant(
      Number.isSafeInteger(property.xFieldConfig.order) && property.xFieldConfig.order >= 0,
      label + " field order drift: " + field
    );
    fieldOrders.push(property.xFieldConfig.order);
    const validateStringItems = () => {
      exactOwnKeys(property.items, ["type"], label + " items " + field, { plain: true });
      invariant(property.items.type === "string", label + " items drift: " + field);
    };
    if (property.xFieldType === "text") {
      exactOwnKeys(
        property,
        ["title", "type", "xFieldConfig", "xFieldType"],
        label + " text property " + field,
        { plain: true }
      );
      exactOwnKeys(property.xFieldConfig, ["order"], label + " text config " + field, {
        plain: true,
      });
      invariant(property.type === "string", label + " text type drift: " + field);
      continue;
    }
    if (property.xFieldType === "media") {
      const mediaIsMultiple = property.type === "array";
      invariant(
        mediaIsMultiple || property.type === "string",
        label + " media type drift: " + field
      );
      exactOwnKeys(
        property,
        mediaIsMultiple
          ? ["items", "title", "type", "xFieldConfig", "xFieldType"]
          : ["title", "type", "xFieldConfig", "xFieldType"],
        label + " media property " + field,
        { plain: true }
      );
      exactOwnKeys(property.xFieldConfig, ["media", "order"], label + " media config " + field, {
        plain: true,
      });
      exactOwnKeys(property.xFieldConfig.media, ["accept"], label + " media " + field, {
        plain: true,
      });
      validateBridgeStringArray(
        property.xFieldConfig.media.accept,
        label + " media accept " + field,
        32,
        128
      );
      if (mediaIsMultiple) validateStringItems();
      continue;
    }
    exactOwnKeys(
      property.xFieldConfig,
      ["order", "relation"],
      label + " relation config " + field,
      { plain: true }
    );
    exactOwnKeys(
      property.xFieldConfig.relation,
      ["multiple", "target"],
      label + " relation " + field,
      { plain: true }
    );
    const relationIsMultiple = property.xFieldConfig.relation.multiple;
    invariant(
      typeof relationIsMultiple === "boolean" &&
        property.type === (relationIsMultiple ? "array" : "string"),
      label + " relation multiplicity/type drift: " + field
    );
    exactOwnKeys(
      property,
      relationIsMultiple
        ? ["items", "title", "type", "xFieldConfig", "xFieldType", "xRelationTarget"]
        : ["title", "type", "xFieldConfig", "xFieldType", "xRelationTarget"],
      label + " relation property " + field,
      { plain: true }
    );
    requireBoundedBridgeString(
      property.xFieldConfig.relation.target,
      label + " relation config target " + field,
      256
    );
    requireBoundedBridgeString(property.xRelationTarget, label + " relation target " + field, 256);
    invariant(
      property.xRelationTarget === property.xFieldConfig.relation.target,
      label + " relation target correlation drift: " + field
    );
    if (relationIsMultiple) validateStringItems();
  }
  invariant(
    deepEqualJson(
      [...fieldOrders].sort((left, right) => left - right),
      Array.from({ length: fieldOrders.length }, (_value, index) => index)
    ),
    label + " field order sequence drift"
  );
}

function validateResponseLostContentConfig(config, label) {
  validateBridgeJsonObject(config, label);
  const allowed = ["draftsEnabled", "permissions", "pluralName", "singularName", "versioning"];
  invariant(
    Object.keys(config).every((key) => allowed.includes(key)),
    label + " has unknown keys"
  );
  for (const key of ["singularName", "pluralName"]) {
    if (Object.hasOwn(config, key)) requireBoundedBridgeString(config[key], label + " " + key, 256);
  }
  for (const key of ["draftsEnabled", "versioning"]) {
    if (Object.hasOwn(config, key))
      invariant(typeof config[key] === "boolean", label + " " + key + " drift");
  }
  if (Object.hasOwn(config, "permissions")) {
    validateBridgeJsonObject(config.permissions, label + " permissions");
    invariant(Object.keys(config.permissions).length <= 50, label + " permission role bound drift");
    for (const [role, grants] of Object.entries(config.permissions)) {
      requireBoundedBridgeString(role, label + " role", 128);
      validateBridgeJsonObject(grants, label + " grants " + role);
      invariant(
        Object.keys(grants).every((key) =>
          ["create", "delete", "publish", "read", "update"].includes(key)
        ),
        label + " grant key drift"
      );
      invariant(
        Object.values(grants).every((grant) => typeof grant === "boolean"),
        label + " grant scalar drift"
      );
    }
  }
}

function responseLostActionIdForOperation(operationId) {
  return (
    Object.entries(RESPONSE_LOST_QUERY_OPERATION_BINDINGS).find(
      ([, binding]) =>
        binding.baselineOperationId === operationId || binding.discoveryOperationId === operationId
    )?.[0] ?? null
  );
}

function validateResponseLostCandidateFamily(state, descriptor, input, family, candidate, label) {
  requireBridgeUuid(candidate.id ?? candidate.userId ?? candidate.screenId, label + " primary ID");
  if (family === "user") {
    validateBridgeNullableString(candidate.name, label + " name", 256);
    invariant(
      [candidate.adminRoleTupleCount, candidate.adminWildcardPermissionCount].every(
        (count) => Number.isSafeInteger(count) && count >= 0 && count <= MAX_NATURAL_KEY_CANDIDATES
      ) &&
        typeof candidate.normalizedEmailMatches === "boolean" &&
        typeof candidate.passwordHashPresent === "boolean" &&
        candidate.adminRoleTupleCount === candidate.adminWildcardPermissionCount &&
        ["active", "inactive", "pending"].includes(candidate.status),
      label + " user scalar drift"
    );
    return;
  }
  if (family === "contentType") {
    requireBoundedBridgeString(candidate.name, label + " name", 256);
    requireBoundedBridgeString(candidate.slug, label + " slug", 256);
    invariant(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(candidate.slug) &&
        ["draft", "published"].includes(candidate.status) &&
        (!Object.hasOwn(input, "slug") || candidate.slug === input.slug),
      label + " slug/status correlation drift"
    );
    validateResponseLostContentSchema(candidate.schema, label + " schema");
    validateResponseLostContentConfig(candidate.config, label + " config");
    return;
  }
  if (family === "entry") {
    requireBridgeUuid(candidate.typeId, label + " type ID");
    validateBridgeNullableUuid(candidate.authorId, label + " author ID");
    requireBoundedBridgeString(candidate.title, label + " title", 512);
    requireBoundedBridgeString(candidate.slug, label + " slug", 256);
    invariant(
      ["draft", "published", "scheduled", "archived"].includes(candidate.status) &&
        ["public", "private", "password"].includes(candidate.visibility) &&
        typeof candidate.accessPasswordAbsent === "boolean" &&
        candidate.slug === (Object.hasOwn(input, "slug") ? input.slug : input.entrySlug) &&
        (!Object.hasOwn(input, "typeId") || candidate.typeId === input.typeId),
      label + " entry scalar drift"
    );
    validateBridgeStringArray(candidate.tags, label + " tags", 20, 24);
    validateBridgeJsonObject(candidate.data, label + " data");
    invariant(
      isNullableIsoTimestamp(candidate.publishedAt) &&
        isNullableIsoTimestamp(candidate.scheduledAt),
      label + " timestamp drift"
    );
    return;
  }
  if (family === "screen") {
    requireBridgeUuid(candidate.contentTypeId, label + " content-type ID");
    requireBoundedBridgeString(candidate.name, label + " name", 160);
    validateBridgeNullableString(candidate.compositionKey, label + " composition key", 160);
    validateBridgeNullableString(candidate.sidebarLabel, label + " sidebar label", 160);
    invariant(
      ["draft", "active"].includes(candidate.status) &&
        (candidate.collectionRole === null ||
          ["canonical-admin-screen", "secondary-admin-screen"].includes(
            candidate.collectionRole
          )) &&
        typeof candidate.showInSidebar === "boolean" &&
        candidate.schemaVersion === 4 &&
        candidate.name === input.name &&
        (!Object.hasOwn(input, "contentTypeId") ||
          candidate.contentTypeId === input.contentTypeId) &&
        (candidate.compositionKey === null || /^[a-zA-Z0-9_.-]+$/u.test(candidate.compositionKey)),
      label + " Screen scalar drift"
    );
    validateBridgeJsonObject(candidate.definition, label + " definition");
    exactOwnKeys(
      candidate.definition,
      ["editorView", "listView", "schemaVersion"],
      label + " definition",
      { plain: true }
    );
    invariant(candidate.definition.schemaVersion === 4, label + " definition version drift");
    validateBridgeJsonObject(candidate.definition.editorView, label + " editor view");
    validateBridgeJsonObject(candidate.definition.listView, label + " list view");
    const screenActionId = responseLostActionIdForOperation(descriptor.operationId);
    const intendedScreen =
      screenActionId === null
        ? null
        : state?.responseLostIntents?.get(screenActionId)?.preparedBody;
    if (intendedScreen?.definition)
      invariant(
        deepEqualJson(candidate.definition, intendedScreen.definition),
        label + " authored Screen definition drift"
      );
    return;
  }
  if (family === "media") {
    requireBoundedBridgeString(candidate.key, label + " storage key", 1024);
    invariant(
      /^\d{4}\/(?:0[1-9]|1[0-2])\/[0-9a-f-]{36}\.png$/u.test(candidate.key) &&
        candidate.url === "/media/" + candidate.key,
      label + " media path drift"
    );
    requireBoundedBridgeString(candidate.originalName, label + " original name", 255);
    requireBoundedBridgeString(candidate.type, label + " type", 64);
    requireBoundedBridgeString(candidate.mimeType, label + " MIME", 128);
    invariant(
      ["file", "image"].includes(candidate.type) &&
        Number.isSafeInteger(candidate.size) &&
        candidate.size > 0 &&
        candidate.size <= MAX_STREAM_BYTES &&
        candidate.originalName === input.originalName &&
        candidate.mimeType === input.mimeType &&
        candidate.size === input.size,
      label + " media scalar/correlation drift"
    );
    for (const key of ["width", "height"]) {
      invariant(
        candidate[key] === null || (Number.isSafeInteger(candidate[key]) && candidate[key] > 0),
        label + " " + key + " drift"
      );
    }
    for (const key of ["focalX", "focalY"]) {
      invariant(
        candidate[key] === null ||
          (typeof candidate[key] === "number" &&
            Number.isFinite(candidate[key]) &&
            candidate[key] >= 0 &&
            candidate[key] <= 1),
        label + " " + key + " drift"
      );
    }
    for (const key of ["alt", "title", "caption"])
      validateBridgeNullableString(candidate[key], label + " " + key, 2048);
    validateBridgeNullableString(candidate.description, label + " description", 2000);
    validateBridgeNullableString(candidate.credit, label + " credit", 300);
    validateBridgeNullableUuid(candidate.folderId, label + " folder ID");
    validateBridgeNullableUuid(candidate.createdBy, label + " creator ID");
    validateBridgeStringArray(candidate.tags, label + " tags", 30, 40);
    invariant(
      candidate.tags.every((tag) => tag === tag.trim()),
      label + " tags are not trimmed"
    );
    return;
  }
  if (family === "override") {
    requireBridgeUuid(candidate.entryId, label + " entry ID");
    requireBoundedBridgeString(candidate.blockId, label + " block ID", 160);
    invariant(
      /^[a-zA-Z0-9_.-]+$/u.test(candidate.blockId) &&
        candidate.propPath === "mediaAssetId" &&
        candidate.blockId === input.blockId &&
        candidate.propPath === input.propPath &&
        (!Object.hasOwn(input, "screenId") || candidate.screenId === input.screenId) &&
        (!Object.hasOwn(input, "entryId") || candidate.entryId === input.entryId),
      label + " override natural-key drift"
    );
    requireBridgeUuid(candidate.value, label + " value media ID");
    validateBridgeNullableUuid(candidate.updatedBy, label + " updater ID");
    return;
  }
  invariant(family === "setting", label + " family drift");
  invariant(candidate.key === "customScreens.entry.preferences", label + " setting key drift");
  if (Object.hasOwn(input, "userId"))
    invariant(candidate.userId === input.userId, label + " setting user correlation drift");
  exactOwnKeys(candidate.value, ["showFieldMetadata", "version"], label + " setting value", {
    plain: true,
  });
  invariant(
    candidate.value.version === 1 && typeof candidate.value.showFieldMetadata === "boolean",
    label + " setting value drift"
  );
}

function validateBoundedCandidatesBridgeOutput(state, descriptor, input, value) {
  validateExactBridgeKeys(value, ["candidates", "overflow"], descriptor.operationId + " output");
  invariant(
    Array.isArray(value.candidates) &&
      value.candidates.length <= MAX_NATURAL_KEY_CANDIDATES &&
      typeof value.overflow === "boolean",
    descriptor.operationId + " candidate envelope drift"
  );
  const family = responseLostCandidateFamilyForDescriptor(descriptor);
  const candidateKeys = RESPONSE_LOST_CANDIDATE_KEYS_BY_FAMILY[family];
  for (const candidate of value.candidates) {
    validateExactBridgeKeys(candidate, candidateKeys, descriptor.operationId + " candidate");
    validateResponseLostCandidateFamily(
      state,
      descriptor,
      input,
      family,
      candidate,
      descriptor.operationId + " candidate"
    );
  }
  return value;
}

export {
  RESPONSE_LOST_CANDIDATE_KEYS_BY_FAMILY,
  bindResponseLostQueryOperationBindings,
  responseLostActionIdForOperation,
  responseLostCandidateFamilyForDescriptor,
  validateBooleanBridgeProjection,
  validateBoundedCandidatesBridgeOutput,
  validateContentRoutesBridgeProjection,
  validateResponseLostCandidateFamily,
  validateResponseLostContentConfig,
  validateResponseLostContentSchema,
};
