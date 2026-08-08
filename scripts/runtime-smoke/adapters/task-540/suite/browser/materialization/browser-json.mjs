import { invariant } from "../../shared/foundation.mjs";

function assertDenseJsonArray(value, label) {
  invariant(Array.isArray(value), label + " must be an array");
  invariant(Number.isSafeInteger(value.length) && value.length <= 10_000, label + " is too large");
  invariant(
    Reflect.ownKeys(value).every((key) => typeof key === "string"),
    label + " has symbol keys"
  );
  const ownNames = Object.getOwnPropertyNames(value);
  invariant(
    ownNames.length === value.length + 1 && ownNames.includes("length"),
    label + " has custom keys or holes"
  );
  for (let index = 0; index < value.length; index += 1) {
    invariant(Object.hasOwn(value, String(index)), label + " has an array hole");
  }
}

function assertPlainJsonValue(value, label, state = { seen: new WeakSet(), nodes: 0 }, depth = 0) {
  state.nodes += 1;
  invariant(state.nodes <= 100_000 && depth <= 64, label + " exceeds JSON bounds");
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    invariant(Number.isFinite(value), label + " contains a non-finite number");
    return;
  }
  invariant(typeof value === "object", label + " contains a non-JSON value");
  invariant(!state.seen.has(value), label + " contains a cycle");
  state.seen.add(value);
  if (Array.isArray(value)) {
    assertDenseJsonArray(value, label);
    for (let index = 0; index < value.length; index += 1) {
      assertPlainJsonValue(value[index], label + "[" + index + "]", state, depth + 1);
    }
  } else {
    invariant(
      Object.getPrototypeOf(value) === Object.prototype,
      label + " must contain only plain objects"
    );
    invariant(
      Reflect.ownKeys(value).every((key) => typeof key === "string"),
      label + " has symbol keys"
    );
    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      invariant(
        descriptor && Object.hasOwn(descriptor, "value") && descriptor.enumerable,
        label + " contains a non-data property"
      );
      assertPlainJsonValue(descriptor.value, label + "." + key, state, depth + 1);
    }
  }
  state.seen.delete(value);
}

function freezeJsonTreeExact(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) freezeJsonTreeExact(child, seen);
  return Object.freeze(value);
}

function changedJsonPointersExact(before, after) {
  const changed = [];
  const leaves = (value, pointer) => {
    if (value === null || typeof value !== "object" || Object.keys(value).length === 0) {
      return [pointer];
    }
    return Object.keys(value)
      .sort()
      .flatMap((key) =>
        leaves(value[key], pointer + "/" + key.replaceAll("~", "~0").replaceAll("/", "~1"))
      );
  };
  const visit = (left, right, pointer) => {
    if (JSON.stringify(left) === JSON.stringify(right)) return;
    const leftComposite = left !== null && typeof left === "object";
    const rightComposite = right !== null && typeof right === "object";
    if (!leftComposite || !rightComposite || Array.isArray(left) !== Array.isArray(right)) {
      changed.push(...leaves(left, pointer), ...leaves(right, pointer));
      return;
    }
    const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
    for (const key of keys) {
      const child = pointer + "/" + key.replaceAll("~", "~0").replaceAll("/", "~1");
      if (!Object.prototype.hasOwnProperty.call(left, key))
        changed.push(...leaves(right[key], child));
      else if (!Object.prototype.hasOwnProperty.call(right, key))
        changed.push(...leaves(left[key], child));
      else visit(left[key], right[key], child);
    }
  };
  visit(before, after, "");
  return [...new Set(changed)].sort();
}

function normalizeRelationEnumerationExact(fields, expectedFields) {
  const fail = (code) => {
    throw new Error("wf540_relation_enumeration_" + code);
  };
  const exactKeys = (value, keys) =>
    Boolean(
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === keys.length &&
      keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
    );
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
  if (
    !Array.isArray(fields) ||
    !Array.isArray(expectedFields) ||
    fields.length !== 2 ||
    expectedFields.length !== 2
  )
    fail("field_count");
  const fieldKeys = ["relationA", "relationB"];
  if (
    fields.map(({ field }) => field).join("\u0000") !== fieldKeys.join("\u0000") ||
    expectedFields.map(({ field }) => field).join("\u0000") !== fieldKeys.join("\u0000")
  )
    fail("field_order");
  const selected = { relationA: [], relationB: [] };
  const observedIds = { relationA: [], relationB: [] };
  const observedTitles = { relationA: [], relationB: [] };
  const allRootIds = [];
  const allOptionIds = [];
  for (let fieldIndex = 0; fieldIndex < fields.length; fieldIndex += 1) {
    const field = fields[fieldIndex];
    const expected = expectedFields[fieldIndex];
    if (
      !exactKeys(field, ["field", "rootId", "options"]) ||
      !exactKeys(expected, ["field", "rootId", "options"]) ||
      field.field !== expected.field ||
      field.rootId !== expected.rootId ||
      typeof field.rootId !== "string" ||
      field.rootId.length === 0 ||
      !Array.isArray(field.options) ||
      !Array.isArray(expected.options) ||
      field.options.length !== expected.options.length
    )
      fail("field_shape");
    allRootIds.push(field.rootId);
    if (
      expected.options.some(
        (option) =>
          !exactKeys(option, ["id", "title"]) ||
          typeof option.id !== "string" ||
          !uuid.test(option.id) ||
          typeof option.title !== "string" ||
          option.title.length === 0
      )
    )
      fail("expected_option_shape");
    const expectedIds = expected.options.map(({ id }) => id);
    if (new Set(expectedIds).size !== expectedIds.length) fail("expected_duplicate_option");
    const expectedById = new Map(expected.options.map((option) => [option.id, option]));
    const selectedIds = new Set();
    const titleById = new Map();
    const observedFieldIds = [];
    for (let optionIndex = 0; optionIndex < field.options.length; optionIndex += 1) {
      const option = field.options[optionIndex];
      const expectedOption = expectedById.get(option.id);
      if (
        !exactKeys(option, [
          "id",
          "title",
          "tagName",
          "ariaPressed",
          "indicatorCount",
          "indicatorAriaHidden",
          "indicatorState",
          "nestedControlCount",
          "visible",
          "enabled",
        ]) ||
        typeof option.id !== "string" ||
        !uuid.test(option.id) ||
        expectedOption === undefined ||
        option.title !== expectedOption.title ||
        option.tagName !== "BUTTON" ||
        (option.ariaPressed !== "true" && option.ariaPressed !== "false") ||
        option.indicatorCount !== 1 ||
        option.indicatorAriaHidden !== "true" ||
        (option.indicatorState !== "checked" && option.indicatorState !== "unchecked") ||
        (option.ariaPressed === "true") !== (option.indicatorState === "checked") ||
        option.nestedControlCount !== 0 ||
        option.visible !== true ||
        option.enabled !== true
      )
        fail("option_shape");
      allOptionIds.push(option.id);
      observedFieldIds.push(option.id);
      titleById.set(option.id, option.title);
      if (option.ariaPressed === "true") selectedIds.add(option.id);
    }
    if (
      new Set(observedFieldIds).size !== observedFieldIds.length ||
      observedFieldIds.length !== expectedIds.length ||
      expectedIds.some((id) => !observedFieldIds.includes(id))
    )
      fail("missing_or_unknown");
    observedIds[field.field].push(...expectedIds);
    observedTitles[field.field].push(...expectedIds.map((id) => titleById.get(id)));
    selected[field.field].push(...expectedIds.filter((id) => selectedIds.has(id)));
  }
  if (new Set(allRootIds).size !== allRootIds.length) fail("duplicate_root");
  if (new Set(allOptionIds).size !== allOptionIds.length) fail("duplicate_option");
  return {
    relationA: selected.relationA,
    relationB: selected.relationB,
    observedIds,
    observedTitles,
  };
}

function validateResetDraftAuthorityExact(authority, expected) {
  const fail = (code) => {
    throw new Error("wf540_reset_draft_authority_" + code);
  };
  const exactKeys = (value, keys) =>
    Boolean(
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === keys.length &&
      keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
    );
  const equal = (left, right) => {
    if (Object.is(left, right)) return true;
    if (typeof left !== typeof right || left === null || right === null || typeof left !== "object")
      return false;
    if (Array.isArray(left) || Array.isArray(right))
      return (
        Array.isArray(left) &&
        Array.isArray(right) &&
        left.length === right.length &&
        left.every((value, index) => equal(value, right[index]))
      );
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every((key, index) => key === rightKeys[index] && equal(left[key], right[key]))
    );
  };
  const deeplyFrozen = (value, seen = new Set()) => {
    if (value === null || typeof value !== "object") return true;
    if (seen.has(value)) return true;
    if (!Object.isFrozen(value)) return false;
    seen.add(value);
    return Object.values(value).every((child) => deeplyFrozen(child, seen));
  };
  if (
    !deeplyFrozen(authority) ||
    !exactKeys(authority, [
      "authorityVersion",
      "sourceActionId",
      "capturedAtActionId",
      "persisted",
      "draft",
      "observedRelationIds",
      "proof",
    ]) ||
    authority.authorityVersion !== 1 ||
    authority.sourceActionId !== expected.sourceActionId ||
    authority.capturedAtActionId !== expected.capturedAtActionId ||
    !exactKeys(authority.persisted, ["data", "overrides"]) ||
    !exactKeys(authority.draft, ["controls", "presentation", "relations"]) ||
    !exactKeys(authority.draft.controls, ["headline", "mediaAssetIds", "unrelatedNote"]) ||
    !exactKeys(authority.draft.presentation, ["tone"]) ||
    !exactKeys(authority.draft.relations, ["relationA", "relationB"]) ||
    !exactKeys(authority.observedRelationIds, ["relationA", "relationB"]) ||
    !exactKeys(authority.proof, [
      "persistedFixtureMatches",
      "persistedOverridesEmpty",
      "draftMatchesPersisted",
      "completeWritableControls",
      "relationEnumerationComplete",
    ]) ||
    Object.values(authority.proof).some((value) => value !== true) ||
    !equal(authority.persisted.data, expected.persistedData) ||
    !equal(authority.persisted.overrides, []) ||
    !equal(authority.draft, expected.resetDraft) ||
    !equal(authority.observedRelationIds, expected.observedRelationIds)
  )
    fail("shape_or_value");
  return true;
}

function validateCurrentDraftAuthorityExact(authority, expected) {
  const fail = (code) => {
    throw new Error("wf540_current_draft_authority_" + code);
  };
  const exactKeys = (value, keys) =>
    Boolean(
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === keys.length &&
      keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
    );
  const equal = (left, right) => {
    if (Object.is(left, right)) return true;
    if (typeof left !== typeof right || left === null || right === null || typeof left !== "object")
      return false;
    if (Array.isArray(left) || Array.isArray(right))
      return (
        Array.isArray(left) &&
        Array.isArray(right) &&
        left.length === right.length &&
        left.every((value, index) => equal(value, right[index]))
      );
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every((key, index) => key === rightKeys[index] && equal(left[key], right[key]))
    );
  };
  const deeplyFrozen = (value, seen = new Set()) => {
    if (value === null || typeof value !== "object") return true;
    if (seen.has(value)) return true;
    if (!Object.isFrozen(value)) return false;
    seen.add(value);
    return Object.values(value).every((child) => deeplyFrozen(child, seen));
  };
  if (
    !deeplyFrozen(authority) ||
    !exactKeys(authority, [
      "authorityVersion",
      "sourceActionId",
      "capturedAtActionId",
      "resetAuthority",
      "draft",
      "observedRelationIds",
      "diffFromReset",
      "proof",
    ]) ||
    authority.authorityVersion !== 1 ||
    authority.sourceActionId !== expected.sourceActionId ||
    authority.capturedAtActionId !== expected.capturedAtActionId ||
    authority.resetAuthority?.sourceActionId !== expected.resetSourceActionId ||
    !exactKeys(authority.draft, ["controls", "presentation", "relations"]) ||
    !exactKeys(authority.draft.controls, ["headline", "mediaAssetIds", "unrelatedNote"]) ||
    !exactKeys(authority.draft.presentation, ["tone"]) ||
    !exactKeys(authority.draft.relations, ["relationA", "relationB"]) ||
    !exactKeys(authority.observedRelationIds, ["relationA", "relationB"]) ||
    !Array.isArray(authority.diffFromReset) ||
    !exactKeys(authority.proof, [
      "resetAuthorityValid",
      "exactTwoLeafDiff",
      "unrelatedNoteMatches",
      "toneMatches",
      "relationsUnchanged",
      "completeWritableControls",
    ]) ||
    Object.values(authority.proof).some((value) => value !== true) ||
    !equal(authority.draft, expected.currentDraft) ||
    !equal(authority.observedRelationIds, expected.observedRelationIds) ||
    !equal(authority.diffFromReset, expected.diffFromReset)
  )
    fail("shape_or_value");
  return true;
}

function collectRendererIdsExact(realms) {
  const fail = (code) => {
    throw new Error("wf540_renderer_ids_" + code);
  };
  if (!Array.isArray(realms) || realms.length !== 2) fail("realm_count");
  const allIds = [];
  for (const realm of realms) {
    if (!realm || typeof realm !== "object" || Array.isArray(realm) || !realm.outer || !realm.inner)
      fail("realm_shape");
    const { outer, inner } = realm;
    if (
      !Array.isArray(outer.tabs) ||
      !Array.isArray(outer.panels) ||
      !Array.isArray(inner.tabs) ||
      !Array.isArray(inner.panels) ||
      outer.tabs.length !== 3 ||
      outer.panels.length !== 3 ||
      inner.tabs.length !== 2 ||
      inner.panels.length !== 2
    )
      fail("tab_panel_shape");
    const ids = [
      ...outer.tabs.map(({ domTabId }) => domTabId),
      ...outer.panels.map(({ domPanelId }) => domPanelId),
      ...inner.tabs.map(({ domTabId }) => domTabId),
      ...inner.panels.map(({ domPanelId }) => domPanelId),
    ];
    if (
      ids.length !== 10 ||
      ids.some((id) => typeof id !== "string" || id.length === 0) ||
      new Set(ids).size !== ids.length
    )
      fail("realm_identity");
    allIds.push(...ids);
  }
  if (allIds.length !== 20 || new Set(allIds).size !== allIds.length) fail("global_identity");
  return allIds;
}

export {
  assertDenseJsonArray,
  assertPlainJsonValue,
  changedJsonPointersExact,
  collectRendererIdsExact,
  freezeJsonTreeExact,
  normalizeRelationEnumerationExact,
  validateCurrentDraftAuthorityExact,
  validateResetDraftAuthorityExact,
};
