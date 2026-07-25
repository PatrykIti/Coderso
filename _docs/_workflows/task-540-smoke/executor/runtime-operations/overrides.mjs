// Override and preference runtime operations for the TASK-540 smoke executor.
//
// Owns the presentation-override replace and proof operations, the intentional
// presentation-override absence authority (observation staging, receipt staging, ledger
// commit and completion), the media-race authoritative Admin evidence parser and the
// per-user preference, unsafe-binding and baseline-reset runtime operations.
import { MAX_STREAM_BYTES } from "../config.mjs";
import {
  canonicalJson,
  deepFreezeExact,
  exactOwnKeys,
  hashBytes,
  invariant,
} from "../foundation.mjs";
import { assertPlainJsonValue } from "../json-schema.mjs";
import { decodeBoundedUtf8 } from "../output-parser.mjs";
import {
  INTENTIONAL_PRESENTATION_OVERRIDE_ABSENCE_ACTIONS,
  RUNTIME_RECEIPT_KEYS,
  deepEqualJson,
} from "../resource-contracts.mjs";
import { assertRecordIdentity, runtimeSafeProjection } from "./platform.mjs";

export function createOverrideRuntimeOperations(dependencies) {
  // The admin API request authority, the bootstrap API session accessor and the Bun bridge
  // operation runner all belong to authorities the facade composes, so they arrive as injected
  // dependencies and every operation below closes over those exact values instead of a
  // rebindable module slot.
  exactOwnKeys(
    dependencies,
    ["adminApiRequest", "bootstrapApiSession", "runBunBridgeOperation"],
    "override runtime operation dependencies",
    { plain: true }
  );
  invariant(
    Object.values(dependencies).every((dependency) => typeof dependency === "function"),
    "override runtime operation dependencies are not callable"
  );
  const { adminApiRequest, bootstrapApiSession, runBunBridgeOperation } = dependencies;

  async function runtimeReplaceOverrides({ state, plan, action, captures }, empty) {
    const screenId = captures.get("screen.id");
    const entryId = captures.get("entry.id");
    const overrides = empty
      ? []
      : [
          {
            blockId: plan.fixtureBlueprint.screen.blockIds.raceImage,
            propPath: "mediaAssetId",
            value: captures.get("media.id"),
          },
        ];
    if (!empty && action.id === "set-039-override-create") {
      const intent = state.responseLostIntents.get(action.id);
      invariant(
        intent !== undefined &&
          deepEqualJson(intent.authoredProjection, {
            screenId,
            entryId,
            blockId: plan.fixtureBlueprint.screen.blockIds.raceImage,
            propPath: "mediaAssetId",
            value: captures.get("media.id"),
            updatedBy: state.bootstrapBaseline.id,
          }),
        "override prepared request drift"
      );
    }
    const response = await adminApiRequest(
      state,
      bootstrapApiSession(state),
      "PATCH",
      "/custom-screens/" +
        encodeURIComponent(screenId) +
        "/entries/" +
        encodeURIComponent(entryId) +
        "/overrides",
      {
        json: { overrides },
        retainAuthoritativeBytes:
          action.id === INTENTIONAL_PRESENTATION_OVERRIDE_ABSENCE_ACTIONS.reset,
      }
    );
    invariant(
      deepEqualJson(
        response.value?.overrides?.map(({ blockId, propPath, value }) => ({
          blockId,
          propPath,
          value,
        })),
        overrides
      ),
      "override write drift"
    );
    if (action.id === INTENTIONAL_PRESENTATION_OVERRIDE_ABSENCE_ACTIONS.reset) {
      stageIntentionalPresentationOverrideObservation(
        state,
        action,
        captures,
        response.authoritativeBytes
      );
    }
    state.expectedOverrides = overrides;
    return runtimeSafeProjection({ count: overrides.length });
  }

  function parseMediaRaceAuthoritativeAdminEvidence(state) {
    const sources = state.mediaRaceAdminEvidence;
    const ordered = [
      sources.screen,
      sources.entry,
      sources.media,
      sources.override,
      sources.retryOverride,
    ];
    invariant(
      ordered.every(
        (bytes) => Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= MAX_STREAM_BYTES
      ),
      "media-race authoritative Admin byte set is incomplete"
    );
    const values = ordered.map((bytes, index) => {
      let value;
      try {
        value = JSON.parse(decodeBoundedUtf8(bytes, "media-race Admin response " + index));
      } catch {
        invariant(false, "media-race authoritative Admin response is unparseable");
      }
      assertPlainJsonValue(value, "media-race authoritative Admin response");
      return value;
    });
    const [screen, entry, media, overrideResponse, retryOverrideResponse] = values;
    const blockId = state.plan.fixtureBlueprint.screen.blockIds.raceImage;
    const blocks = [];
    const visit = (block) => {
      blocks.push(block);
      for (const slot of Object.values(block.slots ?? {})) for (const child of slot) visit(child);
    };
    for (const section of screen.definition.editorView.document.sections) {
      for (const block of section.blocks) visit(block);
    }
    const imageBlocks = blocks.filter((block) => block.id === blockId && block.type === "image");
    const bindings = screen.definition.editorView.bindings.filter(
      (binding) =>
        binding.blockId === blockId &&
        binding.propPath === "src" &&
        binding.source === "entry" &&
        binding.mode === "read"
    );
    const overrideRows = overrideResponse.overrides;
    const screenId = state.currentCaptures.get("screen.id");
    const retryScreenId = state.currentCaptures.get("retry-screen.id");
    const entryId = state.currentCaptures.get("entry.id");
    const mediaId = state.currentCaptures.get("media.id");
    invariant(
      imageBlocks.length === 1 &&
        bindings.length === 1 &&
        Array.isArray(overrideRows) &&
        overrideRows.length === 1 &&
        Array.isArray(retryOverrideResponse.overrides) &&
        retryOverrideResponse.overrides.length === 0 &&
        screen.id === screenId &&
        entry.id === entryId &&
        media.id === mediaId &&
        retryScreenId !== screenId &&
        bindings[0].field === "raceImageId" &&
        overrideRows[0].screenId === screenId &&
        overrideRows[0].entryId === entryId &&
        overrideRows[0].blockId === blockId &&
        overrideRows[0].propPath === "mediaAssetId" &&
        overrideRows[0].value === mediaId,
      "media-race authoritative Admin cardinality drift"
    );
    const projection = deepFreezeExact({
      bindingCount: bindings.length,
      overrideCount: overrideRows.length,
      entryValueMatches:
        entry.data?.[bindings[0].field] === state.plan.fixtureBlueprint.media.missingBoundMediaId,
      safeUrlMatches:
        media.id === state.mediaRecord.id &&
        media.url === state.mediaCanonicalSafeUrl &&
        media.url === "/media/" + media.key,
    });
    exactOwnKeys(
      projection,
      ["bindingCount", "overrideCount", "entryValueMatches", "safeUrlMatches"],
      "media-race authoritative projection",
      { plain: true }
    );
    invariant(
      deepEqualJson(projection, {
        bindingCount: 1,
        overrideCount: 1,
        entryValueMatches: true,
        safeUrlMatches: true,
      }),
      "media-race authoritative projection drift"
    );
    const frames = [];
    for (const bytes of ordered) {
      const length = Buffer.alloc(4);
      length.writeUInt32BE(bytes.length);
      frames.push(length, bytes);
    }
    const authoritativeBytes = Buffer.concat(frames);
    const evidenceSha256 = hashBytes(authoritativeBytes);
    invariant(
      evidenceSha256 !== hashBytes(Buffer.from(canonicalJson(projection))),
      "media-race evidence hash used the sanitized summary"
    );
    return deepFreezeExact({ evidenceSha256, projection });
  }

  function exactPresentationOverrideIdentifier(state, captures) {
    return deepFreezeExact([
      captures.get("screen.id"),
      captures.get("entry.id"),
      state.plan.fixtureBlueprint.screen.blockIds.raceImage,
      "mediaAssetId",
    ]);
  }

  function stageIntentionalPresentationOverrideObservation(
    state,
    action,
    captures,
    authoritativeBytes,
    ownerSubjectIdentifier = null
  ) {
    if (!Object.values(INTENTIONAL_PRESENTATION_OVERRIDE_ABSENCE_ACTIONS).includes(action.id)) return;
    invariant(
      Buffer.isBuffer(authoritativeBytes) &&
        authoritativeBytes.length > 0 &&
        authoritativeBytes.length <= MAX_STREAM_BYTES &&
        (ownerSubjectIdentifier === null || typeof ownerSubjectIdentifier === "string") &&
        !state.intentionalPresentationOverrideObservations.has(action.id),
      action.id + " intentional override observation drift"
    );
    state.intentionalPresentationOverrideObservations.set(
      action.id,
      deepFreezeExact({
        actionId: action.id,
        identifier: exactPresentationOverrideIdentifier(state, captures),
        ownerSubjectIdentifier,
        responseSha256: hashBytes(authoritativeBytes),
      })
    );
  }

  function stageIntentionalPresentationOverrideActionReceipt(state, action, receipt) {
    if (!Object.values(INTENTIONAL_PRESENTATION_OVERRIDE_ABSENCE_ACTIONS).includes(action.id)) return;
    const observation = state.intentionalPresentationOverrideObservations.get(action.id);
    exactOwnKeys(receipt, RUNTIME_RECEIPT_KEYS, action.id + " intentional override receipt", {
      plain: true,
    });
    invariant(
      observation !== undefined &&
        receipt.status === 0 &&
        Number.isSafeInteger(receipt.sequence) &&
        receipt.sequence > 0 &&
        typeof receipt.evidenceSha256 === "string" &&
        /^[a-f0-9]{64}$/u.test(receipt.evidenceSha256) &&
        !state.pendingIntentionalPresentationOverrideReceipts.has(action.id),
      action.id + " intentional override receipt staging drift"
    );
    state.pendingIntentionalPresentationOverrideReceipts.set(
      action.id,
      deepFreezeExact({
        ...observation,
        actionOrdinal: action.ordinal,
        receiptEvidenceSha256: receipt.evidenceSha256,
        receiptSequence: receipt.sequence,
      })
    );
  }

  function commitIntentionalPresentationOverrideActionAfterLedgerAppend(state, action, delta) {
    if (!Object.values(INTENTIONAL_PRESENTATION_OVERRIDE_ABSENCE_ACTIONS).includes(action.id)) return;
    const staged = state.pendingIntentionalPresentationOverrideReceipts.get(action.id);
    invariant(staged !== undefined, action.id + " intentional override receipt is not staged");
    state.pendingIntentionalPresentationOverrideReceipts.delete(action.id);
    const actions = INTENTIONAL_PRESENTATION_OVERRIDE_ABSENCE_ACTIONS;
    if (action.id === actions.acquisition) {
      const cores = delta.cores.filter(({ kind }) => kind === "presentation-override");
      invariant(
        state.intentionalPresentationOverrideAuthority === null &&
          delta.cores.length === 1 &&
          cores.length === 1 &&
          deepEqualJson(cores[0].identifier, staged.identifier) &&
          cores[0].ownerSubjectIdentifier === staged.ownerSubjectIdentifier &&
          state.resourceKeys.get("presentation-override") === cores[0].resourceKey,
        "intentional override acquisition authority drift"
      );
      state.intentionalPresentationOverrideAuthority = deepFreezeExact({
        acquisition: deepFreezeExact({ ...staged, resourceKey: cores[0].resourceKey }),
        proof: null,
        reset: null,
      });
      return;
    }
    invariant(delta.cores.length === 0, action.id + " unexpectedly acquired a resource");
    const current = state.intentionalPresentationOverrideAuthority;
    invariant(
      current !== null &&
        deepEqualJson(current.acquisition.identifier, staged.identifier) &&
        current.acquisition.receiptSequence < staged.receiptSequence,
      action.id + " intentional override authority lineage drift"
    );
    if (action.id === actions.reset) {
      invariant(
        current.reset === null && current.proof === null,
        "override reset authority repeated"
      );
      state.intentionalPresentationOverrideAuthority = deepFreezeExact({
        acquisition: current.acquisition,
        proof: null,
        reset: staged,
      });
      return;
    }
    invariant(
      action.id === actions.proof &&
        current.reset !== null &&
        current.proof === null &&
        current.reset.receiptSequence < staged.receiptSequence,
      "override absence proof authority order drift"
    );
    state.intentionalPresentationOverrideAuthority = deepFreezeExact({
      acquisition: current.acquisition,
      proof: staged,
      reset: current.reset,
    });
  }

  function completeIntentionalPresentationOverrideAbsenceAuthority(state, record = null) {
    const authority = state.intentionalPresentationOverrideAuthority;
    if (authority === null || authority.reset === null || authority.proof === null) return null;
    exactOwnKeys(
      authority,
      ["acquisition", "proof", "reset"],
      "intentional presentation override absence authority",
      { plain: true }
    );
    const actions = INTENTIONAL_PRESENTATION_OVERRIDE_ABSENCE_ACTIONS;
    invariant(
      authority.acquisition.actionId === actions.acquisition &&
        authority.reset.actionId === actions.reset &&
        authority.proof.actionId === actions.proof &&
        deepEqualJson(authority.acquisition.identifier, authority.reset.identifier) &&
        deepEqualJson(authority.reset.identifier, authority.proof.identifier) &&
        authority.acquisition.receiptSequence < authority.reset.receiptSequence &&
        authority.reset.receiptSequence < authority.proof.receiptSequence &&
        authority.acquisition.resourceKey === state.resourceKeys.get("presentation-override") &&
        [authority.acquisition, authority.reset, authority.proof].every(
          ({ receiptEvidenceSha256, responseSha256 }) =>
            /^[a-f0-9]{64}$/u.test(receiptEvidenceSha256) && /^[a-f0-9]{64}$/u.test(responseSha256)
        ),
      "intentional presentation override absence authority is incomplete"
    );
    if (record !== null) {
      invariant(
        record.kind === "presentation-override" &&
          record.resourceKey === authority.acquisition.resourceKey &&
          deepEqualJson(record.identifier, authority.acquisition.identifier) &&
          record.ownerSubjectIdentifier === authority.acquisition.ownerSubjectIdentifier,
        "intentional presentation override cleanup record drift"
      );
    }
    return authority;
  }

  async function runtimeProveOverrides({ state, action, captures }, empty) {
    const response = await adminApiRequest(
      state,
      bootstrapApiSession(state),
      "GET",
      "/custom-screens/" +
        encodeURIComponent(captures.get("screen.id")) +
        "/entries/" +
        encodeURIComponent(captures.get("entry.id")) +
        "/overrides",
      {
        csrf: false,
        retainAuthoritativeBytes:
          !empty || action.id === INTENTIONAL_PRESENTATION_OVERRIDE_ABSENCE_ACTIONS.proof,
      }
    );
    const overrideRows = response.value?.overrides;
    const overrides = overrideRows?.map(({ blockId, propPath, value }) => ({
      blockId,
      propPath,
      value,
    }));
    invariant(
      Array.isArray(overrides) &&
        (empty ? overrides.length === 0 : deepEqualJson(overrides, state.expectedOverrides)),
      "override proof drift"
    );
    if (!empty) {
      invariant(
        Buffer.isBuffer(response.authoritativeBytes) && response.authoritativeBytes.length > 0,
        "override authoritative bytes are absent"
      );
      invariant(overrideRows.length === 1, "media-race override cardinality drift");
      const row = overrideRows[0];
      invariant(row.updatedBy === null || typeof row.updatedBy === "string", "override owner drift");
      state.resourceOwners.set("presentation-override", row.updatedBy ?? null);
      stageIntentionalPresentationOverrideObservation(
        state,
        action,
        captures,
        response.authoritativeBytes,
        row.updatedBy ?? null
      );
      const retryResponse = await adminApiRequest(
        state,
        bootstrapApiSession(state),
        "GET",
        "/custom-screens/" +
          encodeURIComponent(captures.get("retry-screen.id")) +
          "/entries/" +
          encodeURIComponent(captures.get("entry.id")) +
          "/overrides",
        { csrf: false, retainAuthoritativeBytes: true }
      );
      invariant(
        Array.isArray(retryResponse.value?.overrides) && retryResponse.value.overrides.length === 0,
        "retry Screen unexpectedly owns an override"
      );
      state.mediaRaceAdminEvidence.override = response.authoritativeBytes;
      state.mediaRaceAdminEvidence.retryOverride = retryResponse.authoritativeBytes;
      const blockId = state.plan.fixtureBlueprint.screen.blockIds.raceImage;
      const sections = state.screenBodies.main.definition.editorView.document.sections;
      const blocks = [];
      const visit = (block) => {
        blocks.push(block);
        for (const slot of Object.values(block.slots ?? {})) for (const child of slot) visit(child);
      };
      for (const section of sections) for (const block of section.blocks) visit(block);
      const matchingBlocks = blocks.filter((block) => block.id === blockId && block.type === "image");
      invariant(matchingBlocks.length === 1, "media-race image block cardinality drift");
      const bindings = state.screenBodies.main.definition.editorView.bindings.filter(
        (binding) =>
          binding.blockId === blockId &&
          binding.propPath === "src" &&
          binding.source === "entry" &&
          binding.mode === "read"
      );
      invariant(
        bindings.length === 1 && typeof bindings[0].field === "string",
        "media-race src binding cardinality drift"
      );
      const boundField = bindings[0].field;
      const missingBoundMediaId = state.plan.fixtureBlueprint.media.missingBoundMediaId;
      invariant(
        state.editableEntryBody.data[boundField] === missingBoundMediaId,
        "media-race entry value drift"
      );
      invariant(
        typeof state.mediaCanonicalSafeUrl === "string" &&
          state.mediaCanonicalSafeUrl === state.mediaRecord.url &&
          state.mediaCanonicalSafeUrl === "/media/" + state.mediaRecord.key,
        "media-race safe URL provenance drift"
      );
      const projection = deepFreezeExact({
        acquiredMedia: deepFreezeExact({
          id: captures.get("media.id"),
          canonicalSafeUrl: state.mediaCanonicalSafeUrl,
        }),
        missingBoundMediaId,
        screenId: captures.get("screen.id"),
        entryId: captures.get("entry.id"),
        directImageBlockId: blockId,
        boundField,
        override: deepFreezeExact({
          screenId: captures.get("screen.id"),
          entryId: captures.get("entry.id"),
          blockId,
          propPath: "mediaAssetId",
          mediaId: captures.get("media.id"),
        }),
      });
      invariant(
        projection.acquiredMedia.id !== projection.missingBoundMediaId,
        "media-race IDs are not distinct"
      );
      invariant(
        captures.get("retry-screen.id") !== projection.screenId,
        "retry Screen substituted the main Screen"
      );
      const authoritative = parseMediaRaceAuthoritativeAdminEvidence(state);
      state.mediaRaceProjection = projection;
      state.mediaRaceReceiptHash = authoritative.evidenceSha256;
    } else if (action.id === INTENTIONAL_PRESENTATION_OVERRIDE_ABSENCE_ACTIONS.proof) {
      stageIntentionalPresentationOverrideObservation(
        state,
        action,
        captures,
        response.authoritativeBytes
      );
    }
    return runtimeSafeProjection({ count: overrides.length });
  }

  async function runtimeSetPreference({ state, action }, key, showFieldMetadata, operationId) {
    const userId = state.ids[key === "a" ? "userA" : "userB"];
    invariant(state.responseLostIntents.has(action.id), "setting write lacks its pre-write intent");
    const result = await runBunBridgeOperation(state, operationId, { showFieldMetadata, userId });
    invariant(result.ok === true, "preference write failed");
    return runtimeSafeProjection({ key, showFieldMetadata });
  }

  async function runtimeProvePreference({ state }, key, expected, operationId) {
    const userId = state.ids[key === "a" ? "userA" : "userB"];
    const result = await runBunBridgeOperation(state, operationId, { userId });
    invariant(result.showFieldMetadata === expected, "preference proof drift");
    return runtimeSafeProjection({ key, showFieldMetadata: result.showFieldMetadata });
  }

  async function runtimePatchUnsafeBinding({ state, captures }) {
    const screenId = captures.get("screen.id");
    const current = await adminApiRequest(
      state,
      bootstrapApiSession(state),
      "GET",
      "/custom-screens/" + encodeURIComponent(screenId),
      { csrf: false }
    );
    const buttonId = captures.get("palette.button");
    let changed = 0;
    const definition = structuredClone(current.value.definition);
    definition.editorView.bindings = definition.editorView.bindings.map((binding) => {
      if (binding.blockId === buttonId && binding.propPath === "href") {
        changed += 1;
        return { ...binding, field: "secondaryUrl" };
      }
      return binding;
    });
    invariant(changed === 1, "unsafe button binding target drift");
    const response = await adminApiRequest(
      state,
      bootstrapApiSession(state),
      "PATCH",
      "/custom-screens/" + encodeURIComponent(screenId),
      { json: { schemaVersion: 4, definition } }
    );
    state.latestUnsafeDefinition = response.value.definition;
    return runtimeSafeProjection({ changed });
  }

  async function runtimeProveUnsafeBinding({ state, captures }) {
    const response = await adminApiRequest(
      state,
      bootstrapApiSession(state),
      "GET",
      "/custom-screens/" + encodeURIComponent(captures.get("screen.id")),
      { csrf: false }
    );
    const buttonId = captures.get("palette.button");
    const bindings = response.value.definition.editorView.bindings.filter(
      (binding) => binding.blockId === buttonId && binding.propPath === "href"
    );
    invariant(
      bindings.length === 1 && bindings[0].field === "secondaryUrl",
      "unsafe binding proof drift"
    );
    return runtimeSafeProjection({ bindingCount: 1, field: "secondaryUrl" });
  }

  async function runtimeResetScreen({ state, captures }) {
    const id = captures.get("screen.id");
    const definition = state.screenBodies.main.definition;
    const response = await adminApiRequest(
      state,
      bootstrapApiSession(state),
      "PATCH",
      "/custom-screens/" + encodeURIComponent(id),
      { json: { schemaVersion: 4, definition } }
    );
    invariant(deepEqualJson(response.value.definition, definition), "Screen baseline reset drift");
    return runtimeSafeProjection({ reset: true });
  }

  async function runtimeProveScreenBaseline({ state, captures }) {
    const id = captures.get("screen.id");
    const response = await adminApiRequest(
      state,
      bootstrapApiSession(state),
      "GET",
      "/custom-screens/" + encodeURIComponent(id),
      { csrf: false }
    );
    invariant(
      deepEqualJson(response.value.definition, state.screenBodies.main.definition),
      "Screen baseline proof drift"
    );
    return runtimeSafeProjection({ baseline: true });
  }

  async function runtimeResetEntry({ state, plan, captures }) {
    const id = captures.get("entry.id");
    const slug = plan.fixtureBlueprint.contentTypes.editable.slug;
    const response = await adminApiRequest(
      state,
      bootstrapApiSession(state),
      "PATCH",
      "/content/" + encodeURIComponent(slug) + "/entries/" + encodeURIComponent(id),
      { json: state.editableEntryBody }
    );
    assertRecordIdentity(response.value, { id, ...state.editableEntryBody }, "entry reset");
    return runtimeSafeProjection({ reset: true });
  }

  async function runtimeProveEntryBaseline({ state, plan, captures }) {
    const id = captures.get("entry.id");
    const slug = plan.fixtureBlueprint.contentTypes.editable.slug;
    const response = await adminApiRequest(
      state,
      bootstrapApiSession(state),
      "GET",
      "/content/" + encodeURIComponent(slug) + "/entries/" + encodeURIComponent(id),
      { csrf: false }
    );
    assertRecordIdentity(response.value, { id, ...state.editableEntryBody }, "entry baseline proof");
    return runtimeSafeProjection({ baseline: true });
  }

  async function runtimeUserAPreferenceRead({ state }, expected) {
    const session = state.sessions.get("user-a");
    invariant(session && session.userId === state.ids.userA, "user-A API session is unavailable");
    const response = await adminApiRequest(
      state,
      session,
      "GET",
      "/user-settings/customScreens.entry.preferences",
      { csrf: false }
    );
    exactOwnKeys(response.value, ["key", "value"], "isolated preference response", { plain: true });
    invariant(
      response.value.key === "customScreens.entry.preferences" &&
        response.value.value.version === 1 &&
        response.value.value.showFieldMetadata === expected,
      "isolated preference read drift"
    );
    return runtimeSafeProjection({ showFieldMetadata: expected });
  }

  async function runtimeUserAPreferenceFalse({ state }) {
    const session = state.sessions.get("user-a");
    const response = await adminApiRequest(
      state,
      session,
      "PATCH",
      "/user-settings/customScreens.entry.preferences",
      {
        expectedUserId: state.ids.userA,
        json: { value: { version: 1, showFieldMetadata: false } },
      }
    );
    invariant(response.value?.value?.showFieldMetadata === false, "isolated preference write drift");
    return runtimeSafeProjection({ showFieldMetadata: false });
  }

  return Object.freeze({
    commitIntentionalPresentationOverrideActionAfterLedgerAppend,
    completeIntentionalPresentationOverrideAbsenceAuthority,
    exactPresentationOverrideIdentifier,
    parseMediaRaceAuthoritativeAdminEvidence,
    runtimePatchUnsafeBinding,
    runtimeProveEntryBaseline,
    runtimeProveOverrides,
    runtimeProvePreference,
    runtimeProveScreenBaseline,
    runtimeProveUnsafeBinding,
    runtimeReplaceOverrides,
    runtimeResetEntry,
    runtimeResetScreen,
    runtimeSetPreference,
    runtimeUserAPreferenceFalse,
    runtimeUserAPreferenceRead,
    stageIntentionalPresentationOverrideActionReceipt,
    stageIntentionalPresentationOverrideObservation,
  });
}
