import { canonicalJson, deepFreezeExact, invariant } from "./foundation.mjs";

export const INPUT_KEYS = Object.freeze(["root", "nonce", "assertSafeEvidence", "snapshotRepository"]);
export const NONCE_PATTERN = /^[a-f0-9]{12}$/;
export const MAX_STREAM_BYTES = 4 * 1024 * 1024;
export const MAX_SESSION_LIST_BYTES = 64 * 1024;
export const MAX_SESSION_LIST_ENTRIES = 256;
export const MAX_SESSION_LIST_LINE_BYTES = 4096;
export const MAX_NATURAL_KEY_CANDIDATES = 64;
export const MAX_TASK_TRAFFIC_ROWS = 4096;
export const MAX_COMPLETE_SESSION_ROWS = 4096;
export const MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES = 256;
export const RUN_CODE_PAYLOAD_MAX_BYTES = 65_536;
export const RUN_CODE_PAYLOAD_MAX_ENCODED_LENGTH = 87_384;
export const RUN_CODE_OPERATIONS = new Set(["goto-ready", "fill", "type", "press", "focus"]);
export const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
export const LF_SHA256 = "01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b";
export const PHASE_THREE_CLEANUP_FAILURE_CLASSES = deepFreezeExact([
  "admin_api_failed",
  "persistent_plan_failed",
  "persistent_stage_failed",
  "persistent_dependency_blocked",
  "persistent_provenance_failed",
  "persistent_delete_failed",
  "persistent_absence_failed",
]);
export const PHASE_EIGHT_CLEANUP_FAILURE_CLASSES = deepFreezeExact([
  "bootstrap_reconciliation_failed",
  "bootstrap_cas_failed",
  "bootstrap_uncertain_baseline_failed",
  "bootstrap_post_restore_proof_failed",
  "bootstrap_restore_receipt_failed",
]);
export const CLEANUP_FAILURE_CLASSES = deepFreezeExact([
  ...PHASE_THREE_CLEANUP_FAILURE_CLASSES,
  ...PHASE_EIGHT_CLEANUP_FAILURE_CLASSES,
  "phase_failed",
  "cleanup_boundary_failed",
  "construction_cleanup_failed",
]);
export const CLEANUP_FAILURE_CLASS_PRIORITY = deepFreezeExact([
  "persistent_plan_failed",
  "admin_api_failed",
  "persistent_provenance_failed",
  "persistent_delete_failed",
  "persistent_absence_failed",
  "persistent_stage_failed",
  "persistent_dependency_blocked",
  ...PHASE_EIGHT_CLEANUP_FAILURE_CLASSES,
  "phase_failed",
  "construction_cleanup_failed",
  "cleanup_boundary_failed",
]);
export const DATABASE_OPERATION_TIMEOUT_MS = 540_000;
export const BUN_BRIDGE_EXECUTION_AUTHORITY = deepFreezeExact({
  argvShape: ["--no-env-file", "--cwd", "<canonical-core>", "--eval", "<immutable-source>"],
  cwdShape: { bun: "<canonical-core>", spawn: "<canonical-root>" },
  file: "bun",
  maxStderrBytes: MAX_STREAM_BYTES,
  maxStdinBytes: 1024 * 1024,
  maxStdoutBytes: MAX_STREAM_BYTES,
  timeoutMs: DATABASE_OPERATION_TIMEOUT_MS,
});
export const COMMAND_TIMEOUT_MS = 1_200_000;
export const HOST_READY_TIMEOUT_MS = 540_000;
export const ORCHESTRATOR_EVIDENCE_RUNNER_VERSION = 1;
export const SESSION_NAME = "wf540smoke";
export const TASK_FAILURE = deepFreezeExact({ code: "task540_smoke_failed" });
export const AUTH_SETTLEMENT_ACTION_IDS = deepFreezeExact([
  "set-011a-bootstrap-auth-settled",
  "ru-043a-a-identity-settled",
  "ru-069a-b-identity-settled",
  "ru-079a-a2-identity-settled",
  "ru-093a-b2-identity-settled",
  "ru-105a-a3-identity-settled",
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
export const AUTH_SETTLEMENT_EXECUTOR_FAILURE_CLASSES = deepFreezeExact([
  "invocation_boundary_failed",
  "repository_boundary_failed",
  "process_runner_failed",
  "process_timeout",
  "process_exit_failed",
  "process_stderr_rejected",
  "process_output_limit",
  "browser_error_frame",
  "receipt_boundary_failed",
  "output_normalization_failed",
  "success_contract_failed",
]);
export const AUTH_SETTLEMENT_DIAGNOSTIC_FAILURE_CLASSES = deepFreezeExact([
  ...AUTH_SETTLEMENT_BROWSER_FAILURE_CLASSES,
  ...AUTH_SETTLEMENT_EXECUTOR_FAILURE_CLASSES,
]);
export const AUTH_SETTLEMENT_FAILURE_FRAMES = deepFreezeExact(
  Object.fromEntries(
    AUTH_SETTLEMENT_BROWSER_FAILURE_CLASSES.map((failureClass) => [
      failureClass,
      canonicalJson({ failureClass, settled: false }) + "\n",
    ])
  )
);

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
export const TASK_FIXTURE_ENTRY_SEMANTICS = Object.freeze([
  "editable-entry",
  "related-entry-a1",
  "related-entry-a2",
  "related-entry-b1",
  "related-entry-b2",
  "related-entry-failure1",
]);

export function seoDocumentResourceSemantic(entrySemantic) {
  invariant(
    TASK_FIXTURE_ENTRY_SEMANTICS.includes(entrySemantic),
    "SEO document entry semantic drift"
  );
  return "seo-document-entry:" + entrySemantic;
}
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
export const DIRTY_NAVIGATION_EXECUTOR_FAILURE_CLASSES = deepFreezeExact([
  ...AUTH_SETTLEMENT_EXECUTOR_FAILURE_CLASSES,
]);
export const DIRTY_NAVIGATION_DIAGNOSTIC_FAILURE_CLASSES = deepFreezeExact([
  ...DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES,
  ...DIRTY_NAVIGATION_EXECUTOR_FAILURE_CLASSES,
]);
export const DIRTY_NAVIGATION_FAILURE_FRAMES = deepFreezeExact(
  Object.fromEntries(
    DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES.map((failureClass) => [
      failureClass,
      canonicalJson({ failureClass, settled: false }) + "\n",
    ])
  )
);
export function dirtyNavigationBrowserFailureClassesForAction(actionId) {
  invariant(
    DIRTY_NAVIGATION_REQUEST_ACTION_IDS.includes(actionId),
    "dirty-navigation action is invalid"
  );
  return DIRTY_NAVIGATION_BROWSER_FAILURE_CLASSES;
}
export function dirtyNavigationDiagnosticFailureClassAllowedForAction(actionId, failureClass) {
  return (
    dirtyNavigationBrowserFailureClassesForAction(actionId).includes(failureClass) ||
    DIRTY_NAVIGATION_EXECUTOR_FAILURE_CLASSES.includes(failureClass)
  );
}
export const DIRTY_NAVIGATION_TARGET_POLL_FAILURE_CLASSES = Object.freeze([
  "target_missing",
  "scroll_locked",
  "inline_pointer_locked",
  "computed_pointer_locked",
  "target_intercepted",
]);
export function resolveDirtyNavigationTargetTimeline(observations) {
  invariant(Array.isArray(observations), "dirty-navigation target timeline drift");
  let latest = "target_missing";
  for (const observation of observations) {
    invariant(
      observation === "hittable" ||
        DIRTY_NAVIGATION_TARGET_POLL_FAILURE_CLASSES.includes(observation),
      "dirty-navigation target observation drift"
    );
    if (observation === "hittable") return "click";
    latest = observation;
  }
  return latest;
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
export const TONE_CONTENT_FILL_ACTION_IDS = Object.freeze(Object.keys(TONE_CONTENT_FILL_ACTION_CONFIG));
export const TONE_OPEN_BROWSER_FAILURE_CLASSES = deepFreezeExact([
  "tone_target_precondition",
  "tone_draft_dirty_precondition",
  "tone_trigger_open",
  "tone_portal_settlement",
]);
export const TONE_OPEN_FAILURE_FRAMES = deepFreezeExact(
  Object.fromEntries(
    TONE_OPEN_BROWSER_FAILURE_CLASSES.map((failureClass) => [
      failureClass,
      canonicalJson({ failureClass, settled: false }) + "\n",
    ])
  )
);
export const TONE_SELECT_BROWSER_FAILURE_CLASSES = deepFreezeExact([
  "tone_select_authority_option_precondition",
  "tone_select_menu_close",
  "tone_select_interaction_handoff",
  "tone_select_dirty_badges",
  "tone_select_selection_override",
  "tone_select_muted_class",
  "tone_select_computed_color_delta",
]);
export const TONE_SELECT_FAILURE_FRAMES = deepFreezeExact(
  Object.fromEntries(
    TONE_SELECT_BROWSER_FAILURE_CLASSES.map((failureClass) => [
      failureClass,
      canonicalJson({ failureClass, settled: false }) + "\n",
    ])
  )
);
// Single source of truth for which `unit` browser actions compute a failure FRAME that
// must survive transport. Every other unit action keeps the discarding wrapper, which
// awaits the source and emits the unit contract's success literal. Declared after the
// tone constants so every referenced registry is already initialised.
export const UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID = deepFreezeExact(
  Object.fromEntries([
    ...DIRTY_NAVIGATION_REQUEST_ACTION_IDS.map((actionId) => [
      actionId,
      dirtyNavigationBrowserFailureClassesForAction(actionId),
    ]),
    ...TONE_MENU_OPEN_ACTION_IDS.map((actionId) => [actionId, TONE_OPEN_BROWSER_FAILURE_CLASSES]),
    ...TONE_MUTED_ACTION_IDS.map((actionId) => [actionId, TONE_SELECT_BROWSER_FAILURE_CLASSES]),
  ])
);
invariant(
  Object.keys(UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID).length === 9 &&
    new Set(Object.keys(UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID)).size === 9,
  "unit failure-frame registry drift"
);
export const UNIT_FAILURE_FRAME_DIRTY_NAVIGATION_RESULT_ERROR_TAG = "dirty_navigation";
export const UNIT_FAILURE_FRAME_TONE_RESULT_ERROR_TAG = "unit_frame";
export function unitFailureFrameClassesForAction(actionId) {
  return Object.hasOwn(UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID, actionId)
    ? UNIT_FAILURE_FRAME_CLASSES_BY_ACTION_ID[actionId]
    : null;
}
export function unitFailureFrameResultErrorTagForAction(actionId) {
  return DIRTY_NAVIGATION_REQUEST_ACTION_IDS.includes(actionId)
    ? UNIT_FAILURE_FRAME_DIRTY_NAVIGATION_RESULT_ERROR_TAG
    : UNIT_FAILURE_FRAME_TONE_RESULT_ERROR_TAG;
}
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
export const PRIMARY_RUNTIME_OPERATION_BY_ACTION_ID = deepFreezeExact({
  "set-001-storage-preflight": "fixture-setup",
  "set-002-helper-launch": "host-runner-launch",
  "set-003-admin-health": "admin-health",
  "set-004-front-health": "front-health",
});
