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
// A failing action that belongs to no failure-class tracker used to emit a diagnostic with
// no cause at all, so a 30-minute run could end without naming what broke. The reason
// projection closes that for EVERY action: it maps the retained cause onto one token from a
// frozen vocabulary. Raw message text is never emitted, so the sink keeps its bounded-bytes,
// single-line and secret-free guarantees.
export const MAX_FAILURE_REASON_MESSAGE_LENGTH = 4096;
export const FAILURE_REASON_HARNESS_PATTERN = /^wf540_[a-z0-9_]{1,64}$/u;
// The same vocabulary, unanchored: inside a browser error frame the token is embedded in
// Playwright's own prose ("Error: Error: wf540_...") rather than being the whole message.
export const FAILURE_REASON_EMBEDDED_HARNESS_PATTERN = /wf540_[a-z0-9_]{1,64}/u;
export const BROWSER_ERROR_FRAME_MARKER = "### Error\n";
// Every runtime-operation failure is an executor invariant, and every executor invariant message
// carries this prefix (see foundation.mjs `invariant`). None of them matched a classifier pattern,
// so all 76 runtime-kind actions collapsed to "unclassified" - which is how ru-061a-a-durable-
// bypass-read failed a 28-minute run without naming its cause. projectBrowserErrorFrameToken
// cannot close this: it is gated on a local-subprocess browser error frame, and a runtime
// operation executes in-process with no frame and no stdout/stderr buffers at all.
export const RUNTIME_INVARIANT_PREFIX = "TASK-540 smoke executor: ";
export const RUNTIME_INVARIANT_TOKEN_PREFIX = "wf540_rt_";
export const MAX_RUNTIME_INVARIANT_TOKEN_SLUG_LENGTH = 55;
// Only a fixed English phrase is projected. Any interpolated value - an id, a path, a URL, a
// count, a connection string - carries a digit, a colon, a slash or a quote and is refused here,
// so the projection can never derive its token from data. That keeps the sink's secret-free
// guarantee exactly where it was: the emitted token is built from source-literal prose only.
export const RUNTIME_INVARIANT_PHRASE_PATTERN = /^[A-Za-z][A-Za-z -]*$/u;
// Every OUTPUT-CONTRACT invariant is labelled with the failing action id, and every action id
// carries digits, so the phrase pattern above abstained on all 496 actions: a schema or predicate
// rejection reported "unclassified" no matter which action produced it. That is how
// ru-073-light-dark-proof ended an 88%-complete run without naming its cause. The leading label
// tokens are therefore DISCARDED before matching - never slugged - so the emitted token still
// derives only from source-literal prose and the sink's secret-free guarantee is unchanged. A
// token is stripped only when the phrase pattern ITSELF refuses it, so a word that could have
// been prose ("user-A") is never mistaken for a label and dropped.
export const MAX_STRIPPED_RUNTIME_INVARIANT_LABEL_TOKENS = 4;
export const FAILURE_REASON_CLASSES = deepFreezeExact([
  "playwright_action_timeout",
  "playwright_modal_state",
  "playwright_strict_mode",
  "unclassified",
]);
export function failureReasonMessageNeverThrow(cause) {
  try {
    if (typeof cause === "string") return cause;
    const message = cause?.message;
    return typeof message === "string" ? message : "";
  } catch {
    return "";
  }
}
export function classifyFailureReasonNeverThrow(cause) {
  try {
    const message = failureReasonMessageNeverThrow(cause);
    if (message.length === 0) return null;
    // Bound the scan before inspecting content: an unbounded message is still reported, just
    // as "unclassified", rather than being pattern-matched over arbitrary length.
    if (message.length > MAX_FAILURE_REASON_MESSAGE_LENGTH) return "unclassified";
    if (FAILURE_REASON_HARNESS_PATTERN.test(message)) return message;
    if (message.includes("Timeout") && message.includes("exceeded")) {
      return "playwright_action_timeout";
    }
    if (message.includes("does not handle the modal state")) return "playwright_modal_state";
    if (message.includes("strict mode violation")) return "playwright_strict_mode";
    const runtimeToken = projectRuntimeInvariantToken(message);
    if (runtimeToken !== null && FAILURE_REASON_HARNESS_PATTERN.test(runtimeToken)) {
      return runtimeToken;
    }
    return "unclassified";
  } catch {
    return null;
  }
}
// The runtime lane's counterpart to projectBrowserErrorFrameToken: it maps an executor invariant
// message onto the SAME frozen `wf540_` vocabulary the classifier already accepts, so a runtime
// action names itself instead of reporting "unclassified". It abstains on anything that is not a
// pure source-literal phrase, so it can only ever emit prose the harness itself wrote.
export function projectRuntimeInvariantToken(message) {
  try {
    if (typeof message !== "string" || !message.startsWith(RUNTIME_INVARIANT_PREFIX)) return null;
    const words = message.slice(RUNTIME_INVARIANT_PREFIX.length).split(" ");
    // Drop a bounded run of leading label tokens (an action id, a dotted value path) so the
    // prose that follows can be projected. They are dropped, not encoded, so no data reaches
    // the token; anything non-prose LATER in the message still makes the whole match abstain.
    let strippedLabelTokens = 0;
    while (
      words.length > 1 &&
      strippedLabelTokens < MAX_STRIPPED_RUNTIME_INVARIANT_LABEL_TOKENS &&
      !RUNTIME_INVARIANT_PHRASE_PATTERN.test(words[0])
    ) {
      words.shift();
      strippedLabelTokens += 1;
    }
    const phrase = words.join(" ");
    if (!RUNTIME_INVARIANT_PHRASE_PATTERN.test(phrase)) return null;
    const slug = phrase
      .toLowerCase()
      .replace(/[^a-z]+/gu, "_")
      .replace(/^_+|_+$/gu, "")
      .slice(0, MAX_RUNTIME_INVARIANT_TOKEN_SLUG_LENGTH)
      .replace(/_+$/u, "");
    return slug.length === 0 ? null : RUNTIME_INVARIANT_TOKEN_PREFIX + slug;
  } catch {
    return null;
  }
}
// A browser error frame is the ONLY place the cause of a browser-run-code failure is stated, and
// the failure boundary used to replace it with the fixed string "local command failed" for every
// action outside the two failure-frame registries - 383 of the 392 browser actions - which is how a
// route-handler rejection reached the diagnostic as failureReason "unclassified". This projects the
// frame onto one token from the SAME frozen vocabulary the classifier already accepts: a harness
// tag or a Playwright signature. Raw frame text is never returned, so the sink keeps its
// bounded-bytes, single-line and secret-free guarantees.
export function projectBrowserErrorFrameToken(stdoutBytes) {
  try {
    if (!Buffer.isBuffer(stdoutBytes)) return null;
    const marker = stdoutBytes.indexOf(Buffer.from(BROWSER_ERROR_FRAME_MARKER, "utf8"));
    if (marker === -1) return null;
    const frame = stdoutBytes
      .subarray(marker, marker + MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES)
      .toString("utf8");
    const harnessTag = FAILURE_REASON_EMBEDDED_HARNESS_PATTERN.exec(frame);
    if (harnessTag !== null) return harnessTag[0];
    if (frame.includes("Timeout") && frame.includes("exceeded")) {
      return "playwright_action_timeout";
    }
    if (frame.includes("does not handle the modal state")) return "playwright_modal_state";
    if (frame.includes("strict mode violation")) return "playwright_strict_mode";
    return null;
  } catch {
    return null;
  }
}
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
// Bound for the sign-out discard postcondition of the abort-aware preference write. MEASURED
// 2026-07-26: the main-frame navigation commit that destroys the old A document lands at
// 1043-1246 ms, so this is ~48x headroom even on the slow shared test database. It is a
// REDUCTION from the former 540_000 ms: that budget could only ever buy dead time, because the
// postcondition it guarded (a `requestfailed` / net::ERR_ABORTED event for a request cancelled by
// document teardown) is one Chromium never emits at all.
export const NAVIGATION_DISCARD_TIMEOUT_MS = 60_000;
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
// Wait budget for the generic single-target click source. It is a WAIT budget only: the
// check itself (exactly one target, then a real click) is identical whatever the budget is.
export const GENERIC_CLICK_BUDGET_MS = 30_000;
// rc-021-related-tab-save clicks "Save draft" in the second tab, whose enablement waits on the
// entry mount reads against a remote, untuned test Postgres. Measured locally the target is
// visible in ~0.9 s and the click lands in 1.47 s idle / 3.04 s under 32-way load, so 30 s was
// never a latency ceiling in a quiet session - yet the action failed in-run with no identified
// defect behind it. Tripled to 90 s under the owner's 2026-07-26 undetermined-cause rule: if
// the operation genuinely never settles, 90 s fails exactly as 30 s did and latency is then
// excluded as the explanation.
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
