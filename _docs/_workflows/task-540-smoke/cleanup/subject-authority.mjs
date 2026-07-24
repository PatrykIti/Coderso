import path from "node:path";

import { MAX_STREAM_BYTES } from "../executor/config.mjs";
import { deepFreezeExact, hashBytes, invariant } from "../executor/foundation.mjs";
import { cleanupDiagnostics } from "./diagnostics.mjs";

const { retainPrivateCleanupFailureDiagnosticNeverThrow } = cleanupDiagnostics;

export function createCleanupSubjectAuthorityRuntime({
  adminApiRequest,
  bootstrapApiSession,
  readStableArtifactIdentity,
  requireMissingPath,
  responseLostStorageRoot,
  restoreIdentitySafeMediaAncestorDirectories,
  runBunBridgeOperation,
  sameArtifactIdentity,
}) {
  function cleanupSubjectRoute(state, subject) {
    const blueprint = state.plan.fixtureBlueprint;
    const typeByKind = {
      "related-entry-a1": blueprint.contentTypes.relatedA.slug,
      "related-entry-a2": blueprint.contentTypes.relatedA.slug,
      "related-entry-b1": blueprint.contentTypes.relatedB.slug,
      "related-entry-b2": blueprint.contentTypes.relatedB.slug,
      "related-entry-failure1": blueprint.contentTypes.relatedFailure.slug,
      "editable-entry": blueprint.contentTypes.editable.slug,
    };
    if (Object.hasOwn(typeByKind, subject.kind)) {
      return (
        "/content/" +
        encodeURIComponent(typeByKind[subject.kind]) +
        "/entries/" +
        encodeURIComponent(subject.id)
      );
    }
    if (subject.kind === "media") return "/media/" + encodeURIComponent(subject.id);
    if (subject.kind === "screen" || subject.kind === "retry-screen")
      return "/custom-screens/" + encodeURIComponent(subject.id);
    if (subject.kind.startsWith("content-type-"))
      return "/content-types/" + encodeURIComponent(subject.id);
    return null;
  }

  async function runPrivateCleanupAdminApiBoundary(operation) {
    try {
      invariant(typeof operation === "function", "cleanup admin API operation is absent");
      return await operation();
    } catch (error) {
      throw retainPrivateCleanupFailureDiagnosticNeverThrow(error, 3, "admin_api_failed");
    }
  }

  function hashCleanupAuthoritativeBytes(authoritativeBytes, label) {
    invariant(
      Buffer.isBuffer(authoritativeBytes) &&
        authoritativeBytes.length > 0 &&
        authoritativeBytes.length <= MAX_STREAM_BYTES,
      label + " authoritative response bytes drift"
    );
    return hashBytes(authoritativeBytes);
  }

  async function deleteCleanupSubject(state, subject) {
    if (state.deletedSubjects.has(subject.kind))
      return deepFreezeExact({ observedBytesSha256: null });
    let observedBytesSha256 = null;
    if (subject.kind === "user-a" || subject.kind === "user-b") {
      const result = await runBunBridgeOperation(state, "legacy/user-delete-exact", {
        userId: subject.id,
      });
      invariant(result.ok === true, subject.kind + " cleanup failed");
    } else {
      const response = await runPrivateCleanupAdminApiBoundary(async () => {
        const route = cleanupSubjectRoute(state, subject);
        invariant(route !== null, "cleanup subject route is unknown: " + subject.kind);
        const result = await adminApiRequest(state, bootstrapApiSession(state), "DELETE", route, {
          retainAuthoritativeBytes: true,
        });
        const responseSha256 = hashCleanupAuthoritativeBytes(
          result.authoritativeBytes,
          subject.kind + " cleanup delete"
        );
        invariant(result.value?.ok === true, subject.kind + " delete response drift");
        return { observedBytesSha256: responseSha256 };
      });
      observedBytesSha256 = response.observedBytesSha256;
    }
    state.deletedSubjects.add(subject.kind);
    return deepFreezeExact({ observedBytesSha256 });
  }

  async function proveCleanupSubjectPresent(state, subject) {
    const response = await runPrivateCleanupAdminApiBoundary(async () => {
      const route = cleanupSubjectRoute(state, subject);
      invariant(route !== null, "cleanup provenance subject route is unknown: " + subject.kind);
      const result = await adminApiRequest(state, bootstrapApiSession(state), "GET", route, {
        csrf: false,
        retainAuthoritativeBytes: true,
      });
      const observedBytesSha256 = hashCleanupAuthoritativeBytes(
        result.authoritativeBytes,
        subject.kind + " cleanup provenance"
      );
      invariant(
        result.status === 200 && result.value?.id === subject.id,
        subject.kind + " cleanup provenance identity drift"
      );
      if (subject.kind === "media") {
        invariant(
          result.value.key === subject.storageKey &&
            result.value.url === "/media/" + subject.storageKey,
          "media cleanup provenance storage identity drift"
        );
      }
      return { observedBytesSha256 };
    });
    return deepFreezeExact({
      output: deepFreezeExact({ present: true }),
      observedBytesSha256: response.observedBytesSha256,
    });
  }

  async function proveCleanupSubjectAbsent(state, subject) {
    if (subject.kind === "user-a" || subject.kind === "user-b") {
      const result = await runBunBridgeOperation(state, "legacy/user-absence-exact", {
        userId: subject.id,
      });
      invariant(result.absent === true, subject.kind + " remains present");
      return deepFreezeExact({ observedBytesSha256: null });
    }
    const response = await runPrivateCleanupAdminApiBoundary(async () => {
      const route = cleanupSubjectRoute(state, subject);
      invariant(route !== null, "cleanup absence subject route is unknown: " + subject.kind);
      const result = await adminApiRequest(state, bootstrapApiSession(state), "GET", route, {
        csrf: false,
        allowedStatus: [404],
        retainAuthoritativeBytes: true,
      });
      const observedBytesSha256 = hashCleanupAuthoritativeBytes(
        result.authoritativeBytes,
        subject.kind + " cleanup absence"
      );
      invariant(result.status === 404, subject.kind + " remains present");
      return { observedBytesSha256 };
    });
    if (subject.kind === "media") {
      const storageKey = subject.storageKey;
      invariant(
        typeof storageKey === "string" &&
          !storageKey.startsWith("/") &&
          storageKey.split("/").every((part) => part && part !== "." && part !== ".."),
        "media cleanup storage key drift"
      );
      const storageRoot = responseLostStorageRoot(state);
      const absolute = path.resolve(storageRoot, storageKey);
      invariant(
        absolute.startsWith(storageRoot + path.sep),
        "media cleanup storage key escaped its root"
      );
      await requireMissingPath(absolute, "media cleanup storage key");
      await restoreIdentitySafeMediaAncestorDirectories(state, storageKey);
      const rootIdentity = await readStableArtifactIdentity(storageRoot, {
        expectedType: "directory",
        expectedDev: state.storageRootIdentity.dev,
      });
      invariant(
        sameArtifactIdentity(rootIdentity, state.storageRootIdentity),
        "media cleanup storage root identity drift"
      );
    }
    return deepFreezeExact({ observedBytesSha256: response.observedBytesSha256 });
  }

  return Object.freeze({
    deleteCleanupSubject,
    hashCleanupAuthoritativeBytes,
    proveCleanupSubjectAbsent,
    proveCleanupSubjectPresent,
    runPrivateCleanupAdminApiBoundary,
  });
}
