import { RAW_ACTION_ROWS } from "../action-rows.mjs";
import { deepFreezeExact, invariant } from "../core.mjs";
import { compileAction, expandCleanupActions, validateManifest } from "../manifest.mjs";
import { buildTask540SmokePlan } from "../plan.mjs";
import {
  compileArgumentRef,
  repositoryMutationPolicy,
  validateRefDescriptor,
} from "../references.mjs";
import { createRegistries } from "../registries.mjs";
import {
  EXECUTABLE_KEYS_BY_TYPE,
  REQUIRED_EXECUTABLE_TYPE_COUNTS,
  REQUIRED_FIXTURE_REF_PATHS,
} from "../requirements.mjs";
import { assertJsonSerializablePlan, replaceManifestAction } from "./helpers.mjs";

export function runManifestFailClosedSelfTestSuite(plan, negative) {
  negative(() => buildTask540SmokePlan({ nonce: "bad" }), "invalid nonce");
  negative(
    () => buildTask540SmokePlan({ nonce: "0123456789ab", unknown: true }),
    "unknown plan key"
  );
  let nonceGetterCalls = 0;
  const accessorInput = {};
  Object.defineProperty(accessorInput, "nonce", {
    enumerable: true,
    get() {
      nonceGetterCalls += 1;
      return "0123456789ab";
    },
  });
  negative(() => buildTask540SmokePlan(accessorInput), "accessor plan nonce");
  invariant(nonceGetterCalls === 0, "plan nonce getter was invoked");
  negative(
    () => validateManifest(replaceManifestAction(plan.actionManifest, 0, {}, { unknown: true })),
    "unknown action key"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, 0, {
          executable: { ...plan.actionManifest[0].executable, unknown: true },
        })
      ),
    "unknown executable key"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, 0, {
          executable: { type: "runtime-operation", refs: [] },
        })
      ),
    "missing executable key"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, 0, {
          assertionDependencies: [plan.actionManifest[1].id],
        })
      ),
    "future dependency"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, 1, { id: plan.actionManifest[0].id })
      ),
    "duplicate action ID"
  );
  const routeIndex = plan.actionManifest.findIndex(({ id }) => id === "bi-020-media-route-setup");
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, routeIndex, { routeStateBefore: "hit" })
      ),
    "route state mismatch"
  );
  const malformedRow = RAW_ACTION_ROWS[0].slice();
  malformedRow[3] = "missing -> terminal";
  negative(() => compileAction(malformedRow, 0, [malformedRow]), "malformed transition");
  negative(
    () => expandCleanupActions([{ kind: "media", id: "one", unknown: true }]),
    "unknown cleanup subject key"
  );
  negative(() => assertJsonSerializablePlan({ executable: () => true }), "function-valued plan");
  negative(() => assertJsonSerializablePlan({ missing: undefined }), "undefined-valued plan");
  negative(
    () => assertJsonSerializablePlan({ infinite: Number.POSITIVE_INFINITY }),
    "non-finite plan number"
  );
  const cyclicPlan = {};
  cyclicPlan.self = cyclicPlan;
  negative(() => assertJsonSerializablePlan(cyclicPlan), "cyclic plan");
  negative(() => assertJsonSerializablePlan({ date: new Date(0) }), "non-plain plan value");
  negative(() => compileArgumentRef("$UNREGISTERED_SECRET"), "unknown secret Ref");
  const refContext = {
    fixtureBlueprint: plan.fixtureBlueprint,
    selectors: plan.registries.selectors,
    fixtureRefPaths: REQUIRED_FIXTURE_REF_PATHS,
    captureNames: [...plan.requiredCaptureNames, ...plan.requiredRuntimeBlockCaptures],
    actionIds: plan.actionManifest.map(({ id }) => id),
  };
  negative(
    () => validateRefDescriptor({ op: "unknown" }, refContext, "unknown Ref"),
    "unknown Ref opcode"
  );
  negative(
    () =>
      validateRefDescriptor(
        { op: "fixture", path: ["screen", "id"] },
        refContext,
        "capture bypass Ref"
      ),
    "fixture capture bypass"
  );
  negative(
    () =>
      validateRefDescriptor(
        { op: "selector", templateId: "missing", args: [] },
        refContext,
        "unknown selector Ref"
      ),
    "unknown selector Ref"
  );
  negative(
    () =>
      repositoryMutationPolicy(
        { id: "self-test-screen", kind: "screen" },
        { args: ["unregistered-shot"] }
      ),
    "unregistered screenshot mutation"
  );

  const manifestWithAction = (index, replacement) => {
    const copy = plan.actionManifest.slice();
    copy[index] = deepFreezeExact(replacement);
    return Object.freeze(copy);
  };
  const executableExampleByType = Object.fromEntries(
    Object.keys(REQUIRED_EXECUTABLE_TYPE_COUNTS).map((type) => [
      type,
      plan.actionManifest.findIndex(({ executable }) => executable.type === type),
    ])
  );
  for (const [type, index] of Object.entries(executableExampleByType)) {
    const action = plan.actionManifest[index];
    const requiredKeys = EXECUTABLE_KEYS_BY_TYPE[type];
    const missingKey = requiredKeys.at(-1);
    const missingExecutable = { ...action.executable };
    delete missingExecutable[missingKey];
    negative(
      () =>
        validateManifest(
          replaceManifestAction(plan.actionManifest, index, {
            executable: missingExecutable,
          })
        ),
      type + " missing executable-union key"
    );
    negative(
      () =>
        validateManifest(
          replaceManifestAction(plan.actionManifest, index, {
            executable: { ...action.executable, extra: true },
          })
        ),
      type + " extra executable-union key"
    );
  }
  negative(
    () => validateManifest(Object.freeze(plan.actionManifest.slice(0, -1))),
    "incomplete 495-action mapping"
  );
  const firstActionWithoutOrdinal = { ...plan.actionManifest[0] };
  delete firstActionWithoutOrdinal.ordinal;
  negative(
    () => validateManifest(manifestWithAction(0, firstActionWithoutOrdinal)),
    "missing action key"
  );
  const runtimeIndex = executableExampleByType["runtime-operation"];
  const runCodeIndex = executableExampleByType["browser-run-code"];
  const nativeIndex = executableExampleByType["browser-native"];
  const screenshotIndex = executableExampleByType["browser-screenshot"];
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, runtimeIndex, {
          executable: {
            ...plan.actionManifest[runtimeIndex].executable,
            operationId: "runtime/unknown-action",
          },
        })
      ),
    "unknown runtime operation"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, runCodeIndex, {
          executable: {
            ...plan.actionManifest[runCodeIndex].executable,
            sourceId: "run-code/unknown-action",
          },
        })
      ),
    "unknown run-code source"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, nativeIndex, {
          executable: {
            ...plan.actionManifest[nativeIndex].executable,
            operationId: "unknown-native",
          },
        })
      ),
    "unknown native operation"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, screenshotIndex, {
          executable: {
            ...plan.actionManifest[screenshotIndex].executable,
            screenshotId: "screenshot/unknown-action",
          },
        })
      ),
    "unknown screenshot ID"
  );

  for (const unsupportedOp of [
    "rootPath",
    "array",
    "object",
    "prior",
    "output",
    "var",
    "sub",
    "length",
    "changedKeys",
  ]) {
    negative(
      () => validateRefDescriptor({ op: unsupportedOp }, refContext, unsupportedOp + " Ref"),
      "unsupported Ref discriminant " + unsupportedOp
    );
  }
  for (const invalidLiteral of [null, true, {}, [], "$ADMIN_PASSWORD", "ADMIN_PASSWORD"]) {
    negative(
      () =>
        validateRefDescriptor(
          { op: "literal", value: invalidLiteral },
          refContext,
          "invalid literal Ref"
        ),
      "invalid or secret-shaped literal Ref"
    );
  }
  negative(
    () =>
      validateRefDescriptor(
        { op: "capture", name: "ADMIN_PASSWORD" },
        refContext,
        "secret-shaped capture Ref"
      ),
    "raw secret disguised as capture"
  );
  negative(
    () =>
      validateRefDescriptor(
        { op: "fixture", path: ["users", "bootstrap", "passwordEnv"] },
        refContext,
        "secret-shaped fixture Ref"
      ),
    "raw secret disguised as fixture"
  );
  negative(
    () =>
      validateRefDescriptor(
        {
          op: "selector",
          templateId: "palette",
          args: [{ op: "secret", name: "ADMIN_PASSWORD" }],
        },
        refContext,
        "nested selector secret Ref"
      ),
    "nested selector secret"
  );
  negative(
    () =>
      validateRefDescriptor(
        { op: "secret", name: "ADMIN_PASSWORD" },
        refContext,
        "non-native secret Ref"
      ),
    "secret outside native fill"
  );
  const emailFillIndex = plan.actionManifest.findIndex(({ id }) => id === "set-009-login-email");
  const emailFill = plan.actionManifest[emailFillIndex];
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, emailFillIndex, {
          executable: {
            ...emailFill.executable,
            refs: [emailFill.executable.refs[1], emailFill.executable.refs[0]],
          },
        })
      ),
    "native secret wrong index"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, emailFillIndex, {
          executable: {
            ...emailFill.executable,
            refs: [
              { op: "selector", templateId: "loginPassword", args: [] },
              emailFill.executable.refs[1],
            ],
          },
        })
      ),
    "native secret wrong selector"
  );
  for (const index of [runtimeIndex, runCodeIndex]) {
    const action = plan.actionManifest[index];
    negative(
      () =>
        validateManifest(
          replaceManifestAction(plan.actionManifest, index, {
            executable: {
              ...action.executable,
              refs: [{ op: "secret", name: "ADMIN_PASSWORD" }, ...action.executable.refs],
            },
          })
        ),
      action.executable.type + " secret placement"
    );
  }

  const earlyPathAction = {
    ...plan.actionManifest[6],
    builder: "goto(paths.entry)",
    executable: {
      ...plan.actionManifest[6].executable,
      refs: [{ op: "path", key: "entry" }],
    },
  };
  negative(
    () => createRegistries(manifestWithAction(6, earlyPathAction), plan.fixtureBlueprint),
    "path capture producer after consumer"
  );
  // The isolated durable reads are the harness's only in-code statement of the boolean the server
  // must hold, and the runtime router derives its assertion from the same table. These cases pin
  // the binding that was missing when ru-061a-a-durable-bypass-read asserted the negation of its
  // own row: each one must fail with THIS invariant, not merely fail somehow, so a mutation that
  // happens to trip an earlier check cannot masquerade as coverage.
  const isolatedReadIndex = plan.actionManifest.findIndex(
    ({ id }) => id === "ru-061a-a-durable-bypass-read"
  );
  const isolatedReadAction = plan.actionManifest[isolatedReadIndex];
  invariant(
    isolatedReadAction?.kind === "isolatedApiSessionApiReadAs" &&
      isolatedReadAction.captureOutput.includes("showFieldMetadata:false"),
    "isolated preference read fail-closed fixture drift"
  );
  const failsWith = (callback, fragment) => () => {
    try {
      callback();
    } catch (error) {
      if (String(error?.message ?? "").includes(fragment)) throw error;
    }
  };
  negative(
    failsWith(
      () =>
        validateManifest(
          replaceManifestAction(plan.actionManifest, isolatedReadIndex, {
            captureOutput: isolatedReadAction.captureOutput.replace(
              "showFieldMetadata:false",
              "showFieldMetadata:true"
            ),
          })
        ),
      "contract expectation contradicts the routed expectation"
    ),
    "isolated preference read expectation inversion"
  );
  negative(
    failsWith(
      () =>
        validateManifest(
          replaceManifestAction(plan.actionManifest, isolatedReadIndex, {
            captureOutput: isolatedReadAction.captureOutput.replace("showFieldMetadata:false", ""),
          })
        ),
      "states no showFieldMetadata literal"
    ),
    "isolated preference read literal absence"
  );
  negative(
    failsWith(
      () =>
        validateManifest(
          replaceManifestAction(plan.actionManifest, isolatedReadIndex, {
            kind: "isolatedApiSessionApiAs",
          })
        ),
      "isolated preference read expectation coverage drift"
    ),
    "isolated preference read expectation coverage"
  );
  const outputMismatchIndex = plan.actionManifest.findIndex(
    ({ id }) => id === "set-017-editable-type-proof"
  );
  negative(
    () =>
      createRegistries(
        replaceManifestAction(plan.actionManifest, outputMismatchIndex, {
          outputSchemaId: "runtime-safe-projection",
        }),
        plan.fixtureBlueprint
      ),
    "private output schema/parser mismatch"
  );
  return { runtimeIndex };
}
