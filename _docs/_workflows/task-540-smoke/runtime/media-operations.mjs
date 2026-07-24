import { exactOwnKeys, hashBytes, invariant } from "../executor/foundation.mjs";

const TASK540_MEDIA_UPLOAD_SHA256 =
  "431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460";
const TASK540_PNG_SIGNATURE_HEX = "89504e470d0a1a0a";

function decodeCanonicalMediaUploadFixtureExact(uploadFixture) {
  exactOwnKeys(
    uploadFixture,
    ["encoding", "data", "decodedSizeBytes", "sha256"],
    "media upload fixture",
    { plain: true }
  );
  invariant(Object.isFrozen(uploadFixture), "media upload fixture must be frozen");
  const descriptors = Object.getOwnPropertyDescriptors(uploadFixture);
  invariant(
    Object.values(descriptors).every(
      (descriptor) =>
        Object.hasOwn(descriptor, "value") &&
        descriptor.enumerable === true &&
        descriptor.configurable === false &&
        descriptor.writable === false
    ),
    "media upload fixture must contain frozen data properties"
  );
  invariant(
    uploadFixture.encoding === "base64" &&
      typeof uploadFixture.data === "string" &&
      uploadFixture.data.length > 0 &&
      uploadFixture.decodedSizeBytes === 68 &&
      uploadFixture.sha256 === TASK540_MEDIA_UPLOAD_SHA256,
    "media upload fixture authority drift"
  );
  const bytes = Buffer.from(uploadFixture.data, "base64");
  invariant(
    bytes.toString("base64") === uploadFixture.data,
    "media upload fixture base64 is not canonical"
  );
  invariant(bytes.length === 68, "media upload fixture decoded size drift");
  invariant(
    bytes.subarray(0, 8).toString("hex") === TASK540_PNG_SIGNATURE_HEX,
    "media upload fixture PNG signature drift"
  );
  invariant(hashBytes(bytes) === uploadFixture.sha256, "media upload fixture SHA-256 drift");
  return bytes;
}

function createMediaOperationsRuntime({
  adminApiRequest,
  assertRecordIdentity,
  bootstrapApiSession,
  captureCanonicalMediaStorageOwnership,
  runtimeSafeProjection,
}) {
  async function sendCanonicalMediaMultipart({ state, multipart }) {
    return adminApiRequest(state, bootstrapApiSession(state), "POST", "/media", { multipart });
  }

  async function runtimeUploadMedia(
    { state, plan, action },
    mediaMultipartSink,
    uploadFixtureAuthority
  ) {
    const media = plan.fixtureBlueprint.media;
    invariant(
      media.uploadFixture === uploadFixtureAuthority,
      "media upload fixture identity authority drift"
    );
    const bytes = decodeCanonicalMediaUploadFixtureExact(uploadFixtureAuthority);
    invariant(state.responseLostIntents.has(action.id), "media upload lacks its pre-write intent");
    invariant(typeof mediaMultipartSink === "function", "media multipart sink is invalid");
    const multipart = {
      file: { name: media.originalName, mimeType: media.mimeType, buffer: bytes },
      title: media.title,
    };
    const response = await mediaMultipartSink({ state, multipart });
    invariant(
      /^[0-9a-f-]{36}$/u.test(response.value.id) &&
        typeof response.value.key === "string" &&
        typeof response.value.url === "string" &&
        response.value.mimeType === media.mimeType &&
        response.value.size === bytes.length,
      "media upload response drift"
    );
    const resolvedUrl = new URL(response.value.url, plan.fixtureBlueprint.origins.admin).href;
    state.mediaRecord = response.value;
    return runtimeSafeProjection(
      { id: response.value.id, key: response.value.key, resolvedUrl },
      {
        "media.id": response.value.id,
        "media.resolved-url": resolvedUrl,
        "media.storage-key": response.value.key,
      }
    );
  }

  async function runtimeProveMedia({ state, captures }) {
    const id = captures.get("media.id");
    const response = await adminApiRequest(
      state,
      bootstrapApiSession(state),
      "GET",
      "/media/" + encodeURIComponent(id),
      { csrf: false, retainAuthoritativeBytes: true }
    );
    assertRecordIdentity(
      response.value,
      {
        id,
        key: captures.get("media.storage-key"),
        mimeType: state.mediaRecord.mimeType,
        size: state.mediaRecord.size,
      },
      "media proof"
    );
    invariant(
      response.value.createdBy === null || typeof response.value.createdBy === "string",
      "media owner drift"
    );
    state.resourceOwners.set("media", response.value.createdBy ?? null);
    invariant(
      typeof response.value.url === "string" &&
        response.value.url === "/media/" + response.value.key &&
        !response.value.url.includes("?") &&
        !response.value.url.includes("#"),
      "media canonical safe URL drift"
    );
    await captureCanonicalMediaStorageOwnership(state, response.value.key);
    state.mediaCanonicalSafeUrl = response.value.url;
    state.mediaRaceAdminEvidence.media = response.authoritativeBytes;
    return runtimeSafeProjection({
      id,
      key: response.value.key,
      url: response.value.url,
      size: response.value.size,
    });
  }

  return Object.freeze({
    runtimeProveMedia,
    runtimeUploadMedia,
    sendCanonicalMediaMultipart,
  });
}

export {
  TASK540_MEDIA_UPLOAD_SHA256,
  TASK540_PNG_SIGNATURE_HEX,
  createMediaOperationsRuntime,
  decodeCanonicalMediaUploadFixtureExact,
};
