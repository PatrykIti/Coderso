// Capability action execution for the TASK-540 smoke executor.
//
// Owns the single capability method that runs one manifest action: the runtime-operation
// branch with its local command receipt, registered output parse, fixture binding memory,
// media-race and missing-media receipt provenance and resource acquisition delta, and the
// browser branch with its compiled execution spec, private invocation, screenshot identity
// acquisition, normalized output, auth-settlement, tone and dirty-navigation failure frames
// and the finalized browser receipt.
import { SESSION_NAME } from "../config.mjs";
import { canonicalJson, deepFreezeExact, exactOwnKeys, invariant } from "../foundation.mjs";
import { PROVEN_RESOURCE_ACTIONS, deriveActionResourceDelta } from "../action-resources.mjs";
import { acquireScreenshotIdentity } from "../browser-output-authority.mjs";
import { parseRegisteredOutput } from "../output-parser.mjs";
import { canonicalManifestRuntimeOperation } from "../../runtime/operation-router.mjs";

export function createExecuteAction(dependencies) {
  // The capability state, the manifest plan, the local command authority, the private browser
  // workspace, the runtime operation handler registry and every private browser failure-frame
  // helper belong to authorities the facade composes, so they arrive as injected dependencies
  // and this module keeps no mutable state of its own.
  exactOwnKeys(
    dependencies,
    [
      "PRIVATE_RUNTIME",
      "armResponseLostCreateBeforeWrite",
      "assertSafeEvidence",
      "authority",
      "browserWorkspace",
      "buildBrowserInvocation",
      "buildPrivateBrowserInvocationWithAuthSettlementBoundary",
      "classifyPrivateAuthSettlementFailureFrame",
      "classifyPrivateDirtyNavigationFailureFrame",
      "classifyPrivateToneOpenFailureFrame",
      "classifyPrivateToneSelectFailureFrame",
      "compileActionExecutionSpec",
      "createPrivateAuthSettlementFailure",
      "createPrivateDirtyNavigationFailure",
      "createPrivateToneOpenFailure",
      "createPrivateToneSelectFailure",
      "finalizePrivateBrowserResultWithAuthSettlementBoundary",
      "normalizeBrowserCommandOutput",
      "normalizePrivateBrowserOutputWithAuthSettlementBoundary",
      "outputContext",
      "parsePrivateBrowserSuccessWithAuthSettlementBoundary",
      "plan",
      "rememberFixtureBindings",
      "root",
      "routeReceiptMetadata",
      "runObservedBootstrapLoginAttempt",
      "runtimeHandlers",
      "stageIntentionalPresentationOverrideActionReceipt",
      "state",
    ],
    "capability action execution dependencies",
    { plain: true }
  );
  const {
    PRIVATE_RUNTIME,
    armResponseLostCreateBeforeWrite,
    assertSafeEvidence,
    authority,
    browserWorkspace,
    buildBrowserInvocation,
    buildPrivateBrowserInvocationWithAuthSettlementBoundary,
    classifyPrivateAuthSettlementFailureFrame,
    classifyPrivateDirtyNavigationFailureFrame,
    classifyPrivateToneOpenFailureFrame,
    classifyPrivateToneSelectFailureFrame,
    compileActionExecutionSpec,
    createPrivateAuthSettlementFailure,
    createPrivateDirtyNavigationFailure,
    createPrivateToneOpenFailure,
    createPrivateToneSelectFailure,
    finalizePrivateBrowserResultWithAuthSettlementBoundary,
    normalizeBrowserCommandOutput,
    normalizePrivateBrowserOutputWithAuthSettlementBoundary,
    outputContext,
    parsePrivateBrowserSuccessWithAuthSettlementBoundary,
    plan,
    rememberFixtureBindings,
    root,
    routeReceiptMetadata,
    runObservedBootstrapLoginAttempt,
    runtimeHandlers,
    stageIntentionalPresentationOverrideActionReceipt,
    state,
  } = dependencies;
  invariant(
    PRIVATE_RUNTIME instanceof WeakMap &&
      [state, plan, authority, browserWorkspace, runtimeHandlers].every(
        (value) => typeof value === "object" && value !== null
      ) &&
      typeof root === "string",
    "capability action execution authorities are absent"
  );
  invariant(
    [
      armResponseLostCreateBeforeWrite,
      assertSafeEvidence,
      buildBrowserInvocation,
      buildPrivateBrowserInvocationWithAuthSettlementBoundary,
      classifyPrivateAuthSettlementFailureFrame,
      classifyPrivateDirtyNavigationFailureFrame,
      classifyPrivateToneOpenFailureFrame,
      classifyPrivateToneSelectFailureFrame,
      compileActionExecutionSpec,
      createPrivateAuthSettlementFailure,
      createPrivateDirtyNavigationFailure,
      createPrivateToneOpenFailure,
      createPrivateToneSelectFailure,
      finalizePrivateBrowserResultWithAuthSettlementBoundary,
      normalizeBrowserCommandOutput,
      normalizePrivateBrowserOutputWithAuthSettlementBoundary,
      outputContext,
      parsePrivateBrowserSuccessWithAuthSettlementBoundary,
      rememberFixtureBindings,
      routeReceiptMetadata,
      runObservedBootstrapLoginAttempt,
      stageIntentionalPresentationOverrideActionReceipt,
    ].every((dependency) => typeof dependency === "function"),
    "capability action execution helpers are not callable"
  );

  return async function executeAction({ action, executable, captures }) {
    state.currentCaptures = captures;
    if (executable.type === "runtime-operation") {
      state.taskTrafficMayExist = true;
      const handler = runtimeHandlers[executable.operationId];
      invariant(typeof handler === "function", action.id + " runtime handler is absent");
      let result;
      try {
        result = await authority.executeLocal({
          action,
          sequence: ++state.runtimeReceiptSequence,
          operation: canonicalManifestRuntimeOperation(action),
          operationDescriptor: executable.operationId,
          subjectKind: null,
          subjectIdentifier: null,
          run: async () => {
            await armResponseLostCreateBeforeWrite(state, action, captures);
            return handler({ state, plan, action, executable, captures });
          },
        });
      } catch (error) {
        throw error;
      }
      const parsedOutput = parseRegisteredOutput(
        plan.registries.outputs[action.outputSchemaId],
        result.stdout,
        action.id,
        outputContext(action, captures)
      );
      const captureBindings =
        action.outputSchemaId === "runtime-safe-projection" ? parsedOutput.captureBindings : {};
      rememberFixtureBindings(captureBindings);
      const receipt = {
        ...result.receipt,
        sanitizedOutput:
          action.id === "set-017-editable-type-proof"
            ? "[private-projection-proven]"
            : canonicalJson(
                action.outputSchemaId === "runtime-safe-projection"
                  ? {
                      captureBindings: Object.keys(captureBindings),
                      observationSha256: parsedOutput.observationSha256,
                    }
                  : { privateProjection: true }
              ),
      };
      if (action.id === "set-032-storage-post-setup") {
        invariant(
          state.missingMediaSetupProof !== null,
          "missing media setup receipt proof is absent"
        );
        Object.assign(receipt, {
          operation: "media-race-missing-absence-setup",
          operationDescriptor: "db+storage:missing-media-absence",
          evidenceSha256: state.missingMediaSetupProof.evidenceSha256,
          subjectKind: "media-race-missing-media",
          subjectIdentifier: plan.fixtureBlueprint.media.missingBoundMediaId,
          sanitizedOutput: canonicalJson(state.missingMediaSetupProof.projection),
        });
        state.missingMediaSetupReceiptSequence = receipt.sequence;
      } else if (action.id === "set-040-override-proof") {
        invariant(
          state.mediaRaceProjection !== null &&
            typeof state.mediaRaceReceiptHash === "string" &&
            /^[a-f0-9]{64}$/u.test(state.mediaRaceReceiptHash),
          "media-race projection receipt proof is absent"
        );
        Object.assign(receipt, {
          operation: "media-race-projection-provenance",
          operationDescriptor: "admin-api:media-race-projection",
          evidenceSha256: state.mediaRaceReceiptHash,
          subjectKind: "screen",
          subjectIdentifier: state.mediaRaceProjection.screenId,
          sanitizedOutput: canonicalJson({
            bindingCount: 1,
            overrideCount: 1,
            entryValueMatches: true,
            safeUrlMatches: true,
          }),
        });
      }
      stageIntentionalPresentationOverrideActionReceipt(state, action, receipt);
      assertSafeEvidence(receipt, "TASK-540 parsed runtime receipt");
      const acquisitionDelta = deriveActionResourceDelta(
        state,
        action,
        { captureBindings },
        captures
      );
      const provenDescriptor = PROVEN_RESOURCE_ACTIONS[action.id];
      return deepFreezeExact({
        receipt: deepFreezeExact(receipt),
        captureBindings,
        acquisitionDelta,
        settledCreateOrigin: provenDescriptor?.origin ?? null,
      });
    }

    let executionSpec;
    let routeMetadata;
    let invocation;
    ({ executionSpec, routeMetadata, invocation } =
      buildPrivateBrowserInvocationWithAuthSettlementBoundary(action, () => {
        executionSpec = compileActionExecutionSpec(action);
        routeMetadata = routeReceiptMetadata(
          action,
          executionSpec,
          plan,
          captures,
          PRIVATE_RUNTIME.get(state)
        );
        invocation = buildBrowserInvocation(
          action,
          executionSpec,
          captures,
          root,
          browserWorkspace.cwd,
          plan,
          outputContext(action, captures),
          PRIVATE_RUNTIME.get(state)
        );
        return { executionSpec, routeMetadata, invocation };
      }));
    let commandResult;
    if (executable.type === "browser-native" && executable.operationId === "open-about-blank") {
      state.browserMayExist = true;
      state.taskTrafficMayExist = true;
    }
    try {
      const executeBrowserProgram = () =>
        authority.executeProgram({
          action,
          program: "playwright-cli",
          args: invocation.args,
          sequence: ++state.browserReceiptSequence,
          operation: executionSpec.operation,
          routeKey: routeMetadata.routeKey,
          assertionName: action.kind === "assert" ? executionSpec.builderAst.args[0] : null,
          displayArgs:
            executable.type === "browser-global-list"
              ? ["--raw", "list"]
              : [
                  "-s=" + SESSION_NAME,
                  "--raw",
                  executable.type === "browser-run-code"
                    ? executable.sourceId
                    : executable.type === "browser-native"
                      ? executable.operationId
                      : executable.screenshotId,
                ],
          stdoutDiscarded: invocation.stdoutDiscarded ?? false,
          cwd: browserWorkspace.cwd,
          env: browserWorkspace.environment,
        });
      commandResult =
        action.id === "set-011-login-submit"
          ? await runObservedBootstrapLoginAttempt(
              state,
              "ui",
              plan.fixtureBlueprint.userAgents.browser,
              executeBrowserProgram
            )
          : await executeBrowserProgram();
    } catch (error) {
      if (executable.type === "browser-screenshot") {
        try {
          await acquireScreenshotIdentity(state, action, plan);
        } catch (identityError) {
          throw new AggregateError(
            [error, identityError],
            "screenshot command and identity acquisition both failed"
          );
        }
      }
      throw error;
    }
    if (executable.type === "browser-screenshot") {
      await acquireScreenshotIdentity(state, action, plan);
    }
    const normalizedBytes = await normalizePrivateBrowserOutputWithAuthSettlementBoundary(
      action,
      commandResult,
      () =>
        normalizeBrowserCommandOutput(state, action, executable, commandResult.stdout, invocation)
    );
    const authSettlementFailureClass = classifyPrivateAuthSettlementFailureFrame(
      action.id,
      normalizedBytes
    );
    if (authSettlementFailureClass !== null) {
      throw createPrivateAuthSettlementFailure(authSettlementFailureClass);
    }
    const toneOpenFailureClass = classifyPrivateToneOpenFailureFrame(action.id, normalizedBytes);
    if (toneOpenFailureClass !== null) {
      throw createPrivateToneOpenFailure(toneOpenFailureClass);
    }
    const toneSelectFailureClass = classifyPrivateToneSelectFailureFrame(
      action.id,
      normalizedBytes
    );
    if (toneSelectFailureClass !== null) {
      throw createPrivateToneSelectFailure(toneSelectFailureClass);
    }
    const dirtyNavigationFailureClass = classifyPrivateDirtyNavigationFailureFrame(
      action.id,
      normalizedBytes
    );
    if (dirtyNavigationFailureClass !== null) {
      throw createPrivateDirtyNavigationFailure(dirtyNavigationFailureClass);
    }
    const parsedOutput = parsePrivateBrowserSuccessWithAuthSettlementBoundary(
      action,
      commandResult,
      normalizedBytes,
      () =>
        parseRegisteredOutput(
          plan.registries.outputs[action.outputSchemaId],
          normalizedBytes,
          action.id,
          outputContext(action, captures)
        )
    );
    return finalizePrivateBrowserResultWithAuthSettlementBoundary(
      action,
      executable,
      plan,
      commandResult,
      () => {
        if (
          executable.type === "browser-native" &&
          executable.operationId === "open-about-blank"
        ) {
          state.browserOpened = true;
        }
        if (executable.type === "browser-native" && executable.operationId === "close") {
          state.browserClosed = true;
        }
        const receipt = {
          ...commandResult.receipt,
          method: routeMetadata.method,
          pattern: routeMetadata.pattern,
          sanitizedOutput: executionSpec.discardOutput
            ? "[discarded]"
            : canonicalJson(parsedOutput),
        };
        const captureBindings = {};
        for (const name of plan.runtimeCaptureBindings[action.id] ?? []) {
          invariant(
            action.kind === "captureNew" && typeof parsedOutput?.id === "string",
            action.id + " capture output drift"
          );
          captureBindings[name] = parsedOutput.id;
        }
        assertSafeEvidence(receipt, "TASK-540 parsed browser receipt");
        const acquisitionDelta = deriveActionResourceDelta(
          state,
          action,
          { captureBindings },
          captures
        );
        const result = deepFreezeExact({
          receipt: deepFreezeExact(receipt),
          captureBindings,
          acquisitionDelta,
          settledCreateOrigin: null,
        });
        return result;
      }
    );
  };
}
