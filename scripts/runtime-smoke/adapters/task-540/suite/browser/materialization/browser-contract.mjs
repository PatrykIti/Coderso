import { deepFreezeExact, exactOwnKeys, invariant } from "../../shared/foundation.mjs";

export const DATABASE_OPERATION_TIMEOUT_MS = 540_000;
export const NAVIGATION_DISCARD_TIMEOUT_MS = 60_000;
export const SESSION_NAME = "wf540smoke";
export const RUN_CODE_PAYLOAD_MAX_BYTES = 65_536;
export const RUN_CODE_PAYLOAD_MAX_ENCODED_LENGTH = 87_384;
export const RUN_CODE_OPERATIONS = new Set(["goto-ready", "fill", "type", "press", "focus"]);
export const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/u;
export const SAFE_PATH_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/u;
export const ALLOWED_SECRET_NAMES = new Set(["ADMIN_EMAIL", "ADMIN_PASSWORD"]);
export const EXPECTED_AUTH_CHALLENGE_TEXT =
  "Failed to load resource: the server responded with a status of 401 (Unauthorized)";
export const EXPECTED_AUTH_CHALLENGE_PHASES = deepFreezeExact([
  {
    armActionId: "set-007-goto-login",
    closeActionId: "set-007-goto-login",
    tokens: ["initial-protected-bootstrap", "initial-login-document-bootstrap"],
    successiveInitialEpochs: true,
  },
  {
    armActionId: "ru-040-bootstrap-signout",
    closeActionId: "ru-040a-bootstrap-signout-settled",
    tokens: ["ru-040-bootstrap-signout"],
    successiveInitialEpochs: false,
  },
  {
    armActionId: "ru-066-a-signout",
    closeActionId: "ru-066a-a-signout-settled",
    tokens: ["ru-066-a-signout"],
    successiveInitialEpochs: false,
  },
  {
    armActionId: "ru-076-b-signout",
    closeActionId: "ru-076a-b-signout-settled",
    tokens: ["ru-076-b-signout"],
    successiveInitialEpochs: false,
  },
  {
    armActionId: "ru-090-a-exit-signout",
    closeActionId: "ru-090a-a-exit-signout-settled",
    tokens: ["ru-090-a-exit-signout"],
    successiveInitialEpochs: false,
  },
  {
    armActionId: "ru-102-b2-signout",
    closeActionId: "ru-102a-b2-signout-settled",
    tokens: ["ru-102-b2-signout"],
    successiveInitialEpochs: false,
  },
]);

export const AUTH_SETTLEMENT_BROWSER_FAILURE_CLASSES = deepFreezeExact([
  "dom_read_failed",
  "geometry_absent",
  "geometry_nonfinite",
  "geometry_nonpositive",
  "label_absent",
  "label_duplicate",
  "loading_view",
  "login_route",
  "menu_absent",
  "menu_duplicate",
  "menu_hidden",
  "name_empty",
  "name_mismatch",
  "noncanonical_route",
  "page_closed",
  "runtime_failure",
  "url_unstable",
]);

export const RECORD_ENTRY_MENU_ACTION_IDS = Object.freeze([
  "bi-022-entry-link",
  "dg-018-entry-link",
  "rc-012b-entry-remount",
  "ru-052-a-return",
  "ru-056-a-remount-pending",
]);
export const RECORDS_WORKSPACE_ACTION_IDS = Object.freeze([
  "bi-021-records-link",
  "rc-012a-records-remount",
  "ru-049-a-away",
  "ru-054-a-away-again",
]);

export const DIRTY_NAVIGATION_REQUEST_ACTION_CONFIG = deepFreezeExact({
  "dg-012-builder-nav-cancel": {
    dialogDescription: "The Screen document or bindings have local changes.",
    dialogTitle: "Discard unsaved Screen changes?",
    realm: "builder",
  },
  "dg-015-builder-nav-confirm": {
    dialogDescription: "The Screen document or bindings have local changes.",
    dialogTitle: "Discard unsaved Screen changes?",
    realm: "builder",
  },
  "dg-024-entry-nav-cancel": {
    dialogDescription: "Content or presentation changes have not been saved.",
    dialogTitle: "Discard unsaved entry changes?",
    realm: "entry",
  },
  "dg-037-entry-nav-confirm": {
    dialogDescription: "Content or presentation changes have not been saved.",
    dialogTitle: "Discard unsaved entry changes?",
    realm: "entry",
  },
  "rc-037a-exit-navigation": {
    dialogDescription: "Content or presentation changes have not been saved.",
    dialogTitle: "Discard unsaved entry changes?",
    realm: "entry",
  },
});
export const DIRTY_NAVIGATION_REQUEST_ACTION_IDS = Object.freeze(
  Object.keys(DIRTY_NAVIGATION_REQUEST_ACTION_CONFIG)
);
export const DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES = deepFreezeExact([
  "target_bound",
  "target_duplicate",
  "target_missing",
  "source_url",
  "scroll_locked",
  "inline_pointer_locked",
  "computed_pointer_locked",
  "target_intercepted",
  "click_failed",
  "dialog_duplicate",
  "not_suspended",
  "dialog_settlement",
]);

export const GENERIC_CLICK_BUDGET_MS = 30_000;
export const EXTENDED_CLICK_BUDGET_BY_ACTION_ID = deepFreezeExact({
  "rc-021-related-tab-save": 90_000,
});
export function clickBudgetMsForAction(actionId) {
  return Object.hasOwn(EXTENDED_CLICK_BUDGET_BY_ACTION_ID, actionId)
    ? EXTENDED_CLICK_BUDGET_BY_ACTION_ID[actionId]
    : GENERIC_CLICK_BUDGET_MS;
}

export const OPEN_SELECT_CONTENT_SELECTOR = '[data-slot="select-content"][data-state="open"]';
export const ALL_SELECT_CONTENT_SELECTOR = '[data-slot="select-content"]';
export const TONE_MENU_OPEN_ACTION_IDS = Object.freeze(["dg-021-tone-open", "rc-015-tone-open"]);
export const TONE_MUTED_ACTION_IDS = Object.freeze(["dg-022-tone-muted", "rc-016-tone-muted"]);
export const TONE_CONTENT_FILL_ACTION_CONFIG = deepFreezeExact({
  "dg-020-headline-fill": {
    expectedDraftKey: "contentDraft",
    fieldLabel: "Headline",
    targetBlockKey: "headlineField",
  },
  "rc-014-unrelated-fill": {
    expectedDraftKey: "relatedUnrelatedDraft",
    fieldLabel: "Unrelated note",
    targetBlockKey: "spaceNoteField",
  },
});
export const TONE_OPEN_BROWSER_FAILURE_CLASSES = deepFreezeExact([
  "tone_target_precondition",
  "tone_draft_dirty_precondition",
  "tone_trigger_open",
  "tone_portal_settlement",
]);
export const TONE_SELECT_BROWSER_FAILURE_CLASSES = deepFreezeExact([
  "tone_select_authority_option_precondition",
  "tone_select_menu_close",
  "tone_select_interaction_handoff",
  "tone_select_dirty_badges",
  "tone_select_selection_override",
  "tone_select_muted_class",
  "tone_select_computed_color_delta",
]);
export const TONE_FLOW_ACTION_CONFIG = deepFreezeExact({
  "dg-021-tone-open": {
    expectedDraftKey: "contentDraft",
    fieldLabel: "Headline",
    phase: "open",
    stateKey: "dg-tone-selection-authority",
    targetBlockKey: "headlineField",
  },
  "dg-022-tone-muted": {
    expectedDraftKey: "contentDraft",
    fieldLabel: "Headline",
    phase: "select",
    stateKey: "dg-tone-selection-authority",
    targetBlockKey: "headlineField",
  },
  "rc-015-tone-open": {
    expectedDraftKey: "relatedUnrelatedDraft",
    fieldLabel: "Unrelated note",
    phase: "open",
    stateKey: "rc-tone-selection-authority",
    targetBlockKey: "spaceNoteField",
  },
  "rc-016-tone-muted": {
    expectedDraftKey: "relatedUnrelatedDraft",
    fieldLabel: "Unrelated note",
    phase: "select",
    stateKey: "rc-tone-selection-authority",
    targetBlockKey: "spaceNoteField",
  },
});

const UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID = deepFreezeExact(
  Object.fromEntries([
    ...DIRTY_NAVIGATION_REQUEST_ACTION_IDS.map((actionId) => [
      actionId,
      DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES,
    ]),
    ...TONE_MENU_OPEN_ACTION_IDS.map((actionId) => [actionId, TONE_OPEN_BROWSER_FAILURE_CLASSES]),
    ...TONE_MUTED_ACTION_IDS.map((actionId) => [actionId, TONE_SELECT_BROWSER_FAILURE_CLASSES]),
  ])
);
invariant(
  Object.keys(UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID).length === 9,
  "unit failure-frame registry drift"
);
export function unitFailureFrameClassesForAction(actionId) {
  return Object.hasOwn(UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID, actionId)
    ? UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID[actionId]
    : null;
}
export function unitFailureFrameResultErrorTagForAction(actionId) {
  return DIRTY_NAVIGATION_REQUEST_ACTION_IDS.includes(actionId) ? "dirty_navigation" : "unit_frame";
}

export function normalizeAuthRatePolicy(value, requiredPlan) {
  invariant(
    value !== null && typeof value === "object" && !Array.isArray(value),
    "auth rate policy is absent or invalid"
  );
  exactOwnKeys(value, ["enabled", "maxRequests", "windowSeconds"], "auth rate policy", {
    plain: true,
  });
  invariant(
    requiredPlan !== null &&
      typeof requiredPlan === "object" &&
      Number.isSafeInteger(requiredPlan.requiredEnabledMaxRequests) &&
      Number.isSafeInteger(requiredPlan.requiredEnabledWindowSecondsMin) &&
      Number.isSafeInteger(requiredPlan.requiredEnabledWindowSecondsMax) &&
      typeof value.enabled === "boolean" &&
      Number.isSafeInteger(value.maxRequests) &&
      Number.isSafeInteger(value.windowSeconds) &&
      (!value.enabled ||
        (value.maxRequests >= requiredPlan.requiredEnabledMaxRequests &&
          value.windowSeconds >= requiredPlan.requiredEnabledWindowSecondsMin &&
          value.windowSeconds <= requiredPlan.requiredEnabledWindowSecondsMax)),
    "auth rate policy is absent or invalid"
  );
  return deepFreezeExact({
    enabled: value.enabled,
    maxRequests: value.maxRequests,
    windowSeconds: value.windowSeconds,
  });
}
