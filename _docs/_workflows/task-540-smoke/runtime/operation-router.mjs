import { PRIMARY_RUNTIME_OPERATION_BY_ACTION_ID } from "../executor/config.mjs";
import { invariant } from "../executor/foundation.mjs";
import { decodeCanonicalMediaUploadFixtureExact } from "./media-operations.mjs";

function canonicalManifestRuntimeOperation(action) {
  if (action.id === "set-032-storage-post-setup") return "media-race-missing-absence-setup";
  if (action.id === "set-040-override-proof") return "media-race-projection-provenance";
  return PRIMARY_RUNTIME_OPERATION_BY_ACTION_ID[action.id] ?? action.executable.operationId;
}

function createRuntimeOperationRouter({
  sendCanonicalMediaMultipart,
  runtimeResetScreen,
  runtimeProveScreenBaseline,
  runtimeResetEntry,
  runtimeProveEntryBaseline,
  runtimeReplaceOverrides,
  runtimeProveOverrides,
  runtimeStoragePreflight,
  runtimeHostLaunch,
  runtimeHealth,
  runtimeBotProtection,
  runtimeSecurity,
  runtimeLogin,
  runtimeCsrf,
  runtimeProvisionUser,
  runtimeProveUser,
  runtimeCreateContentType,
  runtimeProveContentType,
  runtimeCreateRelatedEntry,
  runtimeProveRelatedEntry,
  runtimeUploadMedia,
  runtimeProveMedia,
  runtimeStoragePostSetup,
  runtimeCreateEditableEntry,
  runtimeProveEditableEntry,
  runtimeCreateScreen,
  runtimeProveScreen,
  runtimeSetPreference,
  runtimeProvePreference,
  runtimePatchUnsafeBinding,
  runtimeProveUnsafeBinding,
  runtimeUserAPreferenceRead,
  runtimeUserAPreferenceFalse,
}) {
  function buildRuntimeOperationHandlers(planAuthority, dependencies = {}) {
    invariant(
      arguments.length >= 1 &&
        arguments.length <= 2 &&
        planAuthority !== null &&
        typeof planAuthority === "object" &&
        !Array.isArray(planAuthority) &&
        Object.isFrozen(planAuthority) &&
        dependencies !== null &&
        typeof dependencies === "object" &&
        !Array.isArray(dependencies) &&
        Object.getPrototypeOf(dependencies) === Object.prototype,
      "runtime handler authority and dependencies are invalid"
    );
    const mediaUploadFixtureAuthority = planAuthority.fixtureBlueprint?.media?.uploadFixture;
    decodeCanonicalMediaUploadFixtureExact(mediaUploadFixtureAuthority);
    const dependencyKeys = Reflect.ownKeys(dependencies);
    invariant(
      dependencyKeys.length <= 1 && dependencyKeys.every((key) => key === "mediaMultipartSink"),
      "runtime handler dependencies have non-canonical keys"
    );
    if (dependencyKeys.length === 1) {
      const descriptor = Object.getOwnPropertyDescriptor(dependencies, "mediaMultipartSink");
      invariant(
        descriptor &&
          Object.hasOwn(descriptor, "value") &&
          descriptor.enumerable === true &&
          typeof descriptor.value === "function",
        "runtime media multipart dependency is invalid"
      );
    }
    const mediaMultipartSink = dependencies.mediaMultipartSink ?? sendCanonicalMediaMultipart;
    const resetScreen = (context) => runtimeResetScreen(context);
    const proveScreen = (context) => runtimeProveScreenBaseline(context);
    const resetEntry = (context) => runtimeResetEntry(context);
    const proveEntry = (context) => runtimeProveEntryBaseline(context);
    const resetOverrides = (context) => runtimeReplaceOverrides(context, true);
    const proveEmptyOverrides = (context) => runtimeProveOverrides(context, true);
    return Object.freeze({
      "runtime/set-001-storage-preflight": runtimeStoragePreflight,
      "runtime/set-002-helper-launch": runtimeHostLaunch,
      "runtime/set-003-admin-health": (context) => runtimeHealth(context, "admin"),
      "runtime/set-004-front-health": (context) => runtimeHealth(context, "front"),
      "runtime/set-004a-bot-protection-preflight": runtimeBotProtection,
      "runtime/set-004b-session-policy-preflight": (context) =>
        runtimeSecurity(context, "session", "runtime/set-004b-session-policy-preflight"),
      "runtime/set-004c-auth-rate-budget-preflight": (context) =>
        runtimeSecurity(context, "rate", "runtime/set-004c-auth-rate-budget-preflight"),
      "runtime/set-011b-bootstrap-api-login": (context) => runtimeLogin(context, "bootstrap"),
      "runtime/set-011c-bootstrap-csrf-capture": (context) => runtimeCsrf(context, "bootstrap"),
      "runtime/set-012-user-a-create": (context) =>
        runtimeProvisionUser(context, "a", "runtime/set-012-user-a-create"),
      "runtime/set-013-user-a-proof": (context) =>
        runtimeProveUser(context, "a", "runtime/set-013-user-a-proof"),
      "runtime/set-014-user-b-create": (context) =>
        runtimeProvisionUser(context, "b", "runtime/set-014-user-b-create"),
      "runtime/set-015-user-b-proof": (context) =>
        runtimeProveUser(context, "b", "runtime/set-015-user-b-proof"),
      "runtime/set-016-editable-type-create": (context) =>
        runtimeCreateContentType(context, "editable", "content-type-editable.id"),
      "runtime/set-017-editable-type-proof": (context) =>
        runtimeProveContentType(context, "editable", "content-type-editable.id", true),
      "runtime/set-018-related-a-type-create": (context) =>
        runtimeCreateContentType(context, "relatedA", "content-type-related-a.id"),
      "runtime/set-019-related-a-type-proof": (context) =>
        runtimeProveContentType(context, "relatedA", "content-type-related-a.id"),
      "runtime/set-020-related-b-type-create": (context) =>
        runtimeCreateContentType(context, "relatedB", "content-type-related-b.id"),
      "runtime/set-021-related-b-type-proof": (context) =>
        runtimeProveContentType(context, "relatedB", "content-type-related-b.id"),
      "runtime/set-021a-related-failure-type-create": (context) =>
        runtimeCreateContentType(context, "relatedFailure", "content-type-related-failure.id"),
      "runtime/set-021b-related-failure-type-proof": (context) =>
        runtimeProveContentType(context, "relatedFailure", "content-type-related-failure.id"),
      "runtime/set-022-related-a1-create": (context) =>
        runtimeCreateRelatedEntry(context, "a1", "relatedA", "related-entry-a1.id"),
      "runtime/set-023-related-a1-proof": (context) =>
        runtimeProveRelatedEntry(context, "a1", "related-entry-a1.id"),
      "runtime/set-024-related-a2-create": (context) =>
        runtimeCreateRelatedEntry(context, "a2", "relatedA", "related-entry-a2.id"),
      "runtime/set-025-related-a2-proof": (context) =>
        runtimeProveRelatedEntry(context, "a2", "related-entry-a2.id"),
      "runtime/set-026-related-b1-create": (context) =>
        runtimeCreateRelatedEntry(context, "b1", "relatedB", "related-entry-b1.id"),
      "runtime/set-027-related-b1-proof": (context) =>
        runtimeProveRelatedEntry(context, "b1", "related-entry-b1.id"),
      "runtime/set-028-related-b2-create": (context) =>
        runtimeCreateRelatedEntry(context, "b2", "relatedB", "related-entry-b2.id"),
      "runtime/set-029-related-b2-proof": (context) =>
        runtimeProveRelatedEntry(context, "b2", "related-entry-b2.id"),
      "runtime/set-029a-related-failure1-create": (context) =>
        runtimeCreateRelatedEntry(
          context,
          "failure1",
          "relatedFailure",
          "related-entry-failure1.id"
        ),
      "runtime/set-029b-related-failure1-proof": (context) =>
        runtimeProveRelatedEntry(context, "failure1", "related-entry-failure1.id"),
      "runtime/set-030-media-upload": (context) => {
        invariant(context?.plan === planAuthority, "runtime media plan identity authority drift");
        return runtimeUploadMedia(context, mediaMultipartSink, mediaUploadFixtureAuthority);
      },
      "runtime/set-031-media-proof": runtimeProveMedia,
      "runtime/set-032-storage-post-setup": runtimeStoragePostSetup,
      "runtime/set-033-entry-create": runtimeCreateEditableEntry,
      "runtime/set-034-entry-proof": runtimeProveEditableEntry,
      "runtime/set-035-screen-create": (context) =>
        runtimeCreateScreen(context, "main", "screen.id"),
      "runtime/set-036-screen-proof": (context) =>
        runtimeProveScreen(context, "main", "screen.id"),
      "runtime/set-037-retry-screen-create": (context) =>
        runtimeCreateScreen(context, "retry", "retry-screen.id"),
      "runtime/set-038-retry-screen-proof": (context) =>
        runtimeProveScreen(context, "retry", "retry-screen.id"),
      "runtime/set-039-override-create": (context) => runtimeReplaceOverrides(context, false),
      "runtime/set-040-override-proof": (context) => runtimeProveOverrides(context, false),
      "runtime/set-041-preference-a": (context) =>
        runtimeSetPreference(context, "a", false, "runtime/set-041-preference-a"),
      "runtime/set-042-preference-a-proof": (context) =>
        runtimeProvePreference(context, "a", false, "runtime/set-042-preference-a-proof"),
      "runtime/set-043-preference-b": (context) =>
        runtimeSetPreference(context, "b", false, "runtime/set-043-preference-b"),
      "runtime/set-044-preference-b-proof": (context) =>
        runtimeProvePreference(context, "b", false, "runtime/set-044-preference-b-proof"),
      "runtime/bi-060-unsafe-patch": runtimePatchUnsafeBinding,
      "runtime/bi-061-unsafe-proof-read": runtimeProveUnsafeBinding,
      "runtime/bi-064-baseline-restore": resetScreen,
      "runtime/bi-065-baseline-proof": proveScreen,
      "runtime/tc-001-reset": resetOverrides,
      "runtime/tc-002-reset-proof": proveEmptyOverrides,
      "runtime/ss-001-screen-reset": resetScreen,
      "runtime/ss-002-screen-proof": proveScreen,
      "runtime/ss-003-entry-reset": resetEntry,
      "runtime/ss-004-entry-proof": proveEntry,
      "runtime/ss-005-overrides-reset": resetOverrides,
      "runtime/ss-006-overrides-proof": proveEmptyOverrides,
      "runtime/dg-001-entry-reset": resetEntry,
      "runtime/dg-002-entry-proof": proveEntry,
      "runtime/rc-001-entry-reset": resetEntry,
      "runtime/rc-002-entry-proof": proveEntry,
      "runtime/rc-003-overrides-reset": resetOverrides,
      "runtime/rc-004-overrides-proof": proveEmptyOverrides,
      "runtime/ru-001-screen-reset": resetScreen,
      "runtime/ru-002-screen-proof": proveScreen,
      "runtime/ru-003-entry-reset": resetEntry,
      "runtime/ru-004-entry-proof": proveEntry,
      "runtime/ru-005-overrides-reset": resetOverrides,
      "runtime/ru-006-overrides-proof": proveEmptyOverrides,
      "runtime/ru-043b-a-api-login": (context) => runtimeLogin(context, "user-a"),
      "runtime/ru-043c-a-api-csrf-capture": (context) => runtimeCsrf(context, "user-a"),
      "runtime/ru-047a-a-durable-proof": (context) => runtimeUserAPreferenceRead(context, true),
      "runtime/ru-050-a-server-false": runtimeUserAPreferenceFalse,
      "runtime/ru-051-a-server-false-proof": (context) =>
        runtimeUserAPreferenceRead(context, false),
      "runtime/ru-061a-a-durable-bypass-read": (context) =>
        runtimeUserAPreferenceRead(context, true),
    });
  }

  return Object.freeze({ buildRuntimeOperationHandlers });
}

export { canonicalManifestRuntimeOperation, createRuntimeOperationRouter };
