import {
  canonicalJson,
  deepFreezeExact,
  exactOwnKeys,
  hashBytes,
  invariant,
} from "../foundation.mjs";
import { deepEqualJson } from "../resource-contracts.mjs";

export async function runMediaUploadSelfTest({
  TASK540_MEDIA_UPLOAD_SHA256,
  TASK540_PNG_SIGNATURE_HEX,
  buildRuntimeOperationHandlers,
  decodeCanonicalMediaUploadFixtureExact,
  expectAsyncFailure,
  plan,
  sourceCaptures,
}) {
  const mediaUploadAction = plan.actionManifest.find(({ id }) => id === "set-030-media-upload");
  invariant(
    mediaUploadAction?.executable.type === "runtime-operation" &&
      mediaUploadAction.executable.operationId === "runtime/set-030-media-upload",
    "media upload runtime registry action drift"
  );
  const mediaUploadOperationId = mediaUploadAction.executable.operationId;
  const mediaBlueprint = plan.fixtureBlueprint.media;
  const canonicalUploadBytes = decodeCanonicalMediaUploadFixtureExact(mediaBlueprint.uploadFixture);
  invariant(
    canonicalUploadBytes.length === 68 &&
      canonicalUploadBytes.subarray(0, 8).toString("hex") === TASK540_PNG_SIGNATURE_HEX &&
      hashBytes(canonicalUploadBytes) === TASK540_MEDIA_UPLOAD_SHA256,
    "canonical media upload helper drift"
  );
  const fakeMediaResponse = {
    id: sourceCaptures.get("media.id"),
    key: sourceCaptures.get("media.storage-key"),
    url: new URL(sourceCaptures.get("media.resolved-url")).pathname,
    mimeType: mediaBlueprint.mimeType,
    size: mediaBlueprint.uploadFixture.decodedSizeBytes,
  };
  const makeMediaUploadState = () => {
    let forbiddenReads = 0;
    const target = {
      responseLostIntents: new Map([[mediaUploadAction.id, true]]),
      mediaRecord: null,
    };
    const forbidden = new Set([
      "fixturePath",
      "generatedBytes",
      "callerBytes",
      "environmentBytes",
      "capturedBytes",
      "env",
    ]);
    return {
      state: new Proxy(target, {
        get(value, key, receiver) {
          if (forbidden.has(key)) {
            forbiddenReads += 1;
            throw new Error("forbidden media byte authority read");
          }
          return Reflect.get(value, key, receiver);
        },
      }),
      target,
      forbiddenReadCount: () => forbiddenReads,
    };
  };
  const dispatchMediaUploadOnce = async (registry, context, dispatched) => {
    invariant(dispatched instanceof Set, "media upload dispatch ledger drift");
    invariant(!dispatched.has(mediaUploadOperationId), "duplicate media upload dispatch");
    const handler = registry?.[mediaUploadOperationId];
    invariant(typeof handler === "function", "media upload registry handler is absent");
    dispatched.add(mediaUploadOperationId);
    return handler(context);
  };
  const canonicalUploadState = makeMediaUploadState();
  let fakeMultipartCalls = 0;
  const fakeMediaMultipartSink = async (input) => {
    fakeMultipartCalls += 1;
    exactOwnKeys(input, ["state", "multipart"], "fake media multipart input", {
      plain: true,
    });
    invariant(input.state === canonicalUploadState.state, "fake media multipart state drift");
    exactOwnKeys(input.multipart, ["file", "title"], "fake media multipart", {
      plain: true,
    });
    exactOwnKeys(
      input.multipart.file,
      ["name", "mimeType", "buffer"],
      "fake media multipart file",
      { plain: true }
    );
    const received = input.multipart.file.buffer;
    invariant(
      Buffer.isBuffer(received) &&
        received.length === 68 &&
        received.subarray(0, 8).toString("hex") === TASK540_PNG_SIGNATURE_HEX &&
        hashBytes(received) === TASK540_MEDIA_UPLOAD_SHA256 &&
        received.toString("base64") === mediaBlueprint.uploadFixture.data &&
        input.multipart.file.name === mediaBlueprint.originalName &&
        input.multipart.file.mimeType === mediaBlueprint.mimeType &&
        input.multipart.title === mediaBlueprint.title,
      "fake media multipart payload drift"
    );
    return { value: fakeMediaResponse };
  };
  const mediaRuntimeRegistry = buildRuntimeOperationHandlers(plan, {
    mediaMultipartSink: fakeMediaMultipartSink,
  });
  invariant(
    Object.keys(mediaRuntimeRegistry).filter((key) => key === mediaUploadOperationId).length === 1,
    "media upload registry key cardinality drift"
  );
  const canonicalDispatchLedger = new Set();
  const mediaUploadResult = await dispatchMediaUploadOnce(
    mediaRuntimeRegistry,
    {
      state: canonicalUploadState.state,
      plan,
      action: mediaUploadAction,
      executable: mediaUploadAction.executable,
      captures: sourceCaptures,
    },
    canonicalDispatchLedger
  );
  const expectedResolvedMediaUrl = new URL(
    fakeMediaResponse.url,
    plan.fixtureBlueprint.origins.admin
  ).href;
  invariant(
    fakeMultipartCalls === 1 &&
      canonicalDispatchLedger.size === 1 &&
      canonicalUploadState.forbiddenReadCount() === 0 &&
      canonicalUploadState.target.mediaRecord === fakeMediaResponse &&
      deepEqualJson(mediaUploadResult.captureBindings, {
        "media.id": fakeMediaResponse.id,
        "media.resolved-url": expectedResolvedMediaUrl,
        "media.storage-key": fakeMediaResponse.key,
      }) &&
      mediaUploadResult.observationSha256 ===
        hashBytes(
          Buffer.from(
            canonicalJson({
              id: fakeMediaResponse.id,
              key: fakeMediaResponse.key,
              resolvedUrl: expectedResolvedMediaUrl,
            })
          )
        ),
    "media upload registry dispatch proof drift"
  );
  await expectAsyncFailure(
    async () =>
      dispatchMediaUploadOnce(
        mediaRuntimeRegistry,
        {
          state: canonicalUploadState.state,
          plan,
          action: mediaUploadAction,
          executable: mediaUploadAction.executable,
          captures: sourceCaptures,
        },
        canonicalDispatchLedger
      ),
    "duplicate media upload registry dispatch"
  );
  await expectAsyncFailure(
    async () =>
      dispatchMediaUploadOnce(
        {},
        {
          state: makeMediaUploadState().state,
          plan,
          action: mediaUploadAction,
          executable: mediaUploadAction.executable,
          captures: sourceCaptures,
        },
        new Set()
      ),
    "missing media upload registry handler"
  );
  await expectAsyncFailure(
    async () => buildRuntimeOperationHandlers(plan, { mediaMultipartSink: null }),
    "invalid media multipart dependency"
  );
  await expectAsyncFailure(
    async () =>
      buildRuntimeOperationHandlers(plan, {
        mediaMultipartSink: fakeMediaMultipartSink,
        unknown: true,
      }),
    "unknown media multipart dependency"
  );

  for (const [label, authorityKey] of [
    ["path media authority trap", "fixturePath"],
    ["generated media authority trap", "generatedBytes"],
    ["caller media authority trap", "callerBytes"],
    ["environment media authority trap", "environmentBytes"],
    ["captured media authority trap", "capturedBytes"],
  ]) {
    let alternateSinkCalls = 0;
    const canonicalRegistry = buildRuntimeOperationHandlers(plan, {
      mediaMultipartSink: async () => {
        alternateSinkCalls += 1;
        return { value: fakeMediaResponse };
      },
    });
    const trapState = makeMediaUploadState();
    const mutantRegistry = Object.freeze({
      ...canonicalRegistry,
      [mediaUploadOperationId]: async (context) => {
        void context.state[authorityKey];
        return canonicalRegistry[mediaUploadOperationId](context);
      },
    });
    await expectAsyncFailure(
      async () =>
        dispatchMediaUploadOnce(
          mutantRegistry,
          {
            state: trapState.state,
            plan,
            action: mediaUploadAction,
            executable: mediaUploadAction.executable,
            captures: sourceCaptures,
          },
          new Set()
        ),
      label
    );
    invariant(
      trapState.forbiddenReadCount() === 1 && alternateSinkCalls === 0,
      label + " did not fail before the multipart sink"
    );
  }

  const canonicalFixture = mediaBlueprint.uploadFixture;
  const canonicalFixtureBytes = Buffer.from(canonicalFixture.data, "base64");
  const alteredFixtureBytes = Buffer.from(canonicalFixtureBytes);
  alteredFixtureBytes[alteredFixtureBytes.length - 1] ^= 0x01;
  const alteredSignatureBytes = Buffer.from(canonicalFixtureBytes);
  alteredSignatureBytes[0] ^= 0x01;
  const frozenFixture = (changes = {}, extras = {}) =>
    deepFreezeExact({ ...canonicalFixture, ...changes, ...extras });
  const mediaFixtureMutants = [
    ["cloned media fixture authority", frozenFixture(), false],
    ["altered media bytes", frozenFixture({ data: alteredFixtureBytes.toString("base64") }), true],
    ["noncanonical media base64", frozenFixture({ data: canonicalFixture.data + "=" }), true],
    ["altered media decoded size", frozenFixture({ decodedSizeBytes: 67 }), true],
    ["altered media digest", frozenFixture({ sha256: "0".repeat(64) }), true],
    ["altered media encoding", frozenFixture({ encoding: "hex" }), true],
    [
      "altered media PNG signature",
      frozenFixture({ data: alteredSignatureBytes.toString("base64") }),
      true,
    ],
    ["media fixture path authority", frozenFixture({}, { path: "fixture.png" }), true],
    ["generated media byte authority", frozenFixture({}, { generatedBytes: "generated" }), true],
    ["caller media byte authority", frozenFixture({}, { callerBytes: "caller" }), true],
    ["environment media byte authority", frozenFixture({}, { environmentBytes: "env" }), true],
    ["mutable media fixture authority", { ...canonicalFixture }, true],
  ];
  for (const [label, uploadFixture, helperMustReject] of mediaFixtureMutants) {
    if (helperMustReject) {
      await expectAsyncFailure(
        async () => decodeCanonicalMediaUploadFixtureExact(uploadFixture),
        label + " helper"
      );
    } else {
      invariant(
        decodeCanonicalMediaUploadFixtureExact(uploadFixture).length === 68,
        label + " helper value drift"
      );
    }
    let rejectedSinkCalls = 0;
    const rejectingRegistry = buildRuntimeOperationHandlers(plan, {
      mediaMultipartSink: async () => {
        rejectedSinkCalls += 1;
        return { value: fakeMediaResponse };
      },
    });
    const mutantState = makeMediaUploadState();
    const mutantPlan = {
      fixtureBlueprint: {
        media: { ...mediaBlueprint, uploadFixture },
        origins: plan.fixtureBlueprint.origins,
      },
    };
    await expectAsyncFailure(
      async () =>
        dispatchMediaUploadOnce(
          rejectingRegistry,
          {
            state: mutantState.state,
            plan: mutantPlan,
            action: mediaUploadAction,
            executable: mediaUploadAction.executable,
            captures: sourceCaptures,
          },
          new Set()
        ),
      label
    );
    invariant(rejectedSinkCalls === 0, label + " reached the multipart sink");
  }
}
