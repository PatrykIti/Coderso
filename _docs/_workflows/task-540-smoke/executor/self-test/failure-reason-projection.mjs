import {
  FAILURE_REASON_CLASSES,
  FAILURE_REASON_HARNESS_PATTERN,
  MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES,
  MAX_FAILURE_REASON_MESSAGE_LENGTH,
  PHASE_EIGHT_CLEANUP_FAILURE_CLASSES,
  TASK_FAILURE,
  classifyFailureReasonNeverThrow,
  projectBrowserErrorFrameToken,
} from "../config.mjs";
import { canonicalJson, invariant } from "../foundation.mjs";

// Real Playwright failure text, kept verbatim so the classifier is pinned against the strings
// it will actually meet rather than against a paraphrase of them.
const PLAYWRIGHT_TIMEOUT_MESSAGE =
  "locator.click: Timeout 30000ms exceeded.\nCall log:\n  - waiting for locator('button')";
const PLAYWRIGHT_MODAL_MESSAGE =
  'locator.click: Error: page.click: "beforeunload" dialog does not handle the modal state';
const PLAYWRIGHT_STRICT_MESSAGE =
  'locator.click: Error: strict mode violation: locator("button") resolved to 2 elements';

/**
 * The failure-reason projection is the harness's answer to a 30-minute run that ends without
 * naming what broke: an action no tracker classifies still reports a cause token. These cases
 * pin the two properties that make it safe to emit — the token always comes from a frozen
 * vocabulary, and it is additive, so it can never displace the diagnostic it annotates.
 */
export function runFailureReasonProjectionSelfTest({
  PRIVATE_CONSTRUCTION_AUTHORITY,
  assertNegative,
  createPrivateBoundedFailureActionDiagnosticSink,
  createPrivateConstructionCleanupAuthority,
  currentPrivateRetainedFailureCauseNeverThrow,
  emitPrivateFailureActionDiagnosticNeverThrow,
  plan,
  trackerAtAction,
}) {
  invariant(
    typeof currentPrivateRetainedFailureCauseNeverThrow === "function" &&
      typeof trackerAtAction === "function",
    "failure reason projection dependencies are absent"
  );

  // Every Playwright signature the recovery-cache lane can produce maps to its own token, so a
  // timeout is never confused with a duplicate-target or a blocked dialog.
  assertNegative(
    classifyFailureReasonNeverThrow(new Error(PLAYWRIGHT_TIMEOUT_MESSAGE)) ===
      "playwright_action_timeout",
    "playwright timeout reason mapping"
  );
  assertNegative(
    classifyFailureReasonNeverThrow(new Error(PLAYWRIGHT_MODAL_MESSAGE)) ===
      "playwright_modal_state",
    "playwright modal reason mapping"
  );
  assertNegative(
    classifyFailureReasonNeverThrow(new Error(PLAYWRIGHT_STRICT_MESSAGE)) ===
      "playwright_strict_mode",
    "playwright strict mode reason mapping"
  );

  // The harness's own vocabulary passes through verbatim: those messages ARE the diagnosis, and
  // collapsing them to "unclassified" would throw away the discriminating evidence.
  assertNegative(
    classifyFailureReasonNeverThrow(new Error("wf540_target_missing")) === "wf540_target_missing" &&
      classifyFailureReasonNeverThrow("wf540_target_duplicate") === "wf540_target_duplicate",
    "harness vocabulary reason passthrough"
  );

  // A browser error frame is the only statement of what a browser-run-code action hit, and the
  // failure boundary used to replace it with a fixed string for every action outside the two
  // failure-frame registries, so the cause reached the diagnostic as "unclassified". The frame is
  // now projected onto the same vocabulary, end to end.
  const browserFrame = (body) => Buffer.from("### Error\n" + body, "utf8");
  assertNegative(
    projectBrowserErrorFrameToken(
      browserFrame("Error: Error: wf540_route_handler_request_identity_unexpected_duplicate\n")
    ) === "wf540_route_handler_request_identity_unexpected_duplicate" &&
      classifyFailureReasonNeverThrow(
        new Error(
          projectBrowserErrorFrameToken(browserFrame("Error: Error: wf540_target_missing\n"))
        )
      ) === "wf540_target_missing",
    "browser error frame harness tag projection"
  );
  assertNegative(
    projectBrowserErrorFrameToken(browserFrame(PLAYWRIGHT_TIMEOUT_MESSAGE)) ===
      "playwright_action_timeout" &&
      projectBrowserErrorFrameToken(browserFrame(PLAYWRIGHT_MODAL_MESSAGE)) ===
        "playwright_modal_state" &&
      projectBrowserErrorFrameToken(browserFrame(PLAYWRIGHT_STRICT_MESSAGE)) ===
        "playwright_strict_mode",
    "browser error frame playwright signature projection"
  );
  // No frame, no marker, no recognisable cause, or a non-buffer: the projection yields nothing
  // rather than guessing, so the boundary keeps its fixed fallback message.
  assertNegative(
    projectBrowserErrorFrameToken(Buffer.from('{"ok":true}\n', "utf8")) === null &&
      projectBrowserErrorFrameToken(browserFrame("Error: unrecognised failure text\n")) === null &&
      projectBrowserErrorFrameToken(Buffer.from("wf540_target_missing\n", "utf8")) === null &&
      projectBrowserErrorFrameToken("### Error\nError: wf540_target_missing\n") === null &&
      projectBrowserErrorFrameToken(null) === null,
    "browser error frame projection abstention"
  );
  // Bounded scan and bounded output: a tag pushed beyond the diagnostic byte window is not read,
  // and everything the projection does return is a member of the emitted vocabulary.
  assertNegative(
    projectBrowserErrorFrameToken(
      browserFrame("Error: " + "x".repeat(MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES) + " wf540_late_tag\n")
    ) === null &&
      [
        "Error: Error: wf540_route_post_capture_duplicates_1\n",
        PLAYWRIGHT_TIMEOUT_MESSAGE,
        "Error: postgres://wf540:p@ssword@localhost/example\n",
      ].every((body) => {
        const token = projectBrowserErrorFrameToken(browserFrame(body));
        return (
          token === null ||
          ((FAILURE_REASON_CLASSES.includes(token) ||
            FAILURE_REASON_HARNESS_PATTERN.test(token)) &&
            !token.includes("\n") &&
            !token.includes("@"))
        );
      }),
    "browser error frame projection vocabulary closure"
  );

  // Anything else is reduced to a token. This is what keeps arbitrary message text — which may
  // carry a credential or a path — out of the emitted line.
  assertNegative(
    classifyFailureReasonNeverThrow(new Error("postgres://wf540:p@ssword@localhost/example")) ===
      "unclassified",
    "arbitrary reason text reduction"
  );
  assertNegative(
    classifyFailureReasonNeverThrow(new Error("WF540_TARGET_MISSING")) === "unclassified" &&
      classifyFailureReasonNeverThrow(new Error("wf540_")) === "unclassified" &&
      classifyFailureReasonNeverThrow(new Error(" wf540_target_missing")) === "unclassified",
    "near-miss harness vocabulary rejection"
  );
  assertNegative(
    classifyFailureReasonNeverThrow(
      new Error("wf540_" + "x".repeat(MAX_FAILURE_REASON_MESSAGE_LENGTH))
    ) === "unclassified",
    "oversized reason message reduction"
  );

  // A cause carrying no usable message yields no key at all rather than a misleading token.
  assertNegative(
    classifyFailureReasonNeverThrow(null) === null &&
      classifyFailureReasonNeverThrow(undefined) === null &&
      classifyFailureReasonNeverThrow(TASK_FAILURE) === null &&
      classifyFailureReasonNeverThrow({}) === null &&
      classifyFailureReasonNeverThrow(new Error("")) === null &&
      classifyFailureReasonNeverThrow({ message: 7 }) === null,
    "absent reason message projection"
  );

  // Structural complement to the mappings above: whatever the input, the output is either a
  // vocabulary member or a harness token. Nothing else can reach the emitted line.
  const reasonCorpus = [
    PLAYWRIGHT_TIMEOUT_MESSAGE,
    PLAYWRIGHT_MODAL_MESSAGE,
    PLAYWRIGHT_STRICT_MESSAGE,
    "wf540_related_route_row_data",
    "unrecognised failure text",
    "\u0000binary\u0000",
    "multi\nline\nmessage",
    "x".repeat(MAX_FAILURE_REASON_MESSAGE_LENGTH + 1),
  ];
  assertNegative(
    reasonCorpus.every((message) => {
      const reason = classifyFailureReasonNeverThrow(new Error(message));
      return (
        typeof reason === "string" &&
        (FAILURE_REASON_CLASSES.includes(reason) || FAILURE_REASON_HARNESS_PATTERN.test(reason)) &&
        !reason.includes("\n") &&
        !reason.includes("\0")
      );
    }),
    "reason vocabulary closure"
  );

  // First-write-wins retention. The cleanup boundary pushes its own error into the shared
  // failures list before the action cause is retained, so the slot the diagnostic reads from
  // must be the one the ACTION wrote, and the fixed public sentinel must never occupy it.
  const retentionAuthority = createPrivateConstructionCleanupAuthority();
  const actionCause = new Error("wf540_target_missing");
  retentionAuthority.retainFailureAndCleanupDiagnosticsNeverThrow(TASK_FAILURE, null);
  retentionAuthority.retainFailureAndCleanupDiagnosticsNeverThrow(actionCause, null);
  retentionAuthority.retainFailureAndCleanupDiagnosticsNeverThrow(new Error("later cleanup"), null);
  assertNegative(
    currentPrivateRetainedFailureCauseNeverThrow(retentionAuthority) === actionCause &&
      currentPrivateRetainedFailureCauseNeverThrow(null) === null &&
      currentPrivateRetainedFailureCauseNeverThrow(createPrivateConstructionCleanupAuthority()) ===
        null,
    "primary failure cause retention"
  );

  // A classified action keeps its exact bytes: the reason is a FALLBACK, so where a tracker
  // already owns the failure the line must not grow a redundant key.
  const overflowActionId = plan.actionManifest
    .map(({ id }) => id)
    .reduce((longest, id) => (id.length > longest.length ? id : longest), "");
  const overflowClass = [...PHASE_EIGHT_CLEANUP_FAILURE_CLASSES].reduce(
    (longest, value) => (value.length > longest.length ? value : longest),
    ""
  );
  const overflowAuthority = createPrivateConstructionCleanupAuthority();
  const overflowState = PRIVATE_CONSTRUCTION_AUTHORITY.get(overflowAuthority);
  overflowState.cleanupDiagnostic = Object.freeze({
    cleanupPhase: 8,
    cleanupFailureClass: overflowClass,
  });
  overflowAuthority.retainFailureAndCleanupDiagnosticsNeverThrow(
    new Error("wf540_" + "x".repeat(64)),
    null
  );
  const overflowLines = [];
  const overflowSink = createPrivateBoundedFailureActionDiagnosticSink((line) => {
    overflowLines.push(line);
  });
  const expectedOverflowLine =
    canonicalJson({
      code: TASK_FAILURE.code,
      cleanupPhase: 8,
      cleanupFailureClass: overflowClass,
      failedActionId: overflowActionId,
    }) + "\n";
  // Longest action id + longest cleanup class + a maximal harness token exceeds the sink's byte
  // bound, which the sink answers by writing nothing at all. Naming the cause must never cost
  // the diagnostic, so the annotated line is dropped and the base line is emitted instead.
  assertNegative(
    emitPrivateFailureActionDiagnosticNeverThrow(
      trackerAtAction(overflowActionId),
      overflowSink,
      overflowAuthority
    ) === true &&
      overflowLines.length === 1 &&
      overflowLines[0] === expectedOverflowLine &&
      !overflowLines[0].includes("failureReason") &&
      Buffer.byteLength(overflowLines[0]) <= MAX_FAILURE_ACTION_DIAGNOSTIC_BYTES,
    "reason projection byte-bound fallback"
  );
}
